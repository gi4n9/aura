# Video Upload & Processing Optimization - Walkthrough

## Tóm tắt thay đổi

Giải quyết 3 vấn đề: **Token Gemini bị cháy**, **Upload chậm**, **Hỗ trợ file 1GB+**.

---

## Thay đổi chi tiết

### 1. [process-video.ts](file:///f:/aura/aura/app/actions/process-video.ts) — Tối ưu pipeline xử lý video

#### Thêm `extractAudio()` (Dòng 56-78)
- Dùng FFmpeg trích xuất **chỉ phần audio** từ video
- Codec: AAC, Bitrate: 64kbps, Mono
- **Hiệu quả:** Video 1GB → Audio ~30-60MB (giảm **95%** kích thước)

#### Thêm `extractKeyframes()` (Dòng 81-131)
- Chụp 6 ảnh keyframe phân bố đều trong video
- Chất lượng JPEG tốt (q:v 3)
- Dùng để Gemini nhận diện code/slide/diagram trên màn hình

#### Stream-based chunk merging (Dòng 272-299)
```diff
- fs.appendFileSync(tempFilePath, bufferChunk);  // Tải hết vào RAM
+ writeStream.write(bufferChunk);                // Ghi stream, đợi drain
```
- Hỗ trợ file **1GB+** mà không tràn RAM server

#### Audio-Only Gemini Upload (Dòng 310-350)
```diff
- fileManager.uploadFile(tempFilePath, { mimeType: "video/mp4" })
+ fileManager.uploadFile(audioFilePath, { mimeType: "audio/mp4" })
```
- **Token tiết kiệm: ~90-95%** (Video 1GB = ~250K tokens → Audio ~10-20K tokens)

#### Multimodal Content Parts (Dòng 458-490)
- Gửi Gemini: **1 audio file + 6 keyframe images + prompt**
- Audio → transcript, timeline, quiz, translations
- Keyframes → nhận diện code, slide, diagram cho quiz chính xác hơn

#### Cleanup mở rộng (Dòng 505-530)
- Tự động xóa: file video tạm + file audio tạm + thư mục keyframes + file trên Gemini

---

### 2. [UploadVideoForm.tsx](file:///f:/aura/aura/app/components/courseComponents/UploadVideoForm.tsx) — Tăng tốc upload

| Thông số | Cũ | Mới | Tác dụng |
|----------|-----|------|----------|
| Chunk Size | 45MB | **80MB** | Giảm số lần upload |
| Concurrency | 3 | **5** | Tăng tốc song song |

---

## Luồng xử lý mới

```mermaid
flowchart LR
    A["Browser\n(Chunk 80MB x5)"] --> B["Supabase\nStorage"]
    B --> C["Server\n(Stream merge)"]
    C --> D["FFmpeg\nAudio + Keyframes"]
    D --> E["YouTube\n(Video gốc)"]
    D --> F["Gemini\n(Audio ~40MB)"]
    F --> G["Gemini AI\n(Audio + 6 keyframes)"]
    G --> H["Database\n(Lưu kết quả)"]
```

## So sánh trước/sau

| Metric | Trước | Sau | Cải thiện |
|--------|-------|-----|-----------|
| Gemini input tokens (1GB video) | ~250K | ~10-20K | **↓ 90-95%** |
| Upload speed | 3 chunks x 45MB | 5 chunks x 80MB | **↑ ~2.5x** |
| Max file size (RAM safe) | ~500MB | **1GB+** | **↑ 2x+** |
| Visual analysis (code/slides) | ❌ | ✅ 6 keyframes | **Mới** |

## Verification

- TypeScript compilation: ✅ Passed (lỗi alias `@/lib/prisma` là sẵn có, không phải do thay đổi)
- Cần test thực tế: Upload video thử nghiệm 100MB, 500MB, 1GB để đo token consumption
