"use server";

import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// 1. Cấu hình YouTube (Tự động đăng nhập bằng Refresh Token)
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

// Lưu ý: Nếu Refresh Token trong .env bị sai hoặc hết hạn, bước này sẽ không báo lỗi ngay
// mà sẽ lỗi khi gọi hàm upload.
oauth2Client.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
});

const youtube = google.youtube({ version: "v3", auth: oauth2Client });

// 2. Cấu hình Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const fileManager = new GoogleAIFileManager(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

export async function processVideoUpload(
  videoUrl: string, // Link file tạm trên Supabase
  filePathSupabase: string, // Đường dẫn file trên Supabase (để xóa sau này)
  title: string,
  playlistId: string
) {
  let tempFilePath = ""; // Biến lưu đường dẫn file tạm để xóa nếu lỗi

  try {
    console.log(`🚀 Bắt đầu xử lý: ${title}`);

    // --- BƯỚC A: Tải video từ Supabase về bộ nhớ Server ---
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error("Không thể tải video từ Supabase");

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tạo thư mục tạm nếu chưa có
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    tempFilePath = path.join(tempDir, `${Date.now()}_video.mp4`);
    fs.writeFileSync(tempFilePath, buffer);
    console.log("💾 Đã lưu file tạm trên server.");

    // --- BƯỚC B: Upload lên YouTube ---
    console.log("🎥 Đang đẩy lên YouTube...");

    // Kiểm tra xem Auth có hoạt động không trước khi upload
    try {
      const stream = Readable.from(buffer);
      const ytRes = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: title,
            description: "Bài giảng được upload tự động bởi Aura LMS.",
          },
          status: { privacyStatus: "unlisted" }, // Unlisted: Không công khai
        },
        media: { body: stream },
      });
      var youtubeId = ytRes.data.id; // Dùng var để truy cập được ở bên ngoài try/catch này
      console.log(`✅ Upload YouTube thành công! ID: ${youtubeId}`);
    } catch (ytError: any) {
      console.error("❌ Lỗi YouTube API:", ytError.message);
      throw new Error(
        "Lỗi xác thực YouTube. Vui lòng kiểm tra lại Refresh Token."
      );
    }

    // --- BƯỚC C: Gửi cho Gemini phân tích ---
    console.log("🧠 Đang gửi cho AI phân tích...");
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: title,
    });

    // Polling: Đợi Gemini xử lý video
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === "FAILED") {
      throw new Error("Gemini không đọc được video này (State: FAILED).");
    }

    // Ra lệnh cho AI tạo nội dung
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Bạn là chuyên gia giáo dục. Hãy xem video này và trả về kết quả dưới dạng JSON THUẦN TÚY.
      Cấu trúc JSON bắt buộc:
      {
        "transcript": "Nội dung chi tiết lời giảng...",
        "quiz": [
          {"question": "...", "options": ["A", "B", "C", "D"], "answer": "A"}
        ],
        "mindmap": ["Ý chính 1", "Ý chính 2", "Ý chính 3", "Ý chính 4", "Ý chính 5"]
      }
      Lưu ý: Không thêm markdown, không thêm lời dẫn, chỉ trả về JSON.
    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri,
        },
      },
      { text: prompt },
    ]);

    const aiText = result.response.text();
    console.log("🤖 AI Response Length:", aiText.length);

    // --- XỬ LÝ JSON ROBUST (Chống lỗi cú pháp) ---
    const startIndex = aiText.indexOf("{");
    const endIndex = aiText.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("AI không trả về đúng định dạng JSON.");
    }

    const cleanJson = aiText.substring(startIndex, endIndex + 1);

    let aiData;
    try {
      aiData = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Lỗi:", cleanJson);
      throw new Error("Lỗi parse JSON từ AI.");
    }

    console.log("✨ AI đã phân tích xong!");

    // --- BƯỚC D: Lưu vào Database Prisma ---
    // Tính toán số thứ tự (stt)
    const lastVideo = await prisma.video.findFirst({
      where: { playlistId: playlistId },
      orderBy: { stt: "desc" },
    });
    const nextStt = lastVideo ? lastVideo.stt + 1 : 1;

    await prisma.video.create({
      data: {
        title: title,
        youtubeId: youtubeId!,
        transcript: aiData.transcript,
        quizData: aiData.quiz,
        mindMapData: aiData.mindmap,
        playlistId: playlistId,
        videoUrl: "", // Không cần lưu link Supabase nữa
        status: "COMPLETED",
        stt: nextStt,
      },
    });

    // --- BƯỚC E: Dọn dẹp rác ---
    // 1. Xóa file tạm trên ổ cứng server
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    // 2. Xóa file trên Gemini (Tiết kiệm bộ nhớ Cloud)
    await fileManager.deleteFile(uploadResult.file.name);

    // 3. Xóa file gốc trên Supabase (Tiết kiệm dung lượng gói Free)
    const supabase = await createClient();
    await supabase.storage.from("videos").remove([filePathSupabase]);

    return { success: true };
  } catch (error: any) {
    console.error("❌ Lỗi quy trình:", error);

    // Cleanup file tạm nếu lỗi xảy ra giữa chừng
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return { success: false, error: error.message };
  }
}
