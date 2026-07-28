from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
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

# Khởi tạo mô hình PaddleOCR nhận diện tiếng Việt (tự động load model ở lần đầu)
print("🚀 Đang khởi tạo mô hình PaddleOCR (Tiếng Việt)...")
try:
    # enable_mkldnn=False tránh lỗi static executor onednn trên Windows
    ocr_engine = PaddleOCR(lang='vi', enable_mkldnn=False)
    print("✅ PaddleOCR Engine đã sẵn sàng!")
except Exception as e:
    try:
        ocr_engine = PaddleOCR(lang='vi')
        print("✅ PaddleOCR Engine đã sẵn sàng (Legacy Mode)!")
    except Exception as e2:
        print("⚠️ Cảnh báo khởi tạo PaddleOCR Engine:", e2)
        ocr_engine = None

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Aura Learning PaddleOCR Local Service",
        "engine_ready": ocr_engine is not None
    }

@app.post("/api/v1/ocr")
async def process_ocr(file: UploadFile = File(...)):
    if not ocr_engine:
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
