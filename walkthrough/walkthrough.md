# Hoàn thành Tính năng Lộ trình Học tập Tự động (Dynamic Roadmap)

Dưới đây là tóm tắt toàn bộ các thay đổi và công việc đã được thực hiện để mang tính năng Lộ trình cá nhân hóa vào dự án Aura Streaming.

## 1. Kiến trúc Cơ sở dữ liệu (Database Schema)
Tệp `schema.prisma` đã được cập nhật thành công với các thay đổi sau:
- Thêm `RoadmapNodeStatus` (LOCKED, UNLOCKED, COMPLETED, SKIPPED).
- Thêm model `CoursePrerequisite` để tạo sự ràng buộc điều kiện giữa các khóa học (Khóa A phải học trước khóa B).
- Thêm model `UserRoadmap` lưu trữ tổng quan lộ trình của học viên (có `progressPercentage` và `totalCourses`).
- Thêm model `UserRoadmapNode` kết nối trực tiếp lộ trình của học viên với từng `Course` cụ thể.
- **Trạng thái:** Đã push thành công lên cơ sở dữ liệu (`npx prisma db push`).

## 2. Logic Backend (Server Actions)
Đã tạo mới file `app/actions/roadmap.ts` chứa các hàm lõi:
- **`generateRoadmap`**: Nhận danh sách sở thích (interests) của user, query tìm khóa học, duyệt đồ thị phụ thuộc (Dependency Graph) để tìm ra các khóa học bắt buộc đi kèm, sau đó xếp hạng `stageLevel` cho từng khóa học và lưu vào Database.
- **`skipRoadmapNode`**: Xử lý việc user chọn "Bỏ qua" một khóa học trong lộ trình.
- **`updateRoadmapProgress`**: Tính toán lại phần trăm hoàn thành, và quan trọng nhất là tính năng "Auto-Unlock" (Tự động mở khóa các node ở Giai đoạn tiếp theo nếu toàn bộ khóa học ở Giai đoạn hiện tại đã hoàn thành/bỏ qua).

## 3. Giao diện Người dùng (Frontend UI)
Component `app/components/RoadmapView.tsx` đã được refactor hoàn toàn để tương thích với cấu trúc dữ liệu mới:
- **Liên kết thực tế:** Thẻ TimelineCard nay lấy thông tin trực tiếp từ `node.course.title` và bọc trong `<Link>` để click vào là sang thẳng trang chi tiết khóa học.
- **Tùy chỉnh lộ trình:** Thêm nút "Bỏ qua" (SkipForward) trên UI cho các khóa học đang ở trạng thái UNLOCKED, giúp User có thể nhảy cóc nếu đã có kiến thức từ trước.
- **Tối ưu hiển thị:** Tự động đổ màu Track (Frontend, Backend, AI...) dựa theo `category.slug` của khóa học.

> [!TIP]
> **Bước tiếp theo dành cho bạn (Tích hợp vào Page):**
> Trong trang giao diện chính (Ví dụ: `app/(main)/roadmap/page.tsx`), bạn chỉ cần gọi Prisma để lấy dữ liệu Roadmap của user hiện tại, kèm theo quan hệ `nodes` và `course`, sau đó truyền thẳng vào prop `nodes` của `<RoadmapView />`.
```tsx
const roadmap = await prisma.userRoadmap.findUnique({
  where: { userId: currentUser.id },
  include: {
    nodes: {
      include: { course: { include: { category: true } } }
    }
  }
});

return <RoadmapView nodes={roadmap.nodes} title="Lộ trình của bạn" progressPercentage={roadmap.progressPercentage} />;
```
