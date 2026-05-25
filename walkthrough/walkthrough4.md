# Tính năng Thanh toán Gộp (Bundle Checkout) & Tự động Lên Lịch Học

Hệ thống đã được cập nhật để đem lại trải nghiệm hoàn toàn liền mạch từ lúc lập kế hoạch, thanh toán, đến lúc tự động chia lịch học.

## Các thay đổi chính

### 1. Nâng cấp Database (Bảng `Purchase`)
- Bảng lịch sử mua hàng (`Purchase`) đã được thay đổi để hỗ trợ đơn hàng dạng **Bundle**. Tức là giờ đây nó lưu trữ được mảng `bundleCourseIds` và cờ `isBundle`.

### 2. Lưu trữ cấu hình tạm thời thông minh
- Khi bạn nhấn **Thanh toán ngay bằng MoMo**, toàn bộ thông số bạn chọn (Số ngày rảnh, Số phút học mỗi ngày, Các khóa học miễn phí đi kèm...) sẽ được lưu tạm vào Database (`Profile.learningPath`) ngay trước khi bạn bị chuyển hướng sang Momo.
- Việc này giúp hệ thống "nhớ" được toàn bộ cấu hình phức tạp mà không cần phải can thiệp cấu trúc bảng.

### 3. Tự động xử lý sau khi thanh toán
- Sau khi bạn thanh toán thành công, MoMo sẽ báo tin về máy chủ Aura.
- Ngay lập tức, Aura sẽ lấy "cấu hình Lịch học tạm thời" lúc nãy ra.
- Hệ thống tự động tạo **Study Schedule**, xếp lịch từng bài học (Lesson) vào từng ngày, đồng thời mở khóa các khóa học (Enroll).
- Cuối cùng, nó sẽ tự động xóa bản sao lưu cấu hình tạm, và **chuyển hướng thẳng bạn về trang Dashboard (`/onboarding`)**. Ở đó, lịch học của bạn đã sẵn sàng!

## Tóm tắt luồng

Trải nghiệm hiện tại của bạn sẽ là: 
1. Chọn Khóa Miễn phí + Có phí 
2. Thiết lập Lịch $\rightarrow$ Thanh toán qua MoMo 
3. Thanh toán xong $\rightarrow$ 💥 BÙM 💥 Lịch học đã lên xong hoàn chỉnh trên Dashboard!
