"use server";

import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// 1. Cấu hình YouTube
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

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
  filePathSupabase: string, // Đường dẫn file để xóa sau khi xong
  title: string,
  chapterId: string // ID của Chapter
) {
  let tempFilePath = "";
  let youtubeId = "";

  try {
    console.log(`🚀 Bắt đầu xử lý: ${title}`);

    // --- BƯỚC A: Tải video từ Supabase về server ---
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error("Không thể tải video từ Supabase");

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tạo thư mục tạm
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    tempFilePath = path.join(tempDir, `${Date.now()}_video.mp4`);
    fs.writeFileSync(tempFilePath, buffer);
    console.log("💾 Đã lưu file tạm trên server.");

    // --- BƯỚC B: Upload lên YouTube ---
    console.log("🎥 Đang đẩy lên YouTube...");

    try {
      const stream = Readable.from(buffer);
      const ytRes = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: title,
            description: "Bài giảng được upload tự động bởi Aura LMS.",
          },
          status: { privacyStatus: "unlisted" }, // Video không công khai
        },
        media: { body: stream },
      });

      if (ytRes.data.id) {
        youtubeId = ytRes.data.id;
        console.log(`✅ Upload YouTube thành công! ID: ${youtubeId}`);
      } else {
        throw new Error("Không nhận được Video ID từ YouTube.");
      }
    } catch (ytError: any) {
      console.error("❌ Lỗi YouTube API:", ytError.message);
      throw new Error("Lỗi xác thực YouTube. Kiểm tra lại Refresh Token.");
    }

    // --- BƯỚC C: Gửi cho Gemini phân tích ---
    console.log("🧠 Đang gửi cho AI phân tích...");
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: title,
    });

    // Polling đợi xử lý
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === "FAILED") {
      throw new Error("Gemini không đọc được video này (State: FAILED).");
    }

    // Prompt
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });
    const prompt = `
      Bạn là chuyên gia giáo dục. Hãy xem video này và trả về kết quả dưới dạng JSON THUẦN TÚY.
      YÊU CẦU QUAN TRỌNG:
      1. Tạo từ 10 đến 20 CÂU HỎI trắc nghiệm chất lượng nhất, tập trung vào trọng tâm bài giảng.
      2. OUTPUT FORMAT: Chỉ trả về JSON thuần túy. Không dùng Markdown. Không viết lời mở đầu.
      Cấu trúc JSON bắt buộc:
      {
        "transcript": "Tóm tắt chi tiết nội dung lời giảng...",
        "quiz": [
          {"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A"}
        ],
        "mindmap": ["Ý chính 1", "Ý chính 2", "Ý chính 3"]
      }
      Lưu ý: Không thêm markdown, không thêm lời dẫn, chỉ trả về JSON.
    `;
    console.log("⏳ AI đang soạn 10-20 câu hỏi...");
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

    // Parse JSON an toàn
    const startIndex = aiText.indexOf("{");
    const endIndex = aiText.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1)
      throw new Error("AI không trả về đúng JSON.");

    const cleanJson = aiText.substring(startIndex, endIndex + 1);
    let aiData;
    try {
      aiData = JSON.parse(cleanJson);
    } catch (e) {
      throw new Error("Lỗi parse JSON từ AI.");
    }

    console.log("✨ AI đã phân tích xong!");

    // --- BƯỚC D: Lưu vào Database (Theo Schema Mới) ---
    // Validate chapterId
    console.log("Kiểm tra chapter ID:", chapterId);

    const existingChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!existingChapter) {
      throw new Error(`Chapter ${chapterId} không tồn tại trong hệ thống.`);
    }

    // 1. Tính toán vị trí (position) trong Lesson
    const lastLesson = await prisma.lesson.findFirst({
      where: { chapterId: chapterId },
      orderBy: { position: "desc" },
    });
    const newPosition = lastLesson ? lastLesson.position + 1 : 1;

    // 2. Tạo Lesson và Questions cùng lúc (Nested Write)
    const lesson = await prisma.lesson.create({
      data: {
        title: title,
        chapterId: chapterId,
        position: newPosition,

        // Map đúng trường trong Schema
        youtubeVideoId: youtubeId,

        // Map transcript
        transcript: aiData.transcript,

        // Lưu ý: Schema Lesson không có trường status, status nằm ở Chapter
        // status: "PUBLISHED", <--- Đã xóa dòng này

        // Tạo các câu hỏi trắc nghiệm vào bảng Question
        questions: {
          create: aiData.quiz.map((q: any) => ({
            content: q.question,
            options: q.options, // Lưu mảng options dưới dạng Json [cite: 16]
            correctAnswer: q.answer, // [cite: 17]
            type: "MULTIPLE_CHOICE", // Enum QuestionType [cite: 15]
            aiExplanation: "Được tạo tự động bởi AI", // [cite: 18]
          })),
        },
      },
    });

    // --- BƯỚC E: Dọn dẹp ---
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    await fileManager.deleteFile(uploadResult.file.name);

    const supabase = await createClient();
    await supabase.storage.from("videos").remove([filePathSupabase]);

    return {
      success: true,
      lessonId: lesson.id,
      message: "Quy trình hoàn tất thành công.",
    };
  } catch (error: any) {
    console.error("❌ Lỗi quy trình:", error);
    if (tempFilePath && fs.existsSync(tempFilePath))
      fs.unlinkSync(tempFilePath);
    return { success: false, error: error.message };
  }
}
