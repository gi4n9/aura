# Nâng cấp tính năng Câu hỏi ôn tập (Quiz Worksheet)

Tính năng quản lý và làm bài tập ôn tập đã được nâng cấp đáng kể, cho phép giảng viên upload phiếu bài tập (ảnh hoặc PDF) và tự động nhận diện nội dung nhờ AI, đồng thời hỗ trợ dạng câu hỏi tự luận.

## Các thay đổi chính

### 1. Dành cho Giảng viên

- **Upload Phiếu Bài Tập (Worksheet):** Bổ sung chức năng upload file (`WorksheetUploader.tsx`). Giảng viên có thể kéo thả hoặc chọn file ảnh/PDF chứa câu hỏi tự luận/trắc nghiệm. Hệ thống sẽ:
  - Tải file lên Supabase Storage.
  - Sử dụng thư viện `tesseract.js` (nhận dạng tiếng Việt) và `pdf-parse` để đọc text.
  - Sử dụng quy tắc Regex thông minh trong `worksheet-parser.ts` để phân tách từng câu hỏi và đáp án dựa trên các format phổ biến ("Câu 1:", "A.", "B.").
- **Tuỳ chỉnh Chế độ hiển thị:** Giảng viên có thể chọn hiển thị câu hỏi cho học sinh thông qua `QuizDisplayModeSelector.tsx` với 3 chế độ:
  - **Chỉ câu hỏi AI:** Chỉ hiển thị các câu hỏi được sinh tự động từ Video.
  - **Chỉ phiếu bài tập:** Chỉ hiển thị câu hỏi được nhận diện từ phiếu đã upload.
  - **Hiển thị cả hai:** Gộp chung cả hai nguồn.
- **Hỗ trợ Câu hỏi Tự luận (ESSAY):** Giao diện chỉnh sửa câu hỏi (`QuizEditor.tsx`) đã bổ sung badge hiển thị phân loại, cho phép giảng viên linh hoạt chuyển đổi giữa Tự luận (không đáp án cụ thể) và Trắc nghiệm.

### 2. Dành cho Học viên (Sinh viên)

- **Làm bài tập Tự luận:** Giao diện ôn tập (`QuizPlayer.tsx`) đã hỗ trợ sinh viên làm bài tự luận theo 2 cách:
  1. Trình bày đáp án trực tiếp trong ô **text area**.
  2. Đính kèm **ảnh chụp hoặc file PDF** chứa lời giải (hệ thống tự động upload lên Storage an toàn).
- **Trải nghiệm nhất quán:** Mọi câu hỏi từ AI Video, upload phiếu hay nhập thủ công đều được sắp xếp và thống kê điểm số một cách thống nhất.

## ⚙️ Architecture / Technical Details

- **Database (`schema.prisma`):** Thêm Enum `QuizSource` và `QuizDisplayMode`. Mở rộng bảng `Question` với `contentImageUrl`, bổ sung logic lưu file đính kèm câu trả lời của sinh viên trong bảng `Submission`.
- **Cơ chế parser:** Hệ thống OCR được chạy dưới nền bằng `tesseract.js` trên Nodejs Environment cho ảnh, và `pdf-parse` cho PDF, bảo đảm độ trễ chấp nhận được.
- **Thống kê:** Điểm của bài thi (`student-quiz.ts`) giờ đây được tính dựa trên số câu trắc nghiệm đúng, giúp giảng viên có thể xem riêng bài nộp tự luận để đánh giá thủ công sau.

> [!TIP]
> Bạn có thể vào phần chỉnh sửa bài học của một khóa học bất kỳ, chọn tab **Cài đặt Video** hoặc **Quiz AI** (hiện dùng chung `QuizEditor`) để xem giao diện mới.
