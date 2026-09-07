import cv2
import numpy as np
import base64
from typing import List, Dict, Tuple, Optional, Any

def detect_and_eliminate_top_text(
    binary_img: np.ndarray,
    search_h_limit: int,
    min_gap_h: int = 5
) -> int:
    """
    Sử dụng Horizontal Projection Profile để tìm khoảng trắng (White Valley)
    ngăn cách giữa dòng văn bản đề bài phía trên và đỉnh của hình vẽ/đồ thị.
    Trả về vị trí y tương đối (trong binary_img) để cắt bỏ dòng chữ phía trên.
    """
    h, w = binary_img.shape[:2]
    limit = min(h, search_h_limit)
    if limit <= 10:
        return 0
        
    row_ink = np.sum(binary_img[:limit, :] > 0, axis=1)
    white_thresh = max(2, int(w * 0.005))
    
    in_text = False
    text_end = -1
    gap_start = -1
    
    for y in range(limit):
        is_ink = row_ink[y] > white_thresh
        if is_ink:
            if not in_text:
                in_text = True
            if gap_start != -1:
                gap_len = y - gap_start
                if gap_len >= min_gap_h and text_end > 0:
                    return y
                gap_start = -1
        else:
            if in_text:
                in_text = False
                text_end = y
                gap_start = y
                
    if gap_start != -1 and (limit - gap_start) >= min_gap_h and text_end > 0:
        return gap_start + (min_gap_h // 2)
        
    return 0


def detect_and_eliminate_bottom_text(
    binary_img: np.ndarray,
    min_gap_h: int = 6
) -> int:
    """
    Sử dụng Horizontal Projection Profile từ đỉnh hình xuống đáy để tìm
    khoảng trắng (White Valley) ngăn cách giữa đáy của hình vẽ/đồ thị
    và các dòng văn bản của câu hỏi tiếp theo (hoặc ghi chú).
    Trả về vị trí y tương đối để cắt bỏ phần chữ thừa phía dưới.
    """
    h, w = binary_img.shape[:2]
    row_ink = np.sum(binary_img > 0, axis=1)
    white_thresh = max(2, int(w * 0.005))
    
    blocks = []
    in_b = False
    b_start = 0
    for y in range(h):
        if row_ink[y] > white_thresh:
            if not in_b:
                in_b = True
                b_start = y
        else:
            if in_b:
                in_b = False
                blocks.append((b_start, y, y - b_start))
    if in_b:
        blocks.append((b_start, h, h - b_start))
        
    if not blocks:
        return h
        
    # Khối hình vẽ chính thường có chiều cao lớn nhất hoặc tổng ink lớn nhất
    diag_idx = 0
    max_h = 0
    for i, b in enumerate(blocks):
        if b[2] > max_h:
            max_h = b[2]
            diag_idx = i
            
    diag_end = blocks[diag_idx][1]

    # Kiểm tra nếu khối tiếp theo ngay sát dưới khối hình vẽ chính là nhãn điểm/đỉnh/trục (VD: D, C, A7, x, y...)
    # Đặc điểm của nhãn: chiều cao nhỏ (h <= 35px), khoảng cách đến đáy hình nhỏ (<= 15px),
    # và phía sau nó có khoảng trắng lớn (>= 10px) ngăn cách với đề bài tiếp theo hoặc kết thúc ROI.
    if diag_idx + 1 < len(blocks):
        next_b = blocks[diag_idx + 1]
        gap_to_diag = next_b[0] - diag_end
        next_h = next_b[2]
        is_close = gap_to_diag <= 15
        is_short_label = next_h <= 35
        after_gap = (blocks[diag_idx + 2][0] - next_b[1]) if diag_idx + 2 < len(blocks) else (h - next_b[1])
        if is_close and is_short_label and after_gap >= 10:
            diag_end = next_b[1]

    return min(h, diag_end + 6)


def is_banner_header_or_footer(img_bgr: np.ndarray, y: int, x: int, y2: int, x2: int) -> bool:
    """
    Xác định xem vùng bounding box có phải là Header Banner hoặc Footer Banner của đề thi hay không.
    Các đề thi tại Việt Nam thường có:
    1. Header Banner hình học: Sát mép trên cùng (y <= 3.5% h), rộng ngang (cw >= 65% w), dải băng hẹp (ch <= 15% h).
    2. Footer Banner hình học: Sát mép dưới cùng (y2 >= 96.5% h), rộng ngang (cw >= 60% w), dải băng hẹp (ch <= 10% h).
    3. Dải màu Banner (Colored Banner) ở đầu hoặc chân trang: vùng nằm trong 14% trên cùng hoặc 12% dưới cùng có màu nền rõ rệt.
    """
    h, w = img_bgr.shape[:2]
    ch = y2 - y
    cw = x2 - x
    if ch <= 0 or cw <= 0:
        return True

    # 1. Header Banner hình học sát mép đỉnh
    if y <= int(h * 0.035) and cw >= int(w * 0.65) and ch <= int(h * 0.15):
        return True

    # 2. Footer Banner hình học sát mép đáy
    if y2 >= int(h * 0.965) and cw >= int(w * 0.60) and ch <= int(h * 0.10):
        return True

    # 3. Dải màu Banner (Colored Banner) ở đầu trang hoặc cuối trang (VD: Hocmai, Tuyensinh247, logo trung tâm...)
    if (y < int(h * 0.14) or y2 > int(h * 0.88)) and cw >= int(w * 0.40):
        roi = img_bgr[max(0, y):min(h, y2), max(0, x):min(w, x2)]
        if roi.size > 0:
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV) if len(roi.shape) == 3 else None
            if hsv is not None:
                sat = hsv[:, :, 1]
                if np.mean(sat > 50) > 0.15:
                    return True

    return False


