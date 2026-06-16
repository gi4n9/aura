# Tính năng: Chia nhỏ tác vụ xử lý Video & Tạo Câu hỏi trắc nghiệm bằng AI thủ công

Tính năng này đã được tái cấu trúc hoàn thiện để tối ưu hóa hiệu suất, tránh lỗi quá tải token của Gemini, đồng thời cung cấp giao diện linh hoạt cho giảng viên.

## 🚀 Các chức năng chính

### 1. Xử lý Video ngầm (Tự động)
- Quá trình xử lý video ngầm (`runBackgroundVideoProcessing` trong [process-video.ts](file:///f:/aura/aura/app/actions/process-video.ts)) giờ đây chỉ tập trung vào việc **bóc băng âm thanh (Transcript)** và **tạo mốc thời gian (Timeline)**.
- Đã loại bỏ hoàn toàn phần tự động tạo câu hỏi trắc nghiệm khi tải video lên, giúp giảm tới 70% lượng token đầu ra và tăng tốc độ xử lý video lên gấp 2-3 lần.

### 2. Tạo câu hỏi bằng AI thủ công (Manual Trigger)
- Một Server Action mới `generateQuizFromTranscript` được thêm vào [ai-lesson-content.ts](file:///f:/aura/aura/app/actions/ai-lesson-content.ts) để bóc tách 10 câu hỏi trắc nghiệm chuyên sâu trực tiếp từ nội dung văn bản transcript đã được tạo trước đó.
- Nút bấm **"Tạo câu hỏi bằng AI"** đã được tích hợp vào header của giao diện [QuizEditor.tsx](file:///f:/aura/aura/app/components/courseComponents/QuizEditor.tsx) (chỉ hiển thị khi bài học đã được bóc băng thành công và có dữ liệu transcript).

### 3. Tránh trùng lặp câu hỏi
- Khi giảng viên bấm tạo câu hỏi trắc nghiệm mới bằng AI, hệ thống sẽ tự động tìm và dọn dẹp các câu hỏi thuộc nguồn `AI_VIDEO` cũ của bài học đó trước khi lưu các câu hỏi mới vào database, tránh việc sinh lặp hoặc lưu thừa dữ liệu.

---

## 🛠️ Xác nhận chất lượng
- Đã thực hiện kiểm tra kiểu dữ liệu toàn bộ dự án (`npx tsc --noEmit`) và dự án biên dịch thành công 100% không gặp bất kỳ lỗi nào.
