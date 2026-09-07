import asyncio
from httpx import AsyncClient, ASGITransport
import cv2
import numpy as np
import io
from main import app

async def test_refine_api():
    print("🧪 Test FastAPI /api/v1/refine-bbox endpoint trực tiếp qua ASGITransport...")
    
    # Tạo ảnh giả lập
    img_h, img_w = 600, 1000
    canvas = np.ones((img_h, img_w, 3), dtype=np.uint8) * 255
    cv2.putText(canvas, "Cau 1: Bang bien thien", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.rectangle(canvas, (100, 150), (900, 450), (0, 0, 0), 2)
    cv2.line(canvas, (100, 250), (900, 250), (0, 0, 0), 2)
    
    _, img_encoded = cv2.imencode(".png", canvas)
    img_bytes = img_encoded.tobytes()
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/refine-bbox",
            data={
                "ymin": "130", # Dính chữ "Cau 1" ở pixel 78 (78/600*1000)
                "xmin": "80",
                "ymax": "630", # Cụt đáy ở pixel 378 (378/600*1000) trong khi đáy bảng ở 450
                "xmax": "920",
                "text_blocks_json": '[{"text": "Cau 1", "bbox": {"x1": 50, "y1": 50, "x2": 400, "y2": 90}}]'
            },
            files={"file": ("test.png", io.BytesIO(img_bytes), "image/png")}
        )
        
        print("Status code:", response.status_code)
        assert response.status_code == 200, f"Lỗi: {response.text}"
        data = response.json()
        print("API Response success:", data["success"])
        print("Original Bbox norm:", data["original_bbox_norm"])
        print("Refined Bbox norm:", data["refined_bbox_norm"])
        print("Refined Bbox pixel:", data["refined_bbox_pixel"])
        assert data["refined_bbox_pixel"][0] >= 94, "ymin chưa vượt qua chữ Câu 1!"
        assert data["refined_bbox_pixel"][2] >= 450, "ymax bị cụt đáy!"
        print("Has crop_base64:", bool(data.get("crop_base64")))
        print("🎉 Test FastAPI /api/v1/refine-bbox hoàn toàn thành công!")

if __name__ == "__main__":
    asyncio.run(test_refine_api())
