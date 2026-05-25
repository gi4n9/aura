# Tính năng Thanh toán Gộp (Bundle Checkout)

Hệ thống đã được cập nhật để hỗ trợ hiển thị giá tiền và thanh toán nhiều khóa học cùng lúc trong quá trình lên lịch.

## Các thay đổi chính

### 1. Nâng cấp Database (Bảng `Purchase`)
- Bảng lịch sử mua hàng (`Purchase`) đã được thay đổi để hỗ trợ đơn hàng dạng **Bundle**. Thay vì chỉ chứa 1 `courseId`, giờ đây nó lưu trữ được mảng `bundleCourseIds` và cờ `isBundle`.

### 2. Giao diện (UI) Trực quan hơn
- Khi load các khóa học trong lộ trình, mỗi khóa học sẽ được hiển thị các nhãn trạng thái rõ ràng:
  - **Miễn phí** (Màu xanh)
  - **Đã sở hữu** (Màu tím)
  - **Giá tiền** (Màu vàng, VD: 500.000 đ)

### 3. Logic Thanh toán Linh hoạt
- Khi người dùng nhấn **Tạo Lộ Trình Ngay**:
  - Nếu bạn đã sở hữu tất cả các khóa hoặc tất cả là Miễn phí $\rightarrow$ Hệ thống tự động tạo Lịch học như bình thường và vọt vào Dashboard.
  - Nếu có khóa học trả phí **chưa mua** $\rightarrow$ Hệ thống hiện lên một Modal (Bảng thông báo) tổng hợp giá tiền.
- Tại Modal thanh toán:
  - **Thanh toán ngay bằng MoMo:** Gọi hàm gom nhóm giá (`purchaseBundle`) và chuyển hướng sang MoMo. Sau khi thanh toán thành công, MoMo sẽ gọi API IPN và Return để lưu trạng thái Mua Thành Công (Enrollment) và đẩy bạn về trang Tạo Lịch Học để làm nốt thao tác "Lên lịch".
  - **Bỏ qua khóa trả phí:** Nếu bạn chưa muốn mua, hệ thống sẽ gạch các khóa trả phí ra khỏi Lịch Học đợt này, và chỉ đăng ký phần "Miễn phí" hoặc "Đã mua" rồi cho bạn vào Dashboard.
