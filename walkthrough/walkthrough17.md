# Walkthrough — Trợ Lý Ảo 3D Jarvis RAG

Tôi đã triển khai hoàn tất tính năng **Trợ lý ảo 3D Jarvis** tích hợp tìm kiếm ngữ nghĩa RAG nâng cao và chuyển đổi văn bản thành giọng nói (Edge TTS) hoàn toàn miễn phí, hỗ trợ tiếng Việt.

---

## 🛠️ Các thay đổi đã thực hiện

### 1. Database Schema
- **[MODIFY] [schema.prisma](file:///f:/aura/aura/prisma/schema.prisma)**:
  - Cập nhật trường `contentType` và `lectureScript` vào model `Lesson` để phân nhánh bài học.
  - Thêm enum `LessonContentType`, `ScriptStatus` và hai model `LectureScript`, `LectureSegment` phục vụ cho cả tính năng sinh slide bài giảng & cấu hình giọng Jarvis sau này.

### 2. Backend & API Services
- **[NEW] [tts-speak.ts](file:///f:/aura/aura/app/actions/tts-speak.ts)**:
  - Sử dụng thư viện `msedge-tts` (không cần API key, free 100%, chất lượng Azure Neural TTS).
  - Tự động chuyển đổi văn bản sang audio MP3 tiếng Việt (mặc định giọng nữ Hoài Mỹ `vi-VN-HoaiMyNeural` hoặc nam Nam Minh `vi-VN-NamMinhNeural`).
  - Lưu file audio trực tiếp vào Supabase Storage bucket `lecture-audio`.
- **[MODIFY] [video-chat.ts](file:///f:/aura/aura/app/actions/video-chat.ts)**:
  - Thêm action `chatWithVideo3D` để thực hiện RAG pipeline.
  - Cập nhật prompt chống ảo giác nghiêm ngặt và tính toán độ tin cậy của thông tin (`maxSimilarity < 0.45` sẽ cảnh báo).
- **[NEW] [jarvis-warmup](file:///f:/aura/aura/app/api/chat/jarvis-warmup/route.ts)**:
  - Endpoint phân tích transcript của bài học bằng Gemini, sinh ra **Socratic Greeting** chào mừng chủ động kèm câu hỏi gợi mở, và **3 câu hỏi gợi ý cụ thể** theo sát bài học.
- **[NEW] [video-3d](file:///f:/aura/aura/app/api/chat/video-3d/route.ts)**:
  - Điểm tiếp nhận câu hỏi của sinh viên. Thực hiện đồng thời: RAG tìm câu trả lời -> Gemini sinh câu trả lời -> chuyển đổi sang audio bằng Edge TTS -> trả về client.

### 3. Frontend & 3D Visualizer Components
- **[NEW] [AuraAvatar3D.tsx](file:///f:/aura/aura/app/components/ai/AuraAvatar3D.tsx)**:
  - Render khối cầu core Jarvis 3D Hologram pulsing tuyệt đẹp bằng React Three Fiber.
  - Sử dụng Web Audio API Analyser để phát hiện tần số âm thanh từ link audio MP3, từ đó co giãn và nhấp nháy khối cầu 3D đồng bộ theo giọng nói (Lip-sync emulation).
- **[NEW] [JarvisAssistant.tsx](file:///f:/aura/aura/app/components/ai/JarvisAssistant.tsx)**:
  - Giao diện Jarvis Assistant: Tải warmup suggestions tránh hội chứng "trang giấy trắng", hiển thị Jarvis Core 3D, chat history và các nút shortcut ôn tập nhanh (Mindmap, Flashcards, Quiz).
- **[MODIFY] [LessonLayout.tsx](file:///f:/aura/aura/app/(learning)/courses/[courseId]/lessons/LessonLayout.tsx)**:
  - Thay thế component chat cũ bằng `JarvisAssistant`, truyền hàm chuyển tab `onOpenTab={setActiveTab}` để người dùng click trực tiếp từ chat sang tab Mindmap/Flashcard/Quiz.

---

## 📊 Kết quả kiểm thử & Nghiệm thu

1. **Biên dịch**: Ứng dụng Next.js build hoàn thành thành công (`✓ Compiled successfully in 46s`) không gặp bất kỳ lỗi TypeScript hay compile nào.
2. **Edge TTS & Audio**: Thư viện `msedge-tts` hoạt động ổn định, tải và lưu file MP3 mượt mà lên Supabase Storage.
3. **Cơ chế Socratic & RAG**: Đã kiểm thử prompt chống ảo giác và sinh câu hỏi động thành công, giúp Jarvis chủ động dẫn dắt cuộc trò chuyện thay vì chờ đợi học sinh.
