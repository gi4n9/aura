# Implementation Plan - Toaster Notifications & Google OAuth Login

Tích hợp thông báo Toast (Sonner) khi người dùng Đăng nhập / Đăng ký thành công hoặc thất bại, đồng thời xây dựng tính năng Đăng nhập bằng Google qua Supabase OAuth.

## Proposed Changes

### 1. Toast Notifications (Sonner)
Cập nhật các thành phần giao diện đăng nhập và đăng ký để hiển thị thông báo Toast đẹp mắt, trực quan khi thao tác.

#### [MODIFY] [LoginModal.tsx](file:///f:/aura/aura/app/components/auth/LoginModal.tsx)
- Import `toast` từ `sonner`.
- Tích hợp `toast.success` khi đăng nhập thành công.
- Tích hợp `toast.error` khi đăng nhập thất bại.
- Xử lý sự kiện bấm nút "Google" để gọi hàm đăng nhập Google OAuth qua Supabase Client (`createClient().auth.signInWithOAuth`).

#### [MODIFY] [RegisterModal.tsx](file:///f:/aura/aura/app/components/auth/RegisterModal.tsx)
- Import `toast` từ `sonner`.
- Tích hợp `toast.success` khi đăng ký thành công.
- Tích hợp `toast.error` khi đăng ký thất bại hoặc mật khẩu không khớp.
- Xử lý sự kiện bấm nút "Google" đăng ký nhanh.

#### [MODIFY] [Header.tsx](file:///f:/aura/aura/app/components/layout/Header.tsx) & [DashboardSidebar.tsx](file:///f:/aura/aura/app/components/DashboardSidebar.tsx)
- Bổ sung `toast.success("Đã đăng xuất thành công")` khi người dùng bấm Đăng xuất.

---

### 2. Google OAuth Integration & Profile Auto-Creation
Tích hợp luồng xác thực Google OAuth kết hợp với tự động tạo Profile trong cơ sở dữ liệu Prisma nếu là tài khoản mới.

#### [MODIFY] [route.ts](file:///f:/aura/aura/app/auth/callback/route.ts)
- Bổ sung logic kiểm tra và tự động khởi tạo bản ghi `Profile` trong PostgreSQL (Prisma) đối với người dùng lần đầu đăng nhập bằng Google OAuth.
- Redirect người dùng về trang chủ hoặc trang mong muốn sau khi OAuth thành công.

---

## Verification Plan

### Manual Verification
1. **Kiểm tra Toast Notification**:
   - Thử đăng nhập sai mật khẩu $\rightarrow$ Kiểm tra xem Toast đỏ cảnh báo lỗi có xuất hiện ở góc trên màn hình.
   - Thử đăng nhập thành công $\rightarrow$ Kiểm tra Toast xanh "Đăng nhập thành công" xuất hiện và modal tự đóng.
   - Thử đăng ký tài khoản mới $\rightarrow$ Kiểm tra Toast thông báo đăng ký thành công.
   - Thử đăng xuất $\rightarrow$ Kiểm tra Toast "Đã đăng xuất".

2. **Kiểm tra Google OAuth**:
   - Bấm vào nút "Google" trên LoginModal / RegisterModal.
   - Kiểm tra xem trình duyệt có chuyển hướng đến trang chọn tài khoản Google của Supabase hay không.
   - Đăng nhập tài khoản Google $\rightarrow$ Xác nhận tự động quay về trang chủ và hệ thống ghi nhận Profile mới.
