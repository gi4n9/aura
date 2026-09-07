import cv2
import numpy as np
from table_refiner import refine_bounding_box

def test_diagram_refinement():
    print("🧪 Bắt đầu kiểm thử Diagram Refinement (Mô phỏng chính xác lỗi Hình 1 -> Hình 2)...")
    
    # 1. Tạo ảnh giả lập độ phân giải 1200 x 400
    img_w, img_h = 1200, 400
    canvas = np.ones((img_h, img_w, 3), dtype=np.uint8) * 255
    
    # Dòng chữ câu hỏi phía trên (y: 15 -> 40)
    cv2.putText(canvas, "gian, em hay lam tron ket qua cuoi cung den hang phan tram)?", (50, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Khoảng trắng phân cách: y: 40 -> 75 (không có nét vẽ)
    
    # === HÌNH VẼ MINH HỌA (Bắt đầu từ y: 75 trở xuống) ===
    # Bên trái: Nhãn "Ban kinh lo khoan 0,2", khối chữ nhật "Mui khoan", "Truc xoay" (x: 50 -> 220)
    cv2.putText(canvas, "Ban kinh lo khoan 0,2", (60, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.rectangle(canvas, (50, 130), (120, 155), (0, 0, 0), -1) # Khối đen "Mui khoan"
    cv2.putText(canvas, "Mui khoan", (45, 125), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    cv2.arrowedLine(canvas, (130, 142), (180, 142), (0, 0, 0), 2)
    cv2.putText(canvas, "Truc xoay", (60, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    
    # Khối 1: Trục Oxy và Elip 1 (x: 230 -> 450, y: 75 -> 250)
    cv2.line(canvas, (330, 75), (330, 250), (0, 0, 0), 2) # Trục y (đỉnh y ở 75)
    cv2.arrowedLine(canvas, (180, 162), (480, 162), (0, 0, 0), 2) # Trục x
    cv2.ellipse(canvas, (330, 162), (110, 65), 0, 0, 360, (0, 0, 0), 2)
    cv2.putText(canvas, "x^2/1.5^2 + y^2/1^2 = 1", (350, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    # Khối 2: Khối tròn xoay ở giữa (x: 520 -> 720, y: 100 -> 230)
    cv2.ellipse(canvas, (620, 162), (100, 65), 0, 0, 360, (0, 0, 0), 2)
    cv2.ellipse(canvas, (620, 162), (25, 65), 0, 0, 360, (0, 0, 0), 1)
    
    # Khối 3: Nửa elip bên phải + công thức toán (x: 770 -> 1050, y: 75 -> 220)
    cv2.line(canvas, (870, 75), (870, 210), (0, 0, 0), 2) # Trục y bên phải
    cv2.arrowedLine(canvas, (750, 162), (1050, 162), (0, 0, 0), 2) # Trục x bên phải có mũi tên xa ở 1050
    cv2.ellipse(canvas, (870, 162), (105, 60), 0, 180, 360, (0, 0, 0), 2)
    cv2.putText(canvas, "x^2/1.5^2 + y^2/1^2 = 1", (890, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    
    # 2. Giả lập Bounding Box thô bị lỗi như Hình 1:
    # - ymin = 20 (dính dòng chữ câu hỏi phía trên)
    # - xmin = 100 (cắt cụt mép trái khối "Mũi khoan")
    # - ymax = 220
    # - xmax = 850 (cắt cụt nửa hình thứ 3 và công thức toán bên phải)
    rough_ymin_norm = (20.0 / img_h) * 1000  # 50
    rough_xmin_norm = (100.0 / img_w) * 1000 # 83.3
    rough_ymax_norm = (220.0 / img_h) * 1000 # 550
    rough_xmax_norm = (850.0 / img_w) * 1000 # 708.3
    
    rough_bbox = [rough_ymin_norm, rough_xmin_norm, rough_ymax_norm, rough_xmax_norm]
    print(f"📍 Rough Bbox (lỗi Hình 1):")
    print(f"   Pixel thô: ymin=20 (dính chữ đề bài), xmin=100 (cụt Mũi khoan), xmax=850 (cụt hình 3 & công thức)")
    
    # 3. Chạy Refinement mới
    result = refine_bounding_box(
        image_np=canvas,
        rough_bbox_norm=rough_bbox,
        text_blocks=None # Không cần OCR text block, thuật toán tự gọt bằng White Valley
    )
    
    rymin, rxmin, rymax, rxmax = result["refined_bbox_pixel"]
    print(f"\n✅ Kết quả Refinement (đạt chuẩn Hình 2):")
    print(f"   Refined Pixel: ymin={rymin}, xmin={rxmin}, ymax={rymax}, xmax={rxmax}")
    print(f"   Refined Norm:  {result['refined_bbox_norm']}")
    print(f"   Method:        {result['method']}")
    
    # Kiểm tra 1: Phải gọt sạch dòng chữ câu hỏi phía trên (ymin >= 50)
    assert rymin >= 50, f"LỖI: ymin ({rymin}) chưa loại bỏ dòng chữ câu hỏi (chữ ở y: 15-40)!"
    print(f"   ✓ [1] ĐÃ LOẠI TRỪ DÒNG CHỮ CÂU HỎI: ymin ({rymin}) >= 50 (sạch 100%)")
    
    # Kiểm tra 2: Phải mở rộng mép trái bao trọn nhãn "Mũi khoan" (xmin <= 50)
    assert rxmin <= 50, f"LỖI: xmin ({rxmin}) chưa bao trọn nhãn Mũi khoan (x: 45)!"
    print(f"   ✓ [2] ĐÃ BAO TRỌN MÉP TRÁI: xmin ({rxmin}) <= 50 (bao trọn 'Mũi khoan' & 'Bán kính')")
    
    # Kiểm tra 3: Phải mở rộng mép phải bao trọn hình thứ 3 và công thức (xmax >= 1050)
    assert rxmax >= 1050, f"LỖI: xmax ({rxmax}) chưa bao trọn hình 3 và công thức (x: 1050)!"
    print(f"   ✓ [3] ĐÃ BAO TRỌN MÉP PHẢI: xmax ({rxmax}) >= 1050 (bao trọn hình 3 & công thức toán)")
    
    # Kiểm tra 4: Bao trọn chân trục tung (ymax >= 250)
    assert rymax >= 250, f"LỖI: ymax ({rymax}) chưa bao trọn đáy trục tung (y: 250)!"
    print(f"   ✓ [4] ĐÃ BAO TRỌN ĐÁY HÌNH VẼ: ymax ({rymax}) >= 250")
    
    print("\n🎉 Xuất sắc! Thuật toán đã biến Hình 1 thành Hình 2 hoàn hảo!")

if __name__ == "__main__":
    test_diagram_refinement()
