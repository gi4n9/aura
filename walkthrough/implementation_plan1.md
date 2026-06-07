# Kế Hoạch Triển Khai Upload Video Dung Lượng Lớn (Cơ Chế Chunking Bằng Tay)

Mục tiêu: Xây dựng hệ thống vận chuyển video dung lượng lớn (1GB+) từ máy giảng viên đến YouTube thông qua Supabase (gói Free) mà không bị giới hạn 50MB, đồng thời tối ưu hóa tốc độ và bộ nhớ.

## 1. Phân Tích & Giải Pháp Tối Ưu

### Vấn đề hiện tại:
- Supabase Free Plan giới hạn kích thước upload tối đa là 50MB cho một file, dù dùng chuẩn TUS hay upload thường.
- Node.js backend (Next.js/Vercel) không thể nhận trực tiếp 1GB file vì giới hạn RAM và thời gian timeout.

### Giải pháp (Manual Chunk & Merge):
1. **Frontend (Băm & Vận chuyển):** 
   - Dùng Javascript chia file thành các cục nhỏ `45MB` (Blob).
   - Gửi các cục này lên Supabase Storage với tên như `video_part_0`, `video_part_1`.
   - **Tối ưu tốc độ:** Sẽ áp dụng cơ chế **Concurrent Uploads (Tải lên song song)**. Ví dụ: gửi 3 cục cùng một lúc thay vì gửi từng cục. Điều này tận dụng tối đa băng thông mạng của giảng viên.

2. **Backend (Lắp ghép & Bơm lên YouTube):**
   - Backend nhận thông báo từ Frontend: "Video tên là XYZ, gồm 20 cục".
   - Backend sẽ dùng Stream để tải tuần tự 20 cục này từ Supabase về Server và **Ghi nối tiếp (Append Stream)** trực tiếp vào ổ cứng server.
   - **Tối ưu RAM:** Cách này chỉ tốn vài MB RAM của server cho mỗi chunk thay vì ăn hết 1GB RAM. Chống sập (crash) server hoàn toàn.
   - Sau khi có file 1GB hoàn chỉnh dưới ổ cứng, tiến hành upload YouTube & Gemini bình thường, cuối cùng dọn rác (xóa các cục trên Supabase).

---

## 2. Chi Tiết Các Thay Đổi (Proposed Changes)

### [MODIFY] `app/components/courseComponents/UploadVideoForm.tsx`
- Gỡ bỏ thư viện `tus-js-client`.
- Thay bằng thuật toán băm file `file.slice()`.
- Chạy vòng lặp upload lên Supabase theo cơ chế Batch (3 requests/lần).
- Xử lý tiến trình % dựa trên số chunk đã upload thành công.
- Đổi dữ liệu gửi xuống Server Action: thay vì gửi URL 1 file, sẽ gửi `baseFileName` và `totalChunks`.

### [MODIFY] `app/actions/process-video.ts`
- Sửa hàm `processVideoUpload` để nhận `totalChunks`.
- Viết hàm `downloadAndMergeChunks()` sử dụng `fs.createWriteStream({ flags: 'a' })` để tải và nối các chunk.
- Thêm vòng lặp xóa toàn bộ các chunk tạm trên Supabase sau khi ghép xong (Cleanup).

---

## 3. Đánh Giá Hiệu Suất Thực Tế (Performance & Speed)

- **Tốc độ Upload (Frontend -> Supabase):** 
  - Một file 1GB chia thành 22 cục (45MB). 
  - Nếu tải lên song song 3 cục, với mạng cáp quang thông thường (băng thông ~100Mbps = 12.5MB/s), sẽ mất khoảng **1.5 phút** để tải xong toàn bộ.
- **Tốc độ Lắp ghép (Supabase -> Backend Server):**
  - Giữa các server với nhau, băng thông thường lên tới hàng Gigabit. Việc tải và ghép 22 cục 45MB chỉ mất **dưới 5 giây**.
- **Tốc độ Xử lý AI & YouTube:** (Tương tự như hiện tại).
- **RAM Server:** Ổn định ở mức thấp (< 50MB), cực kỳ an toàn để deploy lên Vercel/VPS.

---

## User Review Required

> [!IMPORTANT]
> **Câu hỏi cho bạn:**
> Giải pháp băm file bằng tay này sẽ đòi hỏi thay đổi cả giao diện Upload lẫn logic xử lý ở Backend. Cách này giải quyết dứt điểm giới hạn 50MB của Supabase Free. 
> 
> Bạn có đồng ý với phương án Băm file song song (Frontend) và Ghép nối Stream (Backend) này không để tôi tiến hành sửa code ngay?
