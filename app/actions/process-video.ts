"use server";

import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// --- 1. CẤU HÌNH YOUTUBE ---
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground",
);

oauth2Client.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
});

const youtube = google.youtube({ version: "v3", auth: oauth2Client });

// --- 2. CẤU HÌNH GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const fileManager = new GoogleAIFileManager(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
);

export async function processVideoUpload(
  videoUrl: string, // URL Public để tải video về
  filePathSupabase: string, // Đường dẫn file (Path) trong bucket để xóa
  title: string,
  chapterId: string,
) {
  let tempFilePath = "";
  let youtubeId = "";
  let geminiFileName = "";

  try {
    console.log(`🚀 [START] Bắt đầu xử lý: ${title}`);

    // =========================================================
    // BƯỚC 1: TẢI VIDEO TỪ SUPABASE VỀ SERVER TRUNG GIAN
    // =========================================================
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error("Không thể tải video từ Supabase.");

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Tạo thư mục tạm nếu chưa có
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    // Lưu file với timestamp để tránh trùng tên
    tempFilePath = path.join(
      tempDir,
      `${Date.now()}_${path.basename(filePathSupabase)}`,
    );
    fs.writeFileSync(tempFilePath, buffer);
    console.log("💾 Đã lưu file tạm thành công.");

    // =========================================================
    // BƯỚC 2: UPLOAD LÊN YOUTUBE
    // =========================================================
    console.log("🎥 Đang upload lên YouTube...");

    // Tạo stream từ buffer để upload
    const stream = Readable.from(buffer);

    const ytRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title,
          description: "Video bài giảng thuộc hệ thống Aura LMS.",
        },
        status: { privacyStatus: "unlisted" }, // Không công khai
      },
      media: { body: stream },
    });

    if (ytRes.data.id) {
      youtubeId = ytRes.data.id;
      console.log(`✅ YouTube Upload OK. ID: ${youtubeId}`);
    } else {
      throw new Error("Không nhận được YouTube Video ID.");
    }

    // =========================================================
    // BƯỚC 3: GỬI GEMINI PHÂN TÍCH & TẠO QUIZ
    // =========================================================
    console.log("🧠 Đang gửi video cho Gemini...");

    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: title,
    });
    geminiFileName = uploadResult.file.name;

    // Polling trạng thái xử lý của Gemini
    let file = await fileManager.getFile(geminiFileName);
    while (file.state === "PROCESSING") {
      console.log("... Đang đợi Gemini xử lý video ...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      file = await fileManager.getFile(geminiFileName);
    }

    if (file.state === "FAILED") {
      throw new Error("Gemini xử lý video thất bại.");
    }

    // Cấu hình Model & Prompt
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const prompt = `
      Bạn là chuyên gia giáo dục. Hãy phân tích video và tạo 10 câu hỏi trắc nghiệm bằng TIẾNG VIỆT.

      YÊU CẦU QUAN TRỌNG:
      1. **Explanation:** BẮT BUỘC mỗi câu hỏi phải có trường "explanation" giải thích tại sao đáp án đó đúng.
      2. **Format:** Tuyệt đối không dùng Markdown, không dùng backtick (\`).
      3. **Options:** Mảng chuỗi thuần túy, KHÔNG có prefix như "A.", "1.".
      4. **Answer:** Chỉ chứa ký tự "A", "B", "C", hoặc "D" (tương ứng index 0, 1, 2, 3).

      CẤU TRÚC JSON OUTPUT:
      {
        "transcript": "Tóm tắt nội dung bài giảng khoảng 300 từ...",
        "quiz": [
          {
            "question": "Nội dung câu hỏi?",
            "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"], 
            "answer": "A", 
            "explanation": "Đáp án A đúng vì trong video diễn giả đã đề cập đến..."
          }
        ]
      }
    `;

    console.log("⏳ Gemini đang soạn câu hỏi...");
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

    // Xử lý JSON an toàn (Clean Markdown nếu lỡ có)
    const jsonString = aiText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    let aiData;

    try {
      aiData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Raw AI Text:", aiText);
      throw new Error("Lỗi định dạng JSON từ AI.");
    }

    console.log(`✨ AI đã tạo xong ${aiData.quiz?.length || 0} câu hỏi.`);

    // =========================================================
    // BƯỚC 4: LƯU VÀO DATABASE
    // =========================================================
    const existingChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!existingChapter) throw new Error("Chapter không tồn tại.");

    // Tính vị trí bài học
    const lastLesson = await prisma.lesson.findFirst({
      where: { chapterId: chapterId },
      orderBy: { position: "desc" },
    });
    const newPosition = lastLesson ? lastLesson.position + 1 : 1;

    // Lưu Lesson + Questions (Transaction ngầm định của Prisma)
    const lesson = await prisma.lesson.create({
      data: {
        title: title,
        chapterId: chapterId,
        position: newPosition,
        youtubeVideoId: youtubeId,
        transcript: aiData.transcript,
        questions: {
          create: aiData.quiz.map((q: any) => ({
            content: q.question,
            options: q.options,
            correctAnswer: q.answer,
            type: "MULTIPLE_CHOICE",
            aiExplanation: q.explanation || "Chưa có giải thích.",
          })),
        },
      },
    });

    return {
      success: true,
      lessonId: lesson.id,
      message: "Xử lý thành công!",
    };
  } catch (error: any) {
    console.error("❌ LỖI PROCESS VIDEO:", error.message);
    return { success: false, error: error.message };
  } finally {
    try {
      // 1. Xóa file tạm trên server (tmp folder)
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log("🧹 Đã xóa file tạm local.");
      }

      // 2. Xóa file trên Gemini File Manager
      if (geminiFileName) {
        await fileManager.deleteFile(geminiFileName);
        console.log("🧹 Đã xóa file trên Gemini.");
      }

      // 3. Xóa file gốc trên Supabase (Dùng filePathSupabase chuẩn)
      if (filePathSupabase) {
        const supabase = await createClient();
        const { error: delErr } = await supabase.storage
          .from("videos")
          .remove([filePathSupabase]); // Phải truyền mảng chứa path

        if (delErr) console.error("⚠️ Lỗi xóa Supabase:", delErr.message);
        else console.log("🧹 Đã xóa file trên Supabase.");
      }
    } catch (cleanupError) {
      console.error("⚠️ Lỗi trong quá trình dọn dẹp:", cleanupError);
    }
  }
}
