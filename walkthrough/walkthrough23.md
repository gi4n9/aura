# Walkthrough: Gamification, Profile Customization, Leaderboard, Streaks & Q&A Forum

Toàn bộ các tính năng **Gamification Hồ sơ Cá nhân**, **Bảng Xếp Hạng (Leaderboard)**, **Chuỗi Ngày Học (Streaks)** và **Diễn Đàn Hỏi Đáp (Q&A)** đã được thiết kế và triển khai hoàn chỉnh theo đúng tiêu chuẩn giao diện tối giản (Minimalist Aesthetics) của Aura.

---

## 🚀 Các Tính Năng Đã Triển Khai

### 1. Tự Động Tính Streak & Cộng XP Khi Học Bài
- **Logic tự động**: Khi học viên hoàn thành bài học (xem video `>=90%` hoặc nộp bài test/quiz), hệ thống tự động:
  - Cộng **+100 XP**.
  - Tính toán và cộng **+1 ngày Streak** (nếu là học viên học liên tục các ngày).
  - Tự động kiểm tra điểm XP để thăng cấp (**Level Up**) và giải phóng phần thưởng giao diện tương ứng.

### 2. Hồ Sơ Cá Nhân Gamification (`/profile`)
- **Card Cấp Độ & Progress Bar (`LevelProgressCard.tsx`)**:
  - Badge hiển thị Cấp độ (Level 1..20+), Danh hiệu hiện tại, Ngọn lửa Streak 🔥 và Thanh tiến trình XP đến Cấp tiếp theo.
- **Bộ Tùy Chỉnh Giao Diện (`ProfileCustomizer.tsx`)**:
  - **Live Preview**: Xem trước thẻ Profile cá nhân rực rỡ với Khung Avatar, Banner nền và Danh hiệu đã chọn.
  - **Khung Avatar (Avatar Frames)**: Đồng Ánh Kim (Lv 2), Bạc Tinh Anh (Lv 5), Vàng Hoàng Gia (Lv 10), Bạch Kim Khiên Phổ (Lv 15), Vũ Trụ Aura (Lv 20).
  - **Banner Nền Profile**: Rừng Ngọc Bích, Onyx Bí Ẩn, Hoàng Gia Hoàng Kim, Tinh Vân Tinh Tú, Cyber Neon.
  - **Danh hiệu (Titles)**: Tân binh Aura, Học viên Chăm chỉ, Thấu học sinh, Cao thủ Tri thức, Huyền thoại Aura.

### 3. Bảng Xếp Hạng Top XP (`/community?tab=leaderboard`)
- **Podium Top 1 - 2 - 3 Vinh Quang**: Khung thiết kế Quán quân với Vương miện Vàng 👑, Bạc 🥈, Đồng 🥉.
- Hiển thị Khung Avatar tùy chỉnh, Cấp độ, Điểm XP, Danh hiệu và Chuỗi Streak ngọn lửa của từng học viên.
- **Top 4 - 50**: Danh sách thứ hạng chi tiết.
- **Sticky Banner Cá nhân**: Ghim vị trí của người dùng đang đăng nhập bên dưới cùng màn hình.

### 4. Bảng Chuỗi Ngày Học (`/community?tab=streaks`)
- Bảng theo dõi 7 ngày trong tuần (T2 - CN) điểm danh với biểu tượng ngọn lửa 🔥 rực rỡ.
- Thống kê Streak hiện tại, Streak kỷ lục và quy tắc nhận thưởng +50 XP duy trì ngọn lửa daily.

### 5. Diễn Đàn Hỏi Đáp (`/community?tab=qa`)
- **Bộ lọc Trạng thái**: Tất cả / Chưa giải quyết / Đã giải quyết.
- **Tạo câu hỏi mới**: Modal đặt câu hỏi với tiêu đề và mô tả chi tiết.
- **Upvote & Thảo luận**: Tương tác câu trả lời, người đăng có thể bấm "Đánh dấu câu trả lời đúng" (+20 XP cho tác giả câu trả lời).

---

## 🛠️ Các Tệp Đã Thay Đổi & Tạo Mới

1. `prisma/schema.prisma` - Cập nhật `UserStats`, `GroupQuestion`, bổ sung `GroupQuestionAnswer` & `QuestionUpvote`.
2. `lib/gamification.ts` - Thang điểm XP, Level curve và Catalog Khung Avatar, Banner, Danh hiệu.
3. `app/actions/gamification-actions.ts` - Server actions xử lý cộng XP, tính streak, thăng cấp, tùy chỉnh trang trí profile và xếp hạng Leaderboard.
4. `app/actions/qa-actions.ts` - Server actions tạo câu hỏi, xem câu hỏi, gửi câu trả lời, upvote và accept câu trả lời chuẩn.
5. `app/actions/video-progress.ts` - Tích hợp tự động kích hoạt `recordLessonCompletion` khi hoàn thành bài giảng.
6. `app/components/profile/LevelProgressCard.tsx` - Component thẻ Cấp độ & Streak.
7. `app/components/profile/ProfileCustomizer.tsx` - Component tùy chỉnh & xem trước Khung/Banner/Title.
8. `app/(main)/profile/page.tsx` - Tích hợp Gamification vào trang Profile cá nhân.
9. `app/components/community/CommunityTabs.tsx` - Navigation tab bar cho phân hệ Cộng đồng.
10. `app/components/community/LeaderboardView.tsx` - Bảng xếp hạng Top XP & Top 3 Podium.
11. `app/components/community/StreakDashboardView.tsx` - Bảng theo dõi 7 ngày Streak.
12. `app/components/community/QAForumView.tsx` - Giao diện Diễn đàn Hỏi đáp Q&A.
13. `app/components/client/CommunityClient.tsx` - Tích hợp chuyển đổi linh hoạt 4 tabs Cộng đồng.

---

## 🔍 Hướng Dẫn Kiểm Thử

1. **Hồ sơ Cá nhân**:
   - Truy cập `http://localhost:3000/profile` (hoặc mở menu Profile).
   - Kiểm tra hiển thị **Cấp độ (Level)**, **Thanh XP**, **Kỷ lục Streak** và **Trình Trang trí Profile**.
   - Thử bấm đổi Khung Avatar / Banner / Danh hiệu đã mở khóa.

2. **Học bài & Nhận XP tự động**:
   - Truy cập một khóa học và xem video bài giảng (hoặc đánh dấu hoàn thành).
   - Truy cập lại `/profile` để thấy XP tăng lên (+100 XP) và Streak được tích lũy.

3. **Cộng đồng Gamification**:
   - Truy cập `http://localhost:3000/community`.
   - Chuyển qua tab **Bảng Xếp Hạng**: Xem bục vinh quang Top 1-3 và thứ hạng cá nhân với Khung Avatar đã trang bị.
   - Chuyển qua tab **Chuỗi Ngày Học**: Xem lịch check-in 7 ngày trong tuần.
   - Chuyển qua tab **Hỏi Đáp Cộng Đồng**: Đăng câu hỏi mới, trả lời và upvote!
