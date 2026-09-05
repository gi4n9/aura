import io
import fitz # PyMuPDF
import docx
import zipfile
import base64
from typing import List, Dict, Any, Optional

def extract_tables_and_images_from_pdf(pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Bóc tách bảng biểu và hình vẽ vector/ảnh nhúng trực tiếp từ file PDF
    sử dụng PyMuPDF (fitz) - chính xác tuyệt đối theo tọa độ vector, không lo chèn chữ.
    """
    results = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_rect = page.rect
        page_w = page_rect.width
        page_h = page_rect.height
        
        # 1. Trích xuất bảng bằng PyMuPDF Table Finder tích hợp sẵn
        try:
            tables = page.find_tables()
            for tab_idx, tab in enumerate(tables):
                # bbox dạng (x0, y0, x1, y1)
                x0, y0, x1, y1 = tab.bbox
                # Render riêng vùng bảng với độ phân giải cao (DPI 300)
                clip_rect = fitz.Rect(max(0, x0 - 4), max(0, y0 - 2), min(page_w, x1 + 4), min(page_h, y1 + 6))
                pix = page.get_pixmap(clip=clip_rect, dpi=250)
                img_data = pix.tobytes("png")
                b64 = base64.b64encode(img_data).decode("utf-8")
                
                # Chuẩn hóa về thang 0-1000
                bbox_norm = [
                    round((y0 / page_h) * 1000, 1),
                    round((x0 / page_w) * 1000, 1),
                    round((y1 / page_h) * 1000, 1),
                    round((x1 / page_w) * 1000, 1)
                ]
                
                results.append({
                    "type": "table",
                    "page_index": page_idx,
                    "bbox_norm": bbox_norm,
                    "bbox_pt": [y0, x0, y1, x1],
                    "image_base64": f"data:image/png;base64,{b64}",
                    "row_count": tab.row_count,
                    "col_count": tab.col_count
                })
        except Exception as e:
            print(f"⚠️ find_tables error on page {page_idx}: {e}")
            
        # 2. Trích xuất các hình vẽ/ảnh nhúng có sẵn trong trang
        image_list = page.get_images(full=True)
        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # Tìm vị trí hiển thị của ảnh trên trang
                img_rects = page.get_image_rects(xref)
                if img_rects:
                    for rect in img_rects:
                        # Bỏ qua các icon hoặc đường kẻ quá nhỏ (< 30px)
                        if rect.width < 35 or rect.height < 35:
                            continue
                            
                        b64 = base64.b64encode(image_bytes).decode("utf-8")
                        bbox_norm = [
                            round((rect.y0 / page_h) * 1000, 1),
                            round((rect.x0 / page_w) * 1000, 1),
                            round((rect.y1 / page_h) * 1000, 1),
                            round((rect.x1 / page_w) * 1000, 1)
                        ]
                        results.append({
                            "type": "embedded_image",
                            "page_index": page_idx,
                            "bbox_norm": bbox_norm,
                            "bbox_pt": [rect.y0, rect.x0, rect.y1, rect.x1],
                            "image_base64": f"data:image/{image_ext};base64,{b64}"
                        })
            except Exception as e:
                print(f"⚠️ extract_image error on page {page_idx}, xref {xref}: {e}")
                
    doc.close()
    return results


def extract_media_from_docx(docx_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Trích xuất toàn bộ ảnh đính kèm (embedded images, drawings) và bảng từ file Word .docx
    mà không cần chuyển đổi sang raster toàn trang.
    """
    results = []
    
    # 1. Trích xuất ảnh gốc từ media zip trong file DOCX
    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
            media_files = [f for f in z.namelist() if f.startswith("word/media/")]
            for idx, m_file in enumerate(media_files):
                img_data = z.read(m_file)
                ext = m_file.split(".")[-1].lower()
                mime = "image/png" if ext == "png" else ("image/jpeg" if ext in ["jpg", "jpeg"] else "image/png")
                b64 = base64.b64encode(img_data).decode("utf-8")
                
                results.append({
                    "type": "docx_image",
                    "filename": m_file,
                    "index": idx,
                    "image_base64": f"data:{mime};base64,{b64}"
                })
    except Exception as e:
        print(f"⚠️ extract_media_from_docx error: {e}")
        
    return results
