from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
import io

app = FastAPI(title="Aura Learning Local PaddleOCR Engine")

# Cho phép CORS từ mọi origin (Frontend/Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_engine = None

def get_ocr_engine():
    global ocr_engine
    if ocr_engine is None:
        try:
            print("🚀 Đang nạp mô hình PaddleOCR theo yêu cầu...")
            from paddleocr import PaddleOCR
            ocr_engine = PaddleOCR(
                lang='vi',
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                enable_mkldnn=False
            )
            print("✅ PaddleOCR Engine đã nạp xong!")
        except Exception as e:
            try:
                from paddleocr import PaddleOCR
                ocr_engine = PaddleOCR(lang='vi')
                print("✅ PaddleOCR Engine đã nạp xong (Legacy)!")
            except Exception as e2:
                print("⚠️ Cảnh báo khởi tạo PaddleOCR Engine:", e2)
                ocr_engine = None
    return ocr_engine

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Aura Learning High-Speed CV Refiner & Table Detection Service",
        "engine_ready": True
    }

@app.post("/api/v1/ocr")
async def process_ocr(file: UploadFile = File(...)):
    engine = get_ocr_engine()
    if not engine:
        raise HTTPException(
            status_code=500,
            detail="PaddleOCR Engine chưa được khởi tạo thành công trên Server."
        )

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        img_np = np.array(image)

        # Chạy PaddleOCR (chuẩn v3 predict / fallback v2 ocr)
        try:
            result = list(ocr_engine.predict(img_np))
        except Exception:
            result = ocr_engine.ocr(img_np)

        extracted_text = []
        confidences = []
        blocks = []

        if result and len(result) > 0:
            res_item = result[0]

            # Cú pháp PaddleOCR v3 (Dict result)
            if isinstance(res_item, dict):
                rec_texts = res_item.get("rec_texts", [])
                rec_scores = res_item.get("rec_scores", [])
                rec_polys = res_item.get("rec_polys", []) or res_item.get("dt_polys", [])

                for idx, text in enumerate(rec_texts):
                    score = float(rec_scores[idx]) if idx < len(rec_scores) else 1.0
                    box = rec_polys[idx] if idx < len(rec_polys) else None

                    x1, y1, x2, y2 = 0, 0, 0, 0
                    if box is not None and len(box) > 0:
                        try:
                            xs = [int(pt[0]) for pt in box]
                            ys = [int(pt[1]) for pt in box]
                            x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
                        except Exception:
                            pass

                    extracted_text.append(text)
                    confidences.append(score)
                    blocks.append({
                        "lineIndex": idx + 1,
                        "text": text,
                        "confidence": score,
                        "bbox": { "x1": x1, "y1": y1, "x2": x2, "y2": y2 }
                    })

            # Cú pháp PaddleOCR v2 (List of [box, (text, score)] tuples)
            elif isinstance(res_item, list):
                for idx, line in enumerate(res_item):
                    if isinstance(line, (list, tuple)) and len(line) >= 2:
                        box = line[0]
                        text = line[1][0] if isinstance(line[1], (list, tuple)) else str(line[1])
                        score = float(line[1][1]) if isinstance(line[1], (list, tuple)) and len(line[1]) > 1 else 1.0

                        xs = [int(pt[0]) for pt in box] if isinstance(box, (list, tuple)) else [0]
                        ys = [int(pt[1]) for pt in box] if isinstance(box, (list, tuple)) else [0]
                        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)

                        extracted_text.append(text)
                        confidences.append(score)
                        blocks.append({
                            "lineIndex": idx + 1,
                            "text": text,
                            "confidence": score,
                            "bbox": { "x1": x1, "y1": y1, "x2": x2, "y2": y2 }
                        })

        full_text = "\n".join(extracted_text)
        avg_confidence = float(np.mean(confidences)) if confidences else 0.0

        return {
            "success": True,
            "text": full_text,
            "confidence": avg_confidence,
            "linesCount": len(extracted_text),
            "blocks": blocks
        }
    except Exception as e:
        print("❌ Lỗi khi xử lý OCR:", e)
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import Form
import json
import base64
from table_refiner import refine_bounding_box, find_all_tables_on_page, enhance_image_ultra_hd, extract_page_visual_elements
from native_extractor import extract_tables_and_images_from_pdf, extract_media_from_docx

