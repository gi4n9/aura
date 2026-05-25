# Cập nhật Onboarding: Chọn Danh mục Động (2 Bước)

Tính năng Onboarding đã được nâng cấp đáng kể để trở nên linh hoạt và trực quan hơn. Toàn bộ danh sách lĩnh vực giờ đây được lấy trực tiếp từ Database thay vì code cứng (hardcode).

## Các thay đổi chính

### 1. Quy trình Phỏng vấn 2 Bước (2-Step Interview)
Thay vì hiển thị một mớ lộn xộn các khóa học và chủ đề, hệ thống giờ đây điều hướng người dùng qua 2 bước rõ ràng:
- **Bước 1 (Chọn Nhóm ngành):** Hệ thống hiển thị các Parent Category (VD: Lập trình & CNTT, Ngoại ngữ, Kinh doanh...).
- **Bước 2 (Chọn Sở thích chi tiết):** Sau khi click vào Nhóm ngành, hệ thống chỉ hiển thị các Child Category thuộc nhóm đó (VD: Frontend, Backend, AI...). Ở bước này, User có thể chọn nhiều thẻ cùng lúc và ấn "Tạo lộ trình".

### 2. Dữ liệu Động (Dynamic Data & Icons)
- Tích hợp Server Action `getOnboardingCategories()` gọi tới Prisma `db.category.findMany` (kèm quan hệ `children`).
- Hệ thống Icon được xử lý thông minh: Trường `icon` dạng chữ trong Database (như "terminal", "globe") được một hàm Helper ở Frontend ánh xạ tự động sang các Component biểu tượng sinh động của thư viện Lucide React.
- Màu sắc rực rỡ (Vibrant Colors) tự động thay đổi tuỳ vào vị trí của Category, tạo giao diện rất trẻ trung và thu hút.

## Trải nghiệm người dùng
> [!NOTE]
> Bạn có thể kiểm chứng tính linh hoạt của hệ thống bằng cách tự vào Database (Prisma Studio) và tạo thêm một Parent Category mới, hoặc đổi tên một Child Category bất kỳ. Sau đó, ra ngoài web tải lại trang `/onboarding` và mọi thứ sẽ lập tức thay đổi theo mà không cần phải can thiệp vào code một dòng nào!
