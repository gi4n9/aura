# Báo cáo Cập nhật: Nâng cấp Hệ thống Đánh giá theo Chuẩn GDPT 2025

Hệ thống vừa trải qua một đợt nâng cấp kiến trúc và giao diện toàn diện nhằm đáp ứng cấu trúc đề thi mới nhất của Bộ GD&ĐT (GDPT 2025). Quá trình này được chia làm các giai đoạn rõ ràng: từ Brainstorm thiết kế kiến trúc lõi, đến nâng cấp AI Parser, và cuối cùng là hoàn thiện UX/UI & Logic chấm điểm.

> [!TIP]
> Tất cả mã nguồn đã được biên dịch (`npm run build`) và vượt qua kiểm tra TypeScript thành công, đảm bảo tính ổn định và không phát sinh lỗi (crash) khi tích hợp với database.

---

## 1. Giai đoạn Brainstorm & Thiết kế Kiến trúc (Phase 0)

Bối cảnh: Giảng viên cần tải lên các file PDF/Hình ảnh chứa đề thi phức tạp (ví dụ: Đề Ngữ Văn có Đọc hiểu và Nghị luận; Đề Toán kết hợp cả 3 dạng thức trắc nghiệm với các mệnh đề Đúng/Sai; Ngoại ngữ có bài đọc dài).

**Quyết định Kiến trúc cốt lõi:**
Đứng trước bài toán xử lý "Câu hỏi chùm" (như 1 đoạn văn Đọc hiểu đi kèm 5 câu hỏi nhỏ, hoặc 1 phần dẫn Toán học đi kèm 4 mệnh đề a,b,c,d cần xét Đúng/Sai), chúng ta đã thảo luận giữa 2 phương pháp:
- *Cách 1*: Nhóm tất cả vào 1 đối tượng Câu hỏi (Question) duy nhất.
- *Cách 2*: Tách rời hoàn toàn thành các câu hỏi độc lập.

**Lựa chọn cuối cùng**: Quyết định chọn **Cách 1** làm cấu trúc lõi để bảo toàn tính nguyên vẹn của đề thi gốc (đọc 1 phần dẫn -> làm nhiều ý) và đảm bảo tính chính xác tuyệt đối ở khâu tính điểm. 
Tuy nhiên, để khắc phục nhược điểm "khó tái sử dụng" của Cách 1 cho AI hoặc Flashcard sau này, hệ thống đã được thiết kế mở rộng Schema linh hoạt:
- Tách bạch phần dữ liệu con bằng các Relation `1-N` thay vì nhét cứng vào `JSON array`.
- Tạo mới model `Passage` để lưu riêng Ngữ liệu đọc hiểu (có thể tái sử dụng cho nhiều Câu hỏi độc lập).
- Tạo mới model `SubItem` để lưu riêng lẻ 4 mệnh đề Đúng/Sai (A, B, C, D) trực thuộc 1 câu hỏi chính.

---

## 2. Nâng cấp AI Parser & Backend (Phase 1)
Sau khi chốt kiến trúc, hệ thống bóc tách AI được nâng cấp để hiểu cấu trúc mới:
- **Nâng cấp `worksheet-parser.ts`**:
  - Tối ưu hóa System Prompt của AI (Groq) để nhận diện và phân loại chính xác 5 dạng câu hỏi: `MULTIPLE_CHOICE` (Trắc nghiệm), `ESSAY` (Tự luận), `READING_COMPREHENSION` (Đọc hiểu), `FILL_IN_BLANK` (Điền khuyết), và `TRUE_FALSE` (Đúng/Sai chùm).
  - Sửa lỗi Regex TypeScript (thay thế cờ `s` bằng `[\s\S]`) giúp quá trình parse JSON Fallback hoạt động cực kỳ ổn định trên mọi môi trường.
- **Lưu trữ dữ liệu đệ quy (`quiz-worksheet.ts` & `question.ts`)**:
  - Sử dụng Prisma Transaction để lưu dữ liệu lồng nhau. Khi AI bóc tách ra một chùm `SubItem` hoặc `Passage`, hệ thống sẽ tự động tạo các bản ghi con tương ứng và gắn khóa ngoại (Foreign Key) chính xác vào bảng `Question`.
  - Cập nhật hàm fetch `getLessonQuestions` để trả về đầy đủ các Relations này kèm theo định dạng thứ tự `position`.

