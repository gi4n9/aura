# Tóm tắt kiến trúc Upload Video Dung lượng lớn (Manual Chunking)

Tôi đã thiết kế lại hoàn toàn luồng xử lý video để tương thích hoàn hảo với gói Free của Supabase, cho phép giảng viên upload video hàng GB mà không lo lỗi giới hạn mạng hay tràn RAM.

## 1. Frontend: Băm nhỏ & Tải lên song song
* **Thuật toán:** Khi giảng viên chọn file, trình duyệt sẽ tự động cắt file ra thành các đoạn `45MB` bằng hàm `file.slice()`.
* **Hiệu suất:** Tải lên theo **Batch (3 chunk cùng lúc)**. Việc này tận dụng tối đa băng thông đường truyền mạng cáp quang mà không làm nghẽn kết nối.
* **Giao diện (UI):** Hệ thống tính toán tiến độ dựa trên số đoạn đã upload xong (ví dụ: `Đang tải lên... 45.45% (10/22)`).

## 2. Backend: Tải về, Lắp ghép & Tối ưu RAM
* **Cơ chế ghép file:** Backend tải từng cục 45MB từ Supabase về. Thay vì ném tất cả vào RAM (gây crash máy chủ ngay lập tức), tôi đã dùng **File System Streams (`fs.createWriteStream` kết hợp `flags: 'a'`)** để "dán" từng đoạn trực tiếp vào một file tạm trên ổ cứng. Nhờ vậy, server chỉ tốn đúng vài MB RAM bất kể video dài bao lâu.
* **Tối ưu Youtube Upload:** Khi đẩy lên YouTube, thay vì đọc cả cục 1GB vào buffer, tôi tiếp tục dùng cơ chế **Stream (`fs.createReadStream`)** để truyền từng dòng dữ liệu từ ổ cứng thẳng lên YouTube.
* **Dọn dẹp tự động (Cleanup):** Sau khi hoàn tất (hoặc nếu có lỗi), Server sẽ quét qua Supabase và xóa toàn bộ các "cục rác" (chunks tạm thời) đã tạo ra trong quá trình truyền file, giữ cho ổ đĩa của bạn luôn sạch sẽ.

## Kết luận
Kiến trúc này giống y hệt như việc tháo rời một món đồ nội thất khổng lồ để nhét vừa qua cửa (Supabase Free Limit), sau đó lắp lại hoàn chỉnh ở trong nhà (Backend Server) rồi mang vào phòng khách trưng bày (YouTube).

Hệ thống của bạn bây giờ đã "miễn nhiễm" với các lỗi giới hạn 50MB và rất sẵn sàng để vận hành với những video dài 2 tiếng!
