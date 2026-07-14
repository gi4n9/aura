# 🌟 Cộng Đồng Aura & AI Group Moderator

Dựa theo kế hoạch đã thống nhất, hệ thống Chat của Aura vừa được nâng cấp toàn diện để hỗ trợ Group Chat và tích hợp siêu trợ lý AI `@AuraBot` cùng với tính năng "Smart Catch-up" giúp học viên không bao giờ bị lỡ nhịp.

## Những gì đã thay đổi

### 1. Nâng cấp hạ tầng Group Chat
- Chuyển đổi mô hình `Conversation` hiện tại để hỗ trợ nhóm (thêm trường `isGroup`, `name`, `avatarUrl`, `courseId`).
- Thêm `role` cho thành viên nhóm (Admin, Member, Bot).
- Thêm cờ `isBotResponse`, `sources` và `embedding` vào `DirectMessage` để AI dễ dàng search lại lịch sử chat.

### 2. 🤖 AI Group Moderator (@AuraBot)
Mỗi Group gắn với một khóa học giờ đây có thể triệu hồi trợ lý AI bằng cách tag `@AuraBot`.
- **RAG Pipeline Thông Minh**: Khi được hỏi, Bot sẽ tìm kiếm trong:
  1. Transcript của video bài giảng (`video_embeddings`).
  2. Lịch sử thảo luận trước đó (`DirectMessage` embeddings).
- **Rerank Bằng Groq**: Các đoạn context thô từ Database được gửi tới mô hình `Llama-3.3-70b` (qua **Groq**) siêu tốc để chọn lọc và trích xuất đúng phần liên quan nhất, trước khi đưa cho Gemini viết câu trả lời hoàn chỉnh.
- **Tự động Trích Dẫn Nguồn**: Câu trả lời của bot có kèm timestamp video hoặc báo hiệu lấy từ câu hỏi cũ.
- **Báo Động Giảng Viên**: Nếu bot nhận định độ tin cậy (confidence) của nó < 70%, nó sẽ tự động chèn dòng note nhắc nhở giảng viên hoặc các học viên khác vào giải đáp thêm.
- **Tự động tạo FAQ**: Nếu một câu hỏi tương tự được lặp lại từ 3 lần trở lên, nó sẽ tự lưu vào bảng `CourseFaq`.

### 3. 📋 Smart Catch-up (Tóm tắt khi online)
Giúp học viên đọc lướt hàng trăm tin nhắn chỉ trong vài giây.
- **Cá Nhân Hoá**: Bot biết bạn lần cuối online lúc nào (`lastReadAt`), và hiện đang học tới bài nào trong khoá học.
- **Tạo Tóm Tắt Tức Thì**: Một nút bấm **"Tóm tắt từ lần cuối online"** xuất hiện trong Group Chat. Khi bấm vào, AI sẽ quét toàn bộ tin nhắn bạn chưa đọc và trả về tóm tắt ưu tiên xoay quanh các khái niệm mà bạn đang học.

## Kế Hoạch Tương Lai (Ideas 3 & 4)

Như bạn đã duyệt, tính năng **Smart Peer Matching** và **Collaborative Micro-Challenges** sẽ được phát triển tiếp ở các phase sau. Dưới đây là phác thảo kỹ thuật:

### 🤝 Smart Peer Matching
- **Data Vector**: Tổng hợp điểm số (từ `QuizResult`), thói quen online (từ `StudySchedule`), và mức độ tương tác thành 1 vector profile của học viên.
- **Cosine Distance**: Chạy cron job tìm kiếm những người có vector bù trừ cho nhau (ví dụ: người giỏi phần A + người yếu phần A) hoặc giống nhau (cùng lịch học) để tạo thành các nhóm nhỏ (Study Buddies).

### 🎯 Micro-Challenges (Hoạt Náover)
- Theo dõi cột mốc tiến độ trung bình của nhóm. Khi > 50% học viên đến cùng 1 module, trigger một Edge Function.
- Gọi LLM sinh ra một case-study thực tế hoặc 1 câu đố ngắn và post tự động vào nhóm bằng tài khoản `@AuraBot` để khuấy động phong trào.

## Hướng dẫn Test Tính Năng
1. Vào mục "Tin nhắn", nếu có nhóm (isGroup = true), bạn có thể thử tag `@AuraBot câu hỏi của bạn`.
2. Bấm vào nút **"Tóm tắt từ lần cuối online"** ở góc phải trên (chỗ có các nút gọi/video) để AI quét lịch sử và hiện box tóm tắt màu vàng.
3. Chạy lệnh Prisma `npx prisma db push` để cập nhật database (vì có thêm bảng `CourseFaq`, `ConversationSummary`, và một số field mới). Do có field `vector(3072)`, nếu bạn dùng local database, hãy chắc chắn đã cài extension pgvector nhé.
