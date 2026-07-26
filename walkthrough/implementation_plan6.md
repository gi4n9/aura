# Kế hoạch Nâng cấp Hệ thống OCR (Sharp Image Preprocessor & Local PaddleOCR Service)

Kế hoạch này chi tiết hóa các bước nâng cấp khả năng OCR trong dự án Aura Learning:
1. Tối ưu hóa **Tiền xử lý ảnh (Image Pre-processing)** bằng thư viện **Sharp** & **Canvas** trước khi đưa ảnh vào bất kỳ OCR engine hay Gemini Vision API nào (giúp tăng 15-20% độ chính xác và giảm dung lượng/token).
2. Xây dựng dịch vụ **Local PaddleOCR Microservice (Python FastAPI)** chạy trực tiếp trên máy tính (`http://localhost:8000`) với model `PP-OCRv4 vietnamese`, hoàn toàn miễn phí và không cần Docker ở giai đoạn thử nghiệm.
3. Thay thế luồng **Tesseract.js** ở tầng Fallback bằng **PaddleOCR Local Service** trong `lib/worksheet-parser.ts`.

---

## User Review Required

> [!NOTE]
> - **Chạy Local PaddleOCR Server**: Cần Python (phiên bản 3.10 hoặc 3.11) cài sẵn trên máy tính cá nhân để khởi chạy PaddleOCR local service (`http://localhost:8000`).
> - **Cơ chế Fallback thông minh**: Nếu người dùng chưa bật PaddleOCR local service, hệ thống sẽ tự động bắt ngoại lệ và fallback về Tesseract.js / Regex parser cũ mà không làm gián đoạn ứng dụng Next.js.

---

## Proposed Changes

### Component 1: Image Preprocessor & Dependencies

#### [MODIFY] [package.json](file:///f:/aura/aura/package.json)
- Thêm phụ thuộc `"sharp": "^0.33.5"` vào `dependencies`.

#### [NEW] [image-preprocessor.ts](file:///f:/aura/aura/lib/image-preprocessor.ts)
- Xây dựng module `optimizeImageForOCR`:
  - **Auto Rotate**: Xoay ảnh theo EXIF orientation.
  - **Constrain Dimension**: Thu nhỏ kích thước tối đa 2400px nếu ảnh quá lớn.
  - **Grayscale & Auto-contrast**: Chuyển về ảnh xám và cân bằng độ tương phản (`normalize`).
  - **Sharpening**: Làm nét chữ mờ.
  - **Option Binarization**: Nhị phân hóa (Thresholding) đối với ảnh chụp thiếu sáng/chữ in mờ.
- Xây dựng hàm `cropSubRegionWithCanvas` dùng Canvas 2D để cắt khoanh vùng chính xác khi cần.

---

### Component 2: Local PaddleOCR Microservice (Python)

#### [NEW] [ocr-service/main.py](file:///f:/aura/aura/ocr-service/main.py)
- Khởi tạo server **FastAPI** đọc nhận diện tiếng Việt bằng `PaddleOCR(use_angle_cls=True, lang='vi')`.
- Cung cấp endpoint `POST /api/v1/ocr` nhận file ảnh `multipart/form-data` và trả về kết quả văn bản + độ tin cậy.

#### [NEW] [ocr-service/requirements.txt](file:///f:/aura/aura/ocr-service/requirements.txt)
- Danh sách thư viện Python: `paddlepaddle`, `paddleocr`, `fastapi`, `uvicorn`, `python-multipart`, `Pillow`.

#### [NEW] [ocr-service/run_service.bat](file:///f:/aura/aura/ocr-service/run_service.bat)
- Script tiện ích dạng 1-click khởi chạy PaddleOCR server tại cổng `8000` trên Windows.

---

### Component 3: Integration in Worksheet Parser

#### [MODIFY] [worksheet-parser.ts](file:///f:/aura/aura/lib/worksheet-parser.ts)
- Nhập module `optimizeImageForOCR` từ `@/lib/image-preprocessor`.
- Áp dụng `optimizeImageForOCR` cho Buffer ảnh trước khi gửi sang Gemini 2.5 Flash (`parseQuestionsFromFile` và `parseQuestionsFromFilesBatch`).
- Cập nhật hàm `extractTextFromImage`:
  1. Tiền xử lý ảnh qua Sharp.
  2. Thử gọi API sang Local PaddleOCR Service (`http://localhost:8000/api/v1/ocr`).
  3. Nếu PaddleOCR thành công $\rightarrow$ Sử dụng kết quả PaddleOCR.
  4. Nếu PaddleOCR Service chưa bật / timeout $\rightarrow$ Fallback an toàn về Tesseract.js (đảm bảo tính liên tục của hệ thống).

---

## Verification Plan

### Automated & Unit Verification
- Chạy kiểm tra TypeScript compile: `npx tsc --noEmit`
- Kiểm tra tính hợp lệ của package: `npm run lint` hoặc `npm run build`

### Manual Verification
1. **Kiểm tra Preprocessing Sharp:** Upload ảnh đề thi mẫu có kích thước lớn (>3000px) hoặc bị xoay, kiểm tra log Sharp đã resize và tối ưu ảnh mượt mà.
2. **Kiểm tra Local PaddleOCR:**
   - Chạy script `run_service.bat` trong thư mục `ocr-service`.
   - Upload ảnh đề thi mẫu tiếng Việt (có công thức/bảng biểu), kiểm tra console log xác nhận trích xuất thành công từ PaddleOCR local service với độ chính xác cao.
3. **Kiểm tra Fallback an toàn:**
   - Tắt PaddleOCR local service và upload thử file ảnh, kiểm tra ứng dụng vẫn tự động chuyển sang luồng dự phòng cũ mà không sinh ra crash.