def find_all_tables_on_page(img_bgr: np.ndarray) -> Tuple[List[Tuple[int, int, int, int]], np.ndarray]:
    """
    Sử dụng Morphological Operations quét toàn bộ trang để tìm các bảng kẻ ô (Table Grids).
    Trả về danh sách các bounding boxes: [(y1, x1, y2, x2), ...] và table_mask
    """
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY) if len(img_bgr.shape) == 3 else img_bgr
    _, bin_img = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (min(w // 15, 35), 1))
    h_lines = cv2.morphologyEx(bin_img, cv2.MORPH_OPEN, h_kernel)

    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, min(h // 35, 25)))
    v_lines = cv2.morphologyEx(bin_img, cv2.MORPH_OPEN, v_kernel)

    table_mask = cv2.bitwise_or(h_lines, v_lines)
    contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    tables = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if cw > w * 0.20 and ch >= 20:
            # Loại trừ header banner hoặc footer banner
            if is_banner_header_or_footer(img_bgr, y, x, y + ch, x + cw):
                continue
            tables.append((y, x, y + ch, x + cw))

    tables.sort(key=lambda t: t[0])
    return tables, table_mask


def find_all_diagrams_on_page(img_bgr: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Tìm các đối tượng hình vẽ, hình học, đồ thị (Cube, Polygon, Bead, Graphs...)
    có chiều cao >= 70px, không phải đoạn văn bản dàn ngang (cw <= 0.78 * w),
    và có chu vi đường bao hình học lớn (max_c_len >= 0.22 * w hoặc >= 380).
    """
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY) if len(img_bgr.shape) == 3 else img_bgr
    _, bin_img = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    closed = cv2.morphologyEx(bin_img, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    diagrams = []
    min_perimeter = max(380, int(w * 0.22))

    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if ch >= 70 and cw >= 95 and ch < h * 0.7:
            # Loại trừ header banner hoặc footer banner
            if is_banner_header_or_footer(img_bgr, y, x, y + ch, x + cw):
                continue
            # Loại bỏ đoạn văn bản dàn ngang trang (paragraphs)
            if cw > w * 0.78:
                continue
            # Bỏ qua header đầu trang
            if y < 100:
                continue

            roi_bin = bin_img[y:y+ch, x:x+cw]
            density = np.sum(roi_bin > 0) / float(cw * ch)
            if density > 0.16:
                continue

            # Kiểm tra độ dài đường cong/cạnh hình học (loại bỏ hệ phương trình, công thức và văn bản ngắn)
            sub_cnts, _ = cv2.findContours(roi_bin, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            max_c_len = max([cv2.arcLength(sc, True) for sc in sub_cnts]) if sub_cnts else 0
            if max_c_len >= min_perimeter:
                diagrams.append((y, x, y + ch, x + cw))

    diagrams.sort(key=lambda d: d[0])
    return diagrams


def refine_table_or_diagram_bbox(
    image: np.ndarray,
    bbox: List[float],
    bbox_type: str = "auto",
    padding_top_px: int = 4,
    padding_bottom_px: int = 15,
    padding_sides_px: int = 15
) -> Dict[str, Any]:
    """
    Tinh chỉnh Bounding Box thông minh:
    1. Tự động phát hiện nếu bbox của AI bị lệch tọa độ (Hallucination) và snap về bảng thực tế trên trang.
    2. Nếu là bảng có nhãn bên ngoài (như "Hàng 1..5" bên trái hoặc "Cột 1..5" bên dưới), tự động mở rộng để bao trọn nhãn.
    3. Tự động phát hiện hình vẽ (Hình lập phương, đa giác, hạt cườm) ngay cả khi AI trỏ nhầm vào dòng chữ đề bài.
    4. Sử dụng White Valley Detection ở CẢ ĐỈNH VÀ ĐÁY để gọt sạch chữ đề bài ở trên và câu hỏi tiếp theo ở dưới.
    """
    img_h, img_w = image.shape[:2]
    ymin_norm, xmin_norm, ymax_norm, xmax_norm = bbox
    
    ymin = int(round((ymin_norm / 1000.0) * img_h))
    xmin = int(round((xmin_norm / 1000.0) * img_w))
    ymax = int(round((ymax_norm / 1000.0) * img_h))
    xmax = int(round((xmax_norm / 1000.0) * img_w))
    
    ymin = max(0, min(ymin, img_h - 1))
    xmin = max(0, min(xmin, img_w - 1))
    ymax = max(ymin + 10, min(ymax, img_h))
    xmax = max(xmin + 10, min(xmax, img_w))

    # 1. Kiểm tra Table Grids
    all_tables, full_table_mask = find_all_tables_on_page(image)
    matched_table = None
    if all_tables:
        for t in all_tables:
            t_ymin, t_xmin, t_ymax, t_xmax = t
            y_overlap = max(0, min(ymax, t_ymax) - max(ymin, t_ymin))
            t_h = t_ymax - t_ymin
            if y_overlap > 0.3 * t_h or abs((t_ymin + t_ymax) / 2 - (ymin + ymax) / 2) < max(t_h, 100):
                matched_table = t
                break

    if matched_table is not None:
        t_ymin, t_xmin, t_ymax, t_xmax = matched_table
        final_ymin = max(0, t_ymin - 2)
        final_ymax = min(img_h, t_ymax + 2)
        final_xmin = max(0, t_xmin - 4)
        final_xmax = min(img_w, t_xmax + 4)

        # Kiểm tra nhãn hàng bên trái (VD: "Hàng 1..5" trên bảng 15 ô vuông)
        has_left_labels = False
        search_left = max(0, t_xmin - 90)
        left_roi = image[t_ymin:t_ymax, search_left:t_xmin]
        if left_roi.size > 0:
            left_gray = cv2.cvtColor(left_roi, cv2.COLOR_BGR2GRAY) if len(left_roi.shape) == 3 else left_roi
            if np.sum(left_gray < 215) > 80:
                left_cols = np.where(np.sum(left_gray < 215, axis=0) > 2)[0]
                if len(left_cols) > 0:
                    final_xmin = max(0, int(search_left + left_cols[0] - 8))
                    has_left_labels = True

        # Chỉ tìm nhãn cột phía dưới (VD: "Cột 1..5") nếu bảng có nhãn bên ngoài
        if has_left_labels:
            search_bottom = min(img_h, t_ymax + 45)
            bottom_roi = image[t_ymax:search_bottom, final_xmin:final_xmax]
            if bottom_roi.size > 0:
                bottom_gray = cv2.cvtColor(bottom_roi, cv2.COLOR_BGR2GRAY) if len(bottom_roi.shape) == 3 else bottom_roi
                if np.sum(bottom_gray < 215) > 50:
                    bottom_rows = np.where(np.sum(bottom_gray < 215, axis=1) > 2)[0]
                    if len(bottom_rows) > 0:
                        final_ymax = min(img_h, int(t_ymax + bottom_rows[-1] + 8))

        return {
            "refined_bbox_norm": [
                float(round((final_ymin / img_h) * 1000, 1)),
                float(round((final_xmin / img_w) * 1000, 1)),
                float(round((final_ymax / img_h) * 1000, 1)),
                float(round((final_xmax / img_w) * 1000, 1))
            ],
            "refined_bbox_pixel": [int(final_ymin), int(final_xmin), int(final_ymax), int(final_xmax)],
            "original_bbox_pixel": [int(ymin), int(xmin), int(ymax), int(xmax)],
            "method": "exact_table_grid_snap_with_labels"
        }

    # 2. Kiểm tra Visual Diagrams (Hình học, đa giác, hạt cườm, đồ thị)
    all_diagrams = find_all_diagrams_on_page(image)
    matched_diagram = None
    if all_diagrams:
        for d in all_diagrams:
            d_ymin, d_xmin, d_ymax, d_xmax = d
            d_h = d_ymax - d_ymin
            # Trực tiếp giao nhau
            y_overlap = max(0, min(ymax, d_ymax) - max(ymin, d_ymin))
            if y_overlap > 0.35 * d_h:
                matched_diagram = d
                break
            # Hoặc bbox của AI trỏ vào dòng chữ đề bài ngay phía trên hình vẽ (trong phạm vi 180px)
            if ymin <= d_ymin and abs(d_ymin - ymax) < 180 and abs((d_xmin + d_xmax)/2 - (xmin + xmax)/2) < img_w * 0.4:
                matched_diagram = d
                break
            # Hoặc tâm y gần nhau
            if abs((d_ymin + d_ymax)/2 - (ymin + ymax)/2) < 120:
                matched_diagram = d
                break

    if matched_diagram is not None:
        d_ymin, d_xmin, d_ymax, d_xmax = matched_diagram
        d_w = d_xmax - d_xmin
        
        roi_top = max(0, d_ymin - 25)
        roi_bottom = min(img_h, d_ymax + 35)
        
        # Căn chỉnh lề ngang
        if xmin > d_xmax or xmax < d_xmin or (xmax - xmin > d_w * 2.5):
            roi_left = max(0, d_xmin - padding_sides_px)
            roi_right = min(img_w, d_xmax + padding_sides_px)
        else:
            roi_left = max(0, min(xmin, d_xmin) - padding_sides_px)
            roi_right = min(img_w, max(xmax, d_xmax) + padding_sides_px)

        roi = image[roi_top:roi_bottom, roi_left:roi_right]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi
        _, binary = cv2.threshold(gray, 215, 255, cv2.THRESH_BINARY_INV)

        # Gọt chữ đề bài ở đỉnh
        top_cut = detect_and_eliminate_top_text(binary, search_h_limit=35, min_gap_h=5)
        final_ymin = roi_top + top_cut if top_cut > 0 else roi_top

        # Gọt chữ câu hỏi phía dưới đáy
        bottom_cut = detect_and_eliminate_bottom_text(binary[top_cut:, :], min_gap_h=6)
        final_ymax = min(img_h, final_ymin + bottom_cut + 6)

        final_xmin = roi_left
        final_xmax = roi_right

        return {
            "refined_bbox_norm": [
                float(round((final_ymin / img_h) * 1000, 1)),
                float(round((final_xmin / img_w) * 1000, 1)),
                float(round((final_ymax / img_h) * 1000, 1)),
                float(round((final_xmax / img_w) * 1000, 1))
            ],
            "refined_bbox_pixel": [int(final_ymin), int(final_xmin), int(final_ymax), int(final_xmax)],
            "original_bbox_pixel": [int(ymin), int(xmin), int(ymax), int(xmax)],
            "method": "smart_diagram_snap_and_white_valley"
        }

    # 3. Fallback Heuristic
    roi_top = max(0, ymin - 15)
    roi_bottom = min(img_h, ymax + 25)
    roi_left = max(0, xmin - padding_sides_px)
    roi_right = min(img_w, xmax + padding_sides_px)

    roi = image[roi_top:roi_bottom, roi_left:roi_right]
    if roi.size == 0:
        roi = image[ymin:ymax, xmin:xmax]
        roi_top, roi_left = ymin, xmin

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi
    _, binary = cv2.threshold(gray, 210, 255, cv2.THRESH_BINARY_INV)

    top_cut = detect_and_eliminate_top_text(binary, search_h_limit=35, min_gap_h=5)
    final_ymin = roi_top + top_cut if top_cut > 0 else roi_top

    bottom_cut = detect_and_eliminate_bottom_text(binary[top_cut:, :], min_gap_h=6)
    final_ymax = final_ymin + bottom_cut

    final_xmin = roi_left
    final_xmax = roi_right

    return {
        "refined_bbox_norm": [
            float(round((final_ymin / img_h) * 1000, 1)),
            float(round((final_xmin / img_w) * 1000, 1)),
            float(round((final_ymax / img_h) * 1000, 1)),
            float(round((final_xmax / img_w) * 1000, 1))
        ],
        "refined_bbox_pixel": [int(final_ymin), int(final_xmin), int(final_ymax), int(final_xmax)],
        "original_bbox_pixel": [int(ymin), int(xmin), int(ymax), int(xmax)],
        "method": "heuristic_white_valley_envelope"
    }


def refine_bounding_box(
    image_np: np.ndarray,
    rough_bbox_norm: List[float],
    text_blocks: Optional[List[Dict[str, Any]]] = None,
    padding_bottom_ratio: float = 0.04,
    padding_bottom_px: int = 15,
    padding_sides_px: int = 15,
    padding_top_px: int = 12
) -> Dict[str, Any]:
    """
    Hàm chuẩn được gọi từ API FastAPI endpoint /api/v1/refine-bbox
    """
    return refine_table_or_diagram_bbox(
        image=image_np,
        bbox=rough_bbox_norm,
        padding_top_px=padding_top_px,
        padding_bottom_px=padding_bottom_px,
        padding_sides_px=padding_sides_px
    )


def enhance_image_ultra_hd(img_np: np.ndarray) -> np.ndarray:
    """
    Tối ưu hóa độ sắc nét cực đại (Ultra HD Sharpness & Maximum Legibility):
    1. Dynamic Super-sampling (Lanczos4) đưa ảnh về chuẩn Retina Display (rộng 1400-2000px).
    2. Non-linear Midtone Gamma Curve (gamma=0.65) làm đậm nét mực, phục hồi các nét chữ/số/công thức toán và đường kẻ mờ nhạt do scan chất lượng thấp.
    3. Smart Unsharp Masking (USM) tăng cường tương phản biên cạnh mà không gây nhiễu hạt (ringing).
    4. Paper White Background Leveling làm sạch các vết ố vàng/xám của giấy thi, đưa nền về trắng tinh khôi chuẩn sách giáo khoa (Pure White #FFFFFF).
    """
    if img_np is None or img_np.size == 0:
        return img_np

    h, w = img_np.shape[:2]
    
    # 1. Dynamic Super-sampling
    target_w = max(1400, w)
    scale = min(3.5, max(1.0, target_w / float(w)))
    if w * scale > 2400:
        scale = 2400.0 / w
    if h * scale > 2400:
        scale = min(scale, 2400.0 / h)
        
    if scale > 1.05:
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))
        upscaled = cv2.resize(img_np, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    else:
        upscaled = img_np.copy()

    # 2. Phục hồi nét mực và số liệu mờ bằng Non-linear Gamma curve (gamma=0.65)
    gamma = 0.65
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype('uint8')
    darkened = cv2.LUT(upscaled, table)

    # 3. Smart Unsharp Masking
    blurred = cv2.GaussianBlur(darkened, (0, 0), sigmaX=1.1)
    sharpened = cv2.addWeighted(darkened, 1.40, blurred, -0.40, 0)

    # 4. Pure Paper-White background leveling
    if len(sharpened.shape) == 3:
        gray = cv2.cvtColor(sharpened, cv2.COLOR_BGR2GRAY)
        bg_mask = gray >= 242
        enhanced = sharpened.copy()
        enhanced[bg_mask] = [255, 255, 255]
    else:
        bg_mask = sharpened >= 242
        enhanced = sharpened.copy()
        enhanced[bg_mask] = 255

    return enhanced


def extract_page_visual_elements(image: np.ndarray) -> List[Dict[str, Any]]:
    """
    Tự động quét toàn bộ trang để tìm và cắt tất cả các đối tượng hình ảnh/bảng biểu trực quan:
    - Bảng số liệu, bảng ghép nhóm, bảng biến thiên (Table Grids)
    - Hình học không gian, đa giác, đồ thị, sơ đồ, hạt cườm (Diagrams)
    - Tự động bảo toàn nhãn hàng (bên trái) và nhãn cột (bên dưới) của bảng
    - Áp dụng White Valley Detection gọt sạch text đề bài phía trên và câu hỏi phía dưới
    - Áp dụng Ultra HD Enhancement và trả về data URL base64 theo thứ tự từ trên xuống dưới
    """
    if image is None or image.size == 0:
        return []

    img_h, img_w = image.shape[:2]
    all_tables, _ = find_all_tables_on_page(image)
    
    refined_tables = []
    for t in all_tables:
        t_ymin, t_xmin, t_ymax, t_xmax = t
        final_ymin = max(0, t_ymin - 2)
        final_ymax = min(img_h, t_ymax + 2)
        final_xmin = max(0, t_xmin - 4)
        final_xmax = min(img_w, t_xmax + 4)

        # Kiểm tra nhãn hàng bên trái (VD: "Hàng 1..5" trên bảng 15 ô vuông)
        has_left_labels = False
        search_left = max(0, t_xmin - 90)
        left_roi = image[t_ymin:t_ymax, search_left:t_xmin]
        if left_roi.size > 0:
            left_gray = cv2.cvtColor(left_roi, cv2.COLOR_BGR2GRAY) if len(left_roi.shape) == 3 else left_roi
            if np.sum(left_gray < 215) > 80:
                left_cols = np.where(np.sum(left_gray < 215, axis=0) > 2)[0]
                if len(left_cols) > 0:
                    final_xmin = max(0, int(search_left + left_cols[0] - 8))
                    has_left_labels = True

        # Chỉ tìm nhãn cột phía dưới (VD: "Cột 1..5") nếu bảng có nhãn bên ngoài
        if has_left_labels:
            search_bottom = min(img_h, t_ymax + 45)
            bottom_roi = image[t_ymax:search_bottom, final_xmin:final_xmax]
            if bottom_roi.size > 0:
                bottom_gray = cv2.cvtColor(bottom_roi, cv2.COLOR_BGR2GRAY) if len(bottom_roi.shape) == 3 else bottom_roi
                if np.sum(bottom_gray < 215) > 50:
                    bottom_rows = np.where(np.sum(bottom_gray < 215, axis=1) > 2)[0]
                    if len(bottom_rows) > 0:
                        final_ymax = min(img_h, int(t_ymax + bottom_rows[-1] + 8))

        refined_tables.append({
            'type': 'table',
            'bbox': [final_ymin, final_xmin, final_ymax, final_xmax],
            'ymin': final_ymin
        })

    # Diagrams (Hình học, đồ thị, hạt cườm...)
    all_diagrams = find_all_diagrams_on_page(image)
    refined_diagrams = []
    for d in all_diagrams:
        d_ymin, d_xmin, d_ymax, d_xmax = d
        # Bỏ qua nếu trùng với bảng đã nhận diện
        overlaps_table = False
        for t in refined_tables:
            tb = t['bbox']
            y_ov = max(0, min(d_ymax, tb[2]) - max(d_ymin, tb[0]))
            if y_ov > 0.4 * (d_ymax - d_ymin):
                overlaps_table = True
                break
        if overlaps_table:
            continue

        pad_x = max(35, int((d_xmax - d_xmin) * 0.12))
        roi_left = max(0, d_xmin - pad_x)
        roi_right = min(img_w, d_xmax + pad_x)

        # Cửa sổ quét 85px trên và dưới để phát hiện nhãn đỉnh/góc (A', B', A1...) và nhãn đáy (D, C, A7...)
        search_top = max(0, d_ymin - 85)
        search_bot = min(img_h, d_ymax + 85)

        roi = image[search_top:search_bot, roi_left:roi_right]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi
        _, bin_img = cv2.threshold(gray, 215, 255, cv2.THRESH_BINARY_INV)
        row_ink = np.sum(bin_img > 0, axis=1)
        white_thresh = max(2, int(bin_img.shape[1] * 0.005))

        blocks = []
        in_b = False
        s = 0
        for y in range(len(row_ink)):
            if row_ink[y] > white_thresh:
                if not in_b:
                    in_b = True
                    s = y
            else:
                if in_b:
                    in_b = False
                    blocks.append([s, y, y - s])
        if in_b:
            blocks.append([s, len(row_ink), len(row_ink) - s])

        # Gộp các dải mực chỉ cách nhau <= 2px
        merged = []
        for b in blocks:
            if merged and (b[0] - merged[-1][1]) <= 2:
                merged[-1][1] = b[1]
                merged[-1][2] = merged[-1][1] - merged[-1][0]
            else:
                merged.append(b)

        if not merged:
            continue

        # Tìm khối hình chính (khối có chiều cao lớn nhất)
        body_idx = max(range(len(merged)), key=lambda i: merged[i][2])
        body = merged[body_idx]

        # Kiểm tra nhãn đỉnh (VD: A', B', A1...) nằm ngay trên khối chính
        final_top = body[0]
        if body_idx > 0:
            prev_b = merged[body_idx - 1]
            gap_to_body = body[0] - prev_b[1]
            gap_above = (prev_b[0] - merged[body_idx - 2][1]) if body_idx > 1 else prev_b[0]
            if gap_to_body <= 15 and prev_b[2] <= 35 and gap_above >= 12:
                final_top = prev_b[0]

        # Kiểm tra nhãn đáy (VD: D, C, A7...) nằm ngay dưới khối chính
        final_bot = body[1]
        if body_idx + 1 < len(merged):
            next_b = merged[body_idx + 1]
            gap_to_body = next_b[0] - body[1]
            gap_below = (merged[body_idx + 2][0] - next_b[1]) if body_idx + 2 < len(merged) else (len(row_ink) - next_b[1])
            if gap_to_body <= 15 and next_b[2] <= 35 and gap_below >= 12:
                final_bot = next_b[1]

        final_ymin = max(0, search_top + final_top - 8)
        final_ymax = min(img_h, search_top + final_bot + 12)
        final_xmin = roi_left
        final_xmax = roi_right

        if (final_ymax - final_ymin) >= 45 and (final_xmax - final_xmin) >= 80:
            refined_diagrams.append({
                'type': 'diagram',
                'bbox': [final_ymin, final_xmin, final_ymax, final_xmax],
                'ymin': final_ymin
            })

    # Ghép và sắp xếp từ trên xuống dưới
    all_elements = refined_tables + refined_diagrams
    all_elements.sort(key=lambda x: x['ymin'])
    
    results = []
    for el in all_elements:
        ymin, xmin, ymax, xmax = el['bbox']
        if is_banner_header_or_footer(image, ymin, xmin, ymax, xmax):
            continue
        crop = image[ymin:ymax, xmin:xmax]
        if crop.size == 0:
            continue
        enhanced = enhance_image_ultra_hd(crop)
        _, buf = cv2.imencode('.png', enhanced)
        b64 = "data:image/png;base64," + base64.b64encode(buf).decode('utf-8')
        results.append({
            'index': len(results),
            'type': el['type'],
            'bbox_pixel': [int(ymin), int(xmin), int(ymax), int(xmax)],
            'bbox_norm': [
                float(round((ymin / img_h) * 1000, 1)),
                float(round((xmin / img_w) * 1000, 1)),
                float(round((ymax / img_h) * 1000, 1)),
                float(round((xmax / img_w) * 1000, 1))
            ],
            'crop_base64': b64,
            'width': int(xmax - xmin),
            'height': int(ymax - ymin)
        })
    return results
