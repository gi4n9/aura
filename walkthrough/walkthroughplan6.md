# Walkthrough: Nâng cấp Hệ thống OCR & Tự động hóa Dev Workflow

Tôi đã hoàn thành việc tích hợp script khởi chạy đồng thời **Next.js Dev Server** và **Local PaddleOCR Service** thông qua duy nhất một lệnh `npm run dev`.

---

## 🛠️ Những công việc đã hoàn thành

### 1. Launcher Script đồng bộ `scripts/dev-runner.js`
- [x] Tạo file [scripts/dev-runner.js](file:///f:/aura/aura/scripts/dev-runner.js):
  - Khởi chạy song song `python ocr-service/main.py` (Local PaddleOCR ở cổng `8000`) và `npx next dev` (Next.js ở cổng `3000`).
  - Bắt các sự kiện `SIGINT` (Ctrl+C), `SIGTERM` và `exit`.
  - Trên Windows: Tự động dùng `taskkill /f /t /pid` để dọn dẹp sạch sẽ toàn bộ cây tiến trình (Process Tree) của cả 2 ứng dụng khi ngắt kết nối.
- [x] Cập nhật [package.json](file:///f:/aura/aura/package.json):
  - `"dev": "node scripts/dev-runner.js"` (Khởi chạy đồng thời cả 2 service).
  - `"dev:next": "next dev"` (Chỉ chạy Next.js).
  - `"dev:ocr": "python ocr-service/main.py"` (Chỉ chạy PaddleOCR).

---

### 2. Module Tiền xử lý Ảnh `lib/image-preprocessor.ts`
- [x] Đã cài đặt phụ thuộc `sharp` vào `package.json`.
- [x] Tạo module [image-preprocessor.ts](file:///f:/aura/aura/lib/image-preprocessor.ts) hỗ trợ:
  - **Auto Rotate**: Xoay ảnh chuẩn theo EXIF orientation.
  - **Constrain Dimension**: Thu nhỏ ảnh to xuống tối đa `2400px` (giảm 50-70% dung lượng mà không suy giảm nét chữ).
  - **Grayscale & Auto-contrast**: Chuyển ảnh xám và cân bằng tương phản sáng tối (`normalize`).
  - **Sharpening**: Làm nét lại các góc ký tự mờ.
  - **Canvas Cropping & Stitching**: Cắt vùng chọn và ghép ảnh sprite.

---

### 3. Local PaddleOCR Microservice (Python)
- [x] Tạo thư mục [ocr-service](file:///f:/aura/aura/ocr-service) chứa:
  - [main.py](file:///f:/aura/aura/ocr-service/main.py): Server FastAPI khởi tạo PaddleOCR `PP-OCRv4 vietnamese`.
  - [requirements.txt](file:///f:/aura/aura/ocr-service/requirements.txt): Danh sách thư viện Python cần thiết (`paddlepaddle`, `paddleocr`, `fastapi`, `uvicorn`).
  - [run_service.bat](file:///f:/aura/aura/ocr-service/run_service.bat): File khởi chạy thủ công 1-click cho môi trường Windows.

---

### 4. Chuẩn hóa & Hậu xử lý Dữ liệu Gemini (`lib/worksheet-parser.ts`)
- [x] **Áp dụng Sharp Preprocessor cho Gemini Vision API**:
  - Buffer ảnh upload được tối ưu qua Sharp trước khi đưa vào Gemini 2.5 Flash.
- [x] **Sửa lỗi trùng tiền tố**:
  - Tự động xóa các từ dư thừa như `Câu 1:`, `Bài 2.` ở đầu nội dung câu hỏi và tiền tố `A. `, `B. `, `C. `, `D. `.
- [x] **Chuẩn hóa LaTeX & Markdown**:
  - Đổi các ký hiệu LaTeX `\(...\)` thành `$ ... $` và `\[...\]` thành `$$ ... $$` để KaTeX / Markdown render đẹp mắt trên giao diện làm bài của Học viên và Giảng viên.
- [x] **Cơ chế Fallback thông minh sang PaddleOCR**:
  - Hàm `extractTextFromImage` ưu tiên tối ưu ảnh bằng Sharp $\rightarrow$ Thử gọi Local PaddleOCR tại `http://localhost:8000`.
  - Nếu Local PaddleOCR service chưa được bật, hệ thống tự động bắt ngoại lệ và dùng Tesseract.js fallback mà không bị dừng hay crash ứng dụng.

---

## 💡 Hướng dẫn Sử dụng

Bây giờ bạn chỉ cần gõ đúng lệnh quen thuộc:
```bash
npm run dev
```

1. **Launcher** sẽ tự động kích hoạt **PaddleOCR Service** (`http://localhost:8000`) và **Next.js Dev Server** (`http://localhost:3000`).
2. Khi bạn bấm **Ctrl + C** trong Terminal, Launcher sẽ **tắt sạch sẽ cả 2 service cùng một lúc**, không để lại tiến trình chạy ngầm nào!