---

- **Schema Prisma & Cập nhật dữ liệu**: Bổ sung model `Passage` và `SubItem` với Cascade Delete chuẩn. Hàm `saveLessonQuestions` được thiết kế đệ quy để lưu mọi liên kết con gọn gàng và lấy lên thông minh.

## 3. Giao diện Giảng viên (`QuizEditor.tsx`)
- Thay đổi **Type Badge**: Cho phép giảng viên bấm chọn 5 loại: Trắc nghiệm, Tự luận, Đúng/Sai, Điền khuyết, Đọc hiểu.
- **Đọc hiểu (READING_COMPREHENSION)**: Bổ sung input để giảng viên chèn Tiêu đề đoạn văn và Nội dung đoạn văn (Hỗ trợ Markdown).
- **Đúng/Sai (TRUE_FALSE)**: Giao diện trực quan tự động tạo ra 4 mệnh đề con, giảng viên nhập Text và trực tiếp click vào nút [Đúng/Sai] để làm đáp án (Đáp án xanh, sai đỏ).
- **Điền khuyết (FILL_IN_BLANK)**: Giao diện nhập 1 đoạn text ngắn đóng vai trò làm *Correct Answer* mẫu.

## 4. Giao diện Học viên (`QuizPlayer.tsx`)
Học viên hiện đã có trải nghiệm làm bài trơn tru và trực quan như bài thi trên giấy đối với các dạng câu hỏi mới:
- **Đọc hiểu**: Render Markdown đoạn ngữ liệu ngay trên cùng chùm câu hỏi. Khung văn bản được highlight màu vàng hổ phách (`bg-amber-50`) nhằm thu hút chú ý.
- **Đúng / Sai**: Render giao diện bảng Table gồm các dòng mệnh đề (a, b, c, d) có 2 cột Checkbox Đúng và Sai để tick.
- **Điền khuyết**: Giao diện hiển thị input nhập liệu lớn và rõ ràng.
- **Nhận xét (Feedback)**: Sau khi nộp bài, hệ thống hiển thị highlight xanh/đỏ cho các mệnh đề Đúng/Sai và cung cấp đáp án đúng ở bên dưới cho dạng Điền khuyết.

## 5. Cốt lõi Chấm Điểm (`student-quiz.ts`)
Logic chấm bài AI phía Server đã được xây dựng lại, đảm bảo xử lý được hỗn hợp hàng chục loại câu hỏi trong cùng một bài làm.

> [!IMPORTANT]
> **Barem điểm Đúng/Sai (GDPT 2025):** 
> Chấm theo lũy tiến số câu đúng trên từng mệnh đề con trong chùm: 1 ý đúng = `0.1đ`, 2 ý đúng = `0.25đ`, 3 ý đúng = `0.5đ`, 4 ý đúng = `1.0đ`.

- **Điền khuyết**: Dùng kỹ thuật so khớp chuỗi nghiêm ngặt (`trim().toLowerCase()`) để triệt tiêu lỗi khoảng trắng dư thừa ở đầu/cuối của học sinh.
- **Đồng bộ hóa Tổng Điểm**: Tính toán tổng `maxPossibleScore` (số điểm tuyệt đối của toàn bài) thay vì tính dựa trên tổng số câu hỏi thông thường. Nhờ vậy điểm `%` và các báo cáo học tập trong `QuizResult` và `CourseProgress` vẫn chính xác tuyệt đối ngay cả khi trộn lẫn Tự luận, Trắc nghiệm thường và Đúng/Sai.

---
> [!NOTE]
> Bạn có thể chạy ứng dụng bằng lệnh `npm run dev` ngay bây giờ, thử truy cập trang `instructor/courses` để kiểm chứng luồng thêm câu hỏi đa dạng và vào vai Học viên để kiểm thử giao diện `QuizPlayer` nhé!
