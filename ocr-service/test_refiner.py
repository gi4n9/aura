import cv2
import numpy as np
import json
from table_refiner import refine_bounding_box

def test_bbox_refinement():
    print("🧪 Bắt đầu kiểm thử Table Bounding Box Refinement...")
    
    # 1. Tạo ảnh giả lập kích thước 800x1200
    img_h, img_w = 800, 1200
    canvas = np.ones((img_h, img_w, 3), dtype=np.uint8) * 255 # Nền trắng
    
    # Vẽ dòng chữ đề bài (y: 100 -> 130)
    cv2.putText(canvas, "Cau 4: Cho ham so y = f(x) co bang bien thien nhu hinh ve duoi day:", (50, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # Giả lập text_blocks từ OCR
    text_blocks = [
        {
            "lineIndex": 1,
            "text": "Cau 4: Cho ham so y = f(x) co bang bien thien nhu hinh ve duoi day:",
            "confidence": 0.98,
            "bbox": {"x1": 50, "y1": 95, "x2": 950, "y2": 130}
        }
    ]
    
    # Vẽ Bảng biến thiên (y: 180 -> 380, x: 100 -> 900)
    table_top = 180
    table_bottom = 380
    table_left = 100
    table_right = 900
    
    # Đường bao ngoài và các đường kẻ ngang của bảng
    cv2.rectangle(canvas, (table_left, table_top), (table_right, table_bottom), (0, 0, 0), 2)
    cv2.line(canvas, (table_left, 240), (table_right, 240), (0, 0, 0), 2) # Đường phân cách x và y'
    cv2.line(canvas, (table_left, 300), (table_right, 300), (0, 0, 0), 2) # Đường phân cách y' và y
    
    # Đường kẻ dọc phân cách cột nhãn và giá trị
    cv2.line(canvas, (180, table_top), (180, table_bottom), (0, 0, 0), 2)
    
    # Nội dung trong bảng
    cv2.putText(canvas, "x", (130, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(canvas, "y'", (130, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(canvas, "y", (130, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # Các giá trị y và mũi tên (ở đáy bảng, y: 320 -> 370)
    cv2.putText(canvas, "-oo", (250, 360), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(canvas, "+oo", (800, 360), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Dòng chữ đáp án phía dưới bảng (y: 430 -> 460)
    cv2.putText(canvas, "A. (-1; 2)     B. (0; 1)     C. (1; +oo)     D. (-oo; 0)", (50, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    # 2. Giả lập lỗi Bounding Box từ LLM:
    # - Bị lẫn dòng chữ đề bài phía trên: ymin = 100 (dính dòng Câu 4)
    # - Bị cụt đáy: ymax = 330 (cắt mất hàng y và các giá trị cực trị phía dưới)
    rough_ymin_norm = (100.0 / img_h) * 1000 # 125
    rough_xmin_norm = (80.0 / img_w) * 1000  # 66.7
    rough_ymax_norm = (330.0 / img_h) * 1000 # 412.5 (cụt đáy!)
    rough_xmax_norm = (920.0 / img_w) * 1000 # 766.7
    
    rough_bbox = [rough_ymin_norm, rough_xmin_norm, rough_ymax_norm, rough_xmax_norm]
    print(f"📍 Rough Bbox từ LLM: norm={rough_bbox}")
    print(f"   Pixel thô: ymin=100 (lẫn chữ 'Câu 4'), ymax=330 (cắt cụt hàng y đáy=380)")
    
    # 3. Chạy Refine
    result = refine_bounding_box(
        image_np=canvas,
        rough_bbox_norm=rough_bbox,
        text_blocks=text_blocks
    )
    
    rymin, rxmin, rymax, rxmax = result["refined_bbox_pixel"]
    print(f"\n✅ Kết quả Refinement:")
    print(f"   Refined Pixel: ymin={rymin}, xmin={rxmin}, ymax={rymax}, xmax={rxmax}")
    print(f"   Refined Norm:  {result['refined_bbox_norm']}")
    
    # Kiểm tra điều kiện loại trừ chữ đề bài phía trên:
    # ymin phải lớn hơn text_blocks y2 (130) và snap vào table_top (180)
    assert rymin >= 134, f"LỖI: ymin ({rymin}) chưa loại bỏ dòng chữ đề bài (y2=130)!"
    print(f"   ✓ ĐÃ LOẠI TRỪ DÒNG CHỮ ĐỀ BÀI: ymin ({rymin}) >= 134")
    
    # Kiểm tra điều kiện chống cụt đáy:
    # ymax phải >= table_bottom (380) + padding an toàn
    assert rymax >= table_bottom, f"LỖI: ymax ({rymax}) bị cụt, nhỏ hơn table_bottom ({table_bottom})!"
    print(f"   ✓ ĐÃ KHẮC PHỤC CỤT ĐÁY: ymax ({rymax}) >= table_bottom ({table_bottom})")
    
    print("\n🎉 Tất cả bài kiểm tra Table BBox Refinement thành công xuất sắc!")

if __name__ == "__main__":
    test_bbox_refinement()
