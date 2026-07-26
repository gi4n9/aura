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
    ocr_engine = PaddleOCR(use_angle_cls=True, lang='vi', show_log=False)
    print("✅ PaddleOCR Engine đã sẵn sàng!")
except Exception as e:
    print("⚠️ Cảnh báo khởi tạo PaddleOCR Engine:", e)
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

        # Chạy PaddleOCR
        result = ocr_engine.ocr(img_np, cls=True)

        extracted_text = []
        confidences = []

        if result and result[0]:
            for line in result[0]:
                text = line[1][0]
                score = line[1][1]
                extracted_text.append(text)
                confidences.append(score)

        full_text = "\n".join(extracted_text)
        avg_confidence = float(np.mean(confidences)) if confidences else 0.0

        return {
            "success": True,
            "text": full_text,
            "confidence": avg_confidence,
            "linesCount": len(extracted_text)
        }
    except Exception as e:
        print("❌ Lỗi khi xử lý OCR:", e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