@app.post("/api/v1/extract-visuals")
async def process_extract_visuals(file: UploadFile = File(...)):
    """
    Quét toàn diện trang tài liệu, tự động bóc tách và cắt tất cả các hình vẽ minh họa,
    đồ thị hàm số, hình học không gian và bảng biểu/bảng biến thiên theo thứ tự từ trên xuống dưới.
    Được làm nét tối đa chuẩn Ultra HD (Lanczos4, Midtone Gamma 0.65, USM, Paper-White).
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        img_np = np.array(image)
        visuals = extract_page_visual_elements(img_np)
        return {
            "success": True,
            "count": len(visuals),
            "visuals": visuals
        }
    except Exception as e:
        print("❌ Lỗi khi trích xuất hình ảnh trang:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/detect-tables")
async def process_detect_tables(file: UploadFile = File(...)):
    """
    Quét và tìm tất cả khung bảng biểu trên trang bằng OpenCV Morphological (~5ms)
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        img_np = np.array(image)
        img_h, img_w = img_np.shape[:2]

        tables, _ = find_all_tables_on_page(img_np)
        results = []
        for (y1, x1, y2, x2) in tables:
            results.append({
                "bbox_pixel": [int(y1), int(x1), int(y2), int(x2)],
                "bbox_norm": [
                    float(round((y1 / img_h) * 1000, 1)),
                    float(round((x1 / img_w) * 1000, 1)),
                    float(round((y2 / img_h) * 1000, 1)),
                    float(round((x2 / img_w) * 1000, 1))
                ]
            })
        return {
            "success": True,
            "count": len(results),
            "tables": results
        }
    except Exception as e:
        print("❌ Lỗi khi detect tables:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/refine-bbox")
async def process_refine_bbox(
    file: UploadFile = File(...),
    ymin: float = Form(...),
    xmin: float = Form(...),
    ymax: float = Form(...),
    xmax: float = Form(...),
    text_blocks_json: str = Form(None)
):
    """
    Endpoint tinh chỉnh Bounding Box (OpenCV Line Detection & Text Exclusion)
    Dành riêng cho Bảng biến thiên, đồ thị hàm số và hình vẽ đề thi Toán.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        img_np = np.array(image)
        
        parsed_blocks = None
        if text_blocks_json:
            try:
                parsed_blocks = json.loads(text_blocks_json)
            except Exception:
                parsed_blocks = None
                
        rough_bbox = [ymin, xmin, ymax, xmax]
        result = refine_bounding_box(
            image_np=img_np,
            rough_bbox_norm=rough_bbox,
            text_blocks=parsed_blocks
        )
        
        # Cắt ảnh trực tiếp bằng refined pixel coordinates
        rymin, rxmin, rymax, rxmax = result["refined_bbox_pixel"]
        crop_np = img_np[rymin:rymax, rxmin:rxmax]
        
        crop_b64 = None
        if crop_np.size > 0:
            # Nâng cao độ sắc nét cực đại Ultra HD (Lanczos4, Gamma 0.65, USM, Paper-White)
            enhanced_np = enhance_image_ultra_hd(crop_np)
            crop_img = Image.fromarray(enhanced_np)
            buf = io.BytesIO()
            crop_img.save(buf, format="PNG")
            crop_b64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
            
        return {
            "success": True,
            "original_bbox_norm": rough_bbox,
            "refined_bbox_norm": result["refined_bbox_norm"],
            "refined_bbox_pixel": result["refined_bbox_pixel"],
            "crop_base64": crop_b64,
            "method": result["method"]
        }
    except Exception as e:
        print("❌ Lỗi khi refine bbox:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/extract-native")
async def process_extract_native(
    file: UploadFile = File(...),
    file_type: str = Form("pdf") # "pdf" hoặc "docx"
):
    """
    Bóc tách bảng biểu và hình vẽ vector/ảnh nhúng trực tiếp từ file DOCX hoặc PDF Vector.
    """
    try:
        contents = await file.read()
        if file_type.lower() in ["pdf", "application/pdf"]:
            items = extract_tables_and_images_from_pdf(contents)
            return {
                "success": True,
                "file_type": "pdf",
                "count": len(items),
                "items": items
            }
        elif file_type.lower() in ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            items = extract_media_from_docx(contents)
            return {
                "success": True,
                "file_type": "docx",
                "count": len(items),
                "items": items
            }
        else:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file_type là 'pdf' hoặc 'docx'")
    except Exception as e:
        print("❌ Lỗi khi bóc tách native file:", e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
