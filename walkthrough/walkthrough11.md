# Quy trình tích hợp Groq cho Đề thi (Worksheet Parser) & Bảng Đáp án

Chúng ta đã chuyển đổi hoàn toàn các tính năng nhận diện câu hỏi từ đề thi (hình ảnh/PDF) và bảng đáp án (hình ảnh/Excel) từ **Gemini** sang **Groq** nhằm nâng cao độ chính xác, đặc biệt là nhận diện đáp án khoanh tròn/gạch chân và mã đề thi.

## 🚀 Các thay đổi chính trong [worksheet-parser.ts](file:///f:/aura/aura/lib/worksheet-parser.ts)

### 1. Phân tích đề thi (PDF & Hình ảnh)
- **Hàm đơn lẻ `parseQuestionsFromFile`**:
  - Đối với file **PDF**: Trích xuất text offline trước (`extractTextFromPDF`), sau đó gửi dữ liệu text này tới Groq **Llama 3.3 70B** (`llama-3.3-70b-versatile`). Phương pháp này chính xác hơn nhiều so với việc upload file PDF trực tiếp lên Gemini vì Llama 3.3 70B có khả năng suy luận logic và đọc hiểu văn bản tiếng Việt cực tốt.
  - Đối với file **Hình ảnh**: Encode file sang dạng base64 và gửi trực tiếp tới Groq **Llama 3.2 Vision** (`llama-3.2-11b-vision-preview`). Điều này giúp AI đọc được trực tiếp cấu trúc đề, các câu hỏi và các đáp án được khoanh tròn/gạch chân.
- **Hàm gộp trang đề thi `parseQuestionsFromFilesBatch`**:
  - Gộp trang PDF bằng cách trích xuất text offline và nối lại trước khi gửi tới Groq Llama 3.3.
  - Gộp trang hình ảnh bằng cách gửi danh sách các ảnh dạng base64 dưới dạng mảng `image_url` trực tiếp đến Groq Llama 3.2 Vision để phân tích và gộp câu hỏi liên trang chính xác.

### 2. Đọc bảng đáp án (Hình ảnh & Excel CSV)
- **Hàm `parseAnswerKeyFromImage`**: Sử dụng Groq **Llama 3.2 Vision** gửi kèm base64 hình ảnh để phân tích và nhận dạng đáp án chính xác theo Mã đề thi được chỉ định.
- **Hàm `parseAnswerKeyFromExcel`**: Đọc dữ liệu CSV từ Excel và gửi tới Groq **Llama 3.3 70B** để trích xuất bảng đáp án của Mã đề thi tương ứng thành dạng JSON chuẩn.

---

## 🛠️ Kết quả Xác thực
- **TypeScript Compiler Check**: Dự án được biên dịch kiểm tra kiểu thông qua lệnh `npx tsc --noEmit` và đã thành công 100% không gặp bất kỳ lỗi biên dịch nào.
