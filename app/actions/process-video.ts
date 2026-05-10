"use server";

import { google } from "googleapis";
import { GoogleGenerativeAI, SchemaType, Schema, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";
import { Readable } from "stream";

// Ép buộc fluent-ffmpeg dùng đúng file .exe
ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath);

// Log ra để kiểm tra (xem console server khi chạy)
console.log("Path FFMPEG:", ffmpegPath);
console.log("Path FFPROBE:", ffprobePath);

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

const getVideoDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Thêm option timeout để tránh treo
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("FFprobe Error:", err);
        return resolve(0); // Tránh reject crash app, fallback về 0
      }
      const duration = metadata.format?.duration || 0;
      resolve(duration);
    });
  });
};

function cleanAndParseJSON(rawText: string) {
  try {
    let cleanText = rawText.replace(/```json/g, "").replace(/```/g, "");

    // Logic cắt số thập phân dài ngoằng (giữ nguyên yêu cầu của bạn)
    cleanText = cleanText.replace(/(\d+\.\d{4})\d+/g, "$1");

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("❌ JSON Parse Failed. Raw Text:", rawText);
    // Return fallback để không crash app
    return {
      transcript: "",
      timeline: [],
      quiz: [],
      translations: { en: "", ja: "", ko: "" },
    };
  }
}

const videoAnalysisSchema: Schema = {
  description:
    "Kết quả phân tích video giáo dục bao gồm transcript, timeline, quiz và dịch thuật.",
  type: SchemaType.OBJECT,
  properties: {
    transcript: {
      type: SchemaType.STRING,
      description: "Nội dung nguyên văn tiếng Việt.",
    },
    timeline: {
      type: SchemaType.ARRAY,
      description: "Danh sách các mốc thời gian trong video. Mỗi mốc gồm thời gian (giây) và tiêu đề.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          time: {
            type: SchemaType.INTEGER, // Sử dụng INTEGER thay vì NUMBER
            description: "Thời gian bắt đầu của đoạn tính bằng giây (số nguyên, ví dụ: 0, 60, 120)",
          },
          label: {
            type: SchemaType.STRING,
            description: "Tiêu đề ngắn gọn mô tả nội dung đoạn đó (ví dụ: 'Giới thiệu', 'Cài đặt môi trường')"
          },
        },
        required: ["time", "label"],
      },
    },
    quiz: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Danh sách 4 đáp án A, B, C, D",
          },
          answer: {
            type: SchemaType.STRING,
            description: "Đáp án đúng (A, B, C hoặc D)",
          },
          explanation: { type: SchemaType.STRING },
        },
        required: ["question", "options", "answer", "explanation"],
      },
    },
    translations: {
      type: SchemaType.OBJECT,
      properties: {
        en: { type: SchemaType.STRING },
        ja: { type: SchemaType.STRING },
        ko: { type: SchemaType.STRING },
      },
      required: ["en", "ja", "ko"],
    },
  },
  required: ["transcript", "timeline", "quiz", "translations"],
};

export async function processVideoUpload(
  videoUrl: string,
  filePathSupabase: string,
  title: string,
  chapterId: string,
) {
  let tempFilePath = "";
  let youtubeId = "";
  let geminiFileName = "";

  try {
    console.log(`🚀 [START] Bắt đầu xử lý (Prompt Engineering Mode): ${title}`);

    // =========================================================
    // BƯỚC 1: TẢI VIDEO TỪ SUPABASE VỀ SERVER TRUNG GIAN
    // =========================================================
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error("Không thể tải video từ Supabase.");

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Tạo thư mục tạm
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    tempFilePath = path.join(
      tempDir,
      `${Date.now()}_${path.basename(filePathSupabase)}`,
    );
    fs.writeFileSync(tempFilePath, buffer);
    console.log("💾 Đã lưu file tạm thành công.");
    console.log("⏱️ Đang tính toán thời lượng video (ffmpeg)...");

    const durationInSeconds = await getVideoDuration(tempFilePath);
    console.log(`⏱️ Thời lượng: ${durationInSeconds} giây`);

    // =========================================================
    // BƯỚC 2: UPLOAD LÊN YOUTUBE & GEMINI (SONG SONG)
    // =========================================================
    console.log("⚡ Đang upload lên YouTube và Gemini...");

    // A. Upload YouTube
    const youtubeUploadPromise = youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title,
          description: "Video bài giảng thuộc hệ thống Aura LMS.",
        },
        status: { privacyStatus: "unlisted" },
      },
      media: { body: Readable.from(buffer) },
    }).then(ytRes => {
      if (!ytRes.data.id) throw new Error("Không nhận được YouTube Video ID.");
      console.log(`✅ YouTube Upload OK. ID: ${ytRes.data.id}`);
      return ytRes.data.id;
    });

    // B. Upload Gemini
    const geminiUploadPromise = fileManager.uploadFile(tempFilePath, {
      mimeType: "video/mp4",
      displayName: title,
    }).then(async (uploadResult) => {
      const name = uploadResult.file.name;
      console.log(`⬆️ Đã upload lên Gemini: ${name}`);

      // Polling trạng thái xử lý
      let file = await fileManager.getFile(name);
      while (file.state === FileState.PROCESSING) {
        console.log("... Gemini đang xử lý video ...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error("Gemini xử lý video thất bại.");
      }
      return file;
    });

    // Đợi cả 2 hoàn tất an toàn bằng allSettled để tránh unhandled rejection gây crash server
    const uploadResults = await Promise.allSettled([
      youtubeUploadPromise,
      geminiUploadPromise,
    ]);

    if (uploadResults[0].status === "rejected") {
      throw new Error(`YouTube API Error: ${uploadResults[0].reason?.message || "Lỗi không xác định"}`);
    }
    if (uploadResults[1].status === "rejected") {
      throw new Error(`Gemini API Error: ${uploadResults[1].reason?.message || "Lỗi không xác định"}`);
    }

    youtubeId = uploadResults[0].value;
    const geminiFile = uploadResults[1].value;

    geminiFileName = geminiFile.name;
    const geminiFileUri = geminiFile.uri;
    console.log(`🔗 Gemini URI: ${geminiFileUri}`);

    // =========================================================
    // BƯỚC 3: GỬI GEMINI PHÂN TÍCH (VỚI PROMPT "THÉP")
    // =========================================================
    console.log("🧠 Đang gửi yêu cầu phân tích Verbatim...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 16384, // Tăng token output vì cần transcript dài
        temperature: 0.4, // QUAN TRỌNG: Tăng nhẹ tính sáng tạo để tránh bị chặn lỗi RECITATION
        responseMimeType: "application/json",
        responseSchema: videoAnalysisSchema,
      },
      // Safety settings để tránh lỗi RECITATION khi xử lý video giáo dục
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // --- PROMPT ĐƯỢC THIẾT KẾ RIÊNG ---
    const videoDuration = Math.round(durationInSeconds);
    const prompt = `
      Bạn là một chuyên gia phân tích video giáo dục và ngôn ngữ học.
      
      **THÔNG TIN VIDEO:**
      - Tiêu đề: "${title}"
      - Thời lượng: ${videoDuration} giây (tương đương ${Math.floor(videoDuration / 60)} phút ${videoDuration % 60} giây)
      
      Nhiệm vụ của bạn là xử lý video này và trả về kết quả JSON chính xác tuyệt đối theo các yêu cầu sau:

      ### NHIỆM VỤ 1: TRANSCRIPT (QUAN TRỌNG NHẤT)
      - Yêu cầu: **CHI TIẾT VÀ ĐẦY ĐỦ NHẤT CÓ THỂ**.
      - Bạn hãy ghi chép lại toàn bộ ý nghĩa lời nói tiếng Việt có trong video.
      - **BẮT BUỘC ĐỂ TRÁNH LỖI RECITATION:** Để tránh vi phạm lỗi bản quyền, bạn PHẢI diễn đạt lại (Paraphrase), thay đổi cấu trúc câu văn hoặc chọn từ đồng nghĩa sao cho tự nhiên mà không làm mất kiến thức chuyên môn.
      - **TUYỆT ĐỐI KHÔNG** chép lại nguyên văn y hệt 100% từng từ (Verbatim), nếu không bạn sẽ bị hệ thống chặn ngay lập tức.
      - **QUAN TRỌNG VỀ SỐ LIỆU:** Nếu giảng viên đọc số thập phân (ví dụ "4 phẩy 9"), hãy viết chính xác con số đó (4.9). Giữ số liệu ngắn gọn đúng như thuật toán.
      
      ### NHIỆM VỤ 2: TIMELINE (Mốc thời gian video)
      - Chia video thành các đoạn (chapters) có ý nghĩa dựa trên nội dung.
      - **QUAN TRỌNG VỀ TIME:**
        - "time" PHẢI là **SỐ NGUYÊN** (integer) tính bằng giây.
        - **RÀNG BUỘC:** 0 <= time < ${videoDuration} (thời lượng video là ${videoDuration} giây).
        - Ví dụ: Phút 2:30 = 150 giây, KHÔNG phải 150.0 hay "2:30".
        - Mốc đầu tiên luôn là time = 0.
        - Mốc cuối cùng PHẢI nhỏ hơn ${videoDuration} giây.
      - **VỀ LABEL:**
        - Ngắn gọn (dưới 50 ký tự).
        - Mô tả nội dung chính của đoạn đó.
        - Ví dụ: "Giới thiệu", "Cài đặt môi trường", "Code ví dụ đầu tiên".
      - **SỐ LƯỢNG:** Chia thành 3-10 mốc tùy độ dài video.


      ### NHIỆM VỤ 3: QUIZ (10 CÂU HỎI CHUYÊN MÔN)
      - **MỤC TIÊU:** Kiểm tra kiến thức kỹ thuật/học thuật mà học viên thu được.
      - **NGUYÊN TẮC TẠO CÂU HỎI (QUAN TRỌNG):**
        1. **CHỈ TẬP TRUNG:** Các định nghĩa, logic code, nguyên lý hoạt động, cú pháp, hoặc kiến thức cốt lõi.
        2. **TUYỆT ĐỐI BỎ QUA:** - Các chi tiết về giao diện không quan trọng (Ví dụ: "Chữ true màu gì?", "Nút này nằm ở đâu?").
           - Các câu hỏi về phong cách giảng dạy (Ví dụ: "Giảng viên đã đơn giản hóa thế nào?", "Giảng viên nói câu gì để mở đầu?").
           - Các lời thoại giao đãi, chào hỏi, kể chuyện bên lề.
        3. **ĐỘ KHÓ:** Câu hỏi phải khiến học viên phải suy nghĩ về bài học, không phải câu hỏi quan sát bề nổi.
      
      - **CẤU TRÚC:** 4 đáp án A, B, C, D.
      - **GIẢI THÍCH:** Phải giải thích dựa trên logic của bài học (Ví dụ: "Đúng, tại thời điểm 1:24, vì theo logic của vòng lặp mà giảng viên giải thích, biến i sẽ tăng lên...").

      ### NHIỆM VỤ 4: TRANSLATIONS (Dịch thuật)
      - Dựa vào kết quả Transcript nguyên văn ở Nhiệm vụ 1, hãy dịch nó sang:
        1. Tiếng Anh (key: "en")
        2. Tiếng Nhật (key: "ja")
        3. Tiếng Hàn (key: "ko")
      - Dịch sát nghĩa, giữ nguyên ngữ cảnh giáo dục.
      - **LƯU Ý:** Khi dịch các con số, hãy giữ nguyên dạng số (Arabic numerals), KHÔNG cố gắng viết chuỗi số dài vô tận. Nếu gặp lỗi lặp lại, hãy dừng ngay lập tức.

      ### CẤU TRÚC JSON ĐẦU RA (BẮT BUỘC):
      {
        "transcript": "Nội dung toàn bộ văn bản tiếng Việt nguyên văn...",
        "timeline": [
          { "time": 0, "label": "Giới thiệu" },
          { "time": 120, "label": "Nội dung chính" }
        ],
        "quiz": [
          {
            "question": "Câu hỏi...",
            "options": ["A", "B", "C", "D"], 
            "answer": "A", 
            "explanation": "Tại thời điểm 1:24, vì theo logic của vòng lặp mà giảng viên giải thích, biến i sẽ tăng lên..."
          }
        ],
        "translations": {
            "en": "English translation...",
            "ja": "Japanese translation...",
            "ko": "Korean translation..."
        }
      }
    `;

    console.log("⏳ Gemini đang thực hiện 4 nhiệm vụ cùng lúc...");

    let result;
    try {
      result = await model.generateContent([
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: geminiFileUri,
          },
        },
        { text: prompt },
      ]);
    } catch (aiError: any) {
      if (aiError.message?.includes("RECITATION")) {
        throw new Error("Gemini từ chối xử lý video do lỗi bảo vệ bản quyền (RECITATION Block). Mẹo: Hãy cắt bớt đoạn âm nhạc bản quyền trong video, hoặc thử lại một video giảng dạy khác do chính bạn quay.");
      }
      throw aiError; // Ném ra các lỗi khác
    }

    const aiData = cleanAndParseJSON(result.response.text());

    console.log(
      `✨ AI hoàn tất! (Transcript: ${aiData.transcript?.length} chars)`,
    );

    // =========================================================
    // BƯỚC 4: VALIDATE & CLEAN TIMELINE
    // =========================================================
    const maxDuration = Math.round(durationInSeconds);
    let validatedTimeline = aiData.timeline || [];

    // Filter các mốc có time >= duration
    if (Array.isArray(validatedTimeline)) {
      validatedTimeline = validatedTimeline
        .filter((item: any) => {
          const time = typeof item.time === 'number' ? item.time : parseInt(item.time, 10);
          return !isNaN(time) && time >= 0 && time < maxDuration;
        })
        .map((item: any) => ({
          time: Math.floor(typeof item.time === 'number' ? item.time : parseInt(item.time, 10)),
          label: String(item.label || '').slice(0, 100), // Limit label length
        }))
        .sort((a: any, b: any) => a.time - b.time); // Sắp xếp theo thời gian

      console.log(`📍 Timeline: ${validatedTimeline.length} mốc (sau khi validate)`);
    }

    // =========================================================
    // BƯỚC 5: LƯU VÀO DATABASE
    // =========================================================
    const existingChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!existingChapter) throw new Error("Chapter không tồn tại.");

    const lastLesson = await prisma.lesson.findFirst({
      where: { chapterId: chapterId },
      orderBy: { position: "desc" },
    });
    const newPosition = lastLesson ? lastLesson.position + 1 : 1;

    // Lưu Lesson + Questions + Timeline + Translations
    const lesson = await prisma.lesson.create({
      data: {
        title: title,
        chapterId: chapterId,
        position: newPosition,
        youtubeVideoId: youtubeId,
        duration: maxDuration,
        transcript: aiData.transcript,
        timeline: validatedTimeline, // Đã validate
        translations: aiData.translations,

        questions: {
          create: (Array.isArray(aiData.quiz) ? aiData.quiz : []).map((q: any) => ({
            content: q?.question || "Câu hỏi đang gặp lỗi",
            options: Array.isArray(q?.options) ? q.options.map((opt: string) =>
              String(opt || "").replace(/^([A-D]|[0-9]+)[\.\)]\s*/g, "").trim(),
            ) : ["A", "B", "C", "D"],
            correctAnswer: q?.answer || "A",
            type: "MULTIPLE_CHOICE",
            aiExplanation: q?.explanation || "Chưa có giải thích.",
          })),
        },
      },
    });

    // =========================================================
    // BƯỚC 6: TẠO EMBEDDINGS CHO RAG (Tự động)
    // =========================================================
    console.log("🧬 Đang tạo embeddings cho video search...");
    try {
      const { generateEmbeddings: genEmbed } = await import("@/lib/ai/embedding");

      // Chunk transcript bằng thuật toán Overlapping
      const transcript = aiData.transcript || "";
      const chunks = chunkTranscriptWithOverlap(transcript, maxDuration, {
        chunkSize: 500,     // ~500 ký tự mỗi chunk
        overlapSize: 80,    // ~80 ký tự gối đầu
      });

      if (chunks.length > 0) {
        const texts = chunks.map(c => c.text);
        const embeddings = await genEmbed(texts);

        // Lưu vào Supabase vector store
        const supabaseAdmin = await createAdminClient();

        // Xóa embedding cũ nếu re-process
        await supabaseAdmin.from('video_embeddings').delete().eq('lesson_id', lesson.id);

        // Insert từng batch (tránh quá tải)
        const batchSize = 20;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize).map((chunk, idx) => ({
            lesson_id: lesson.id,
            content: chunk.text,
            start_time: chunk.start,
            end_time: chunk.end,
            embedding: embeddings[i + idx],
            metadata: { chunkIndex: i + idx, title: title }
          }));

          const { error: insertError } = await supabaseAdmin.from('video_embeddings').insert(batch);
          if (insertError) {
            console.error(`⚠️ Embedding batch ${i} error:`, insertError.message);
          }
        }
        console.log(`✅ Đã tạo ${chunks.length} embeddings cho RAG search.`);
      }
    } catch (embError: any) {
      // Không throw - embedding failure không nên block toàn bộ video process
      console.error("⚠️ Embedding generation failed (non-critical):", embError.message);
    }

    return {
      success: true,
      lessonId: lesson.id,
      message: "Xử lý thành công toàn diện!",
    };
  } catch (error: any) {
    console.error("❌ LỖI PROCESS VIDEO:", error.message);
    return { success: false, error: error.message };
  } finally {
    // =========================================================
    // BƯỚC 7: DỌN DẸP TÀI NGUYÊN
    // =========================================================
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log("🧹 Đã xóa file tạm local.");
      }
      if (geminiFileName) {
        await fileManager.deleteFile(geminiFileName);
        console.log("🧹 Đã xóa file trên Gemini.");
      }
      if (filePathSupabase) {
        const supabase = await createClient();
        await supabase.storage.from("videos").remove([filePathSupabase]);
        console.log("🧹 Đã xóa file trên Supabase.");
      }
    } catch (cleanupError) {
      console.error("⚠️ Lỗi dọn dẹp:", cleanupError);
    }
  }
}

// =========================================================
// CHUNKING ALGORITHM: Overlapping Windows cho RAG Embedding
// =========================================================
interface ChunkOptions {
  chunkSize: number;     // Kích thước mỗi chunk (ký tự)
  overlapSize: number;   // Số ký tự gối đầu giữa 2 chunk
}

interface TranscriptChunk {
  text: string;
  start: number;  // giây
  end: number;    // giây
}

function chunkTranscriptWithOverlap(
  text: string,
  duration: number,
  options: ChunkOptions = { chunkSize: 500, overlapSize: 80 }
): TranscriptChunk[] {
  if (!text || text.length === 0) return [];

  const { chunkSize, overlapSize } = options;
  const totalChars = text.length;
  const charsPerSec = totalChars / (duration || 1);

  // Split by sentences first for natural boundaries
  const sentences = text.match(/[^.!?。]+[.!?。]+[\])'"\u201d]*|[^.!?。]+$/g) || [text];

  const chunks: TranscriptChunk[] = [];
  let currentText = "";
  let currentStartChar = 0;
  let charOffset = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (currentText.length + trimmed.length <= chunkSize) {
      currentText += (currentText ? " " : "") + trimmed;
    } else {
      // Lưu chunk hiện tại
      if (currentText) {
        const startTime = Math.floor(currentStartChar / charsPerSec);
        const endTime = Math.floor((currentStartChar + currentText.length) / charsPerSec);
        chunks.push({
          text: currentText,
          start: Math.min(startTime, duration),
          end: Math.min(endTime, duration),
        });
      }

      // Tính overlap: lấy overlapSize ký tự cuối của chunk vừa xong
      const overlapText = currentText.length > overlapSize
        ? currentText.slice(-overlapSize)
        : currentText;

      // Bắt đầu chunk mới với overlap
      currentStartChar = charOffset - overlapText.length;
      currentText = overlapText + " " + trimmed;
    }

    charOffset += trimmed.length + 1; // +1 for space
  }

  // Push chunk cuối cùng
  if (currentText) {
    const startTime = Math.floor(currentStartChar / charsPerSec);
    chunks.push({
      text: currentText,
      start: Math.min(startTime, duration),
      end: duration,
    });
  }

  return chunks;
}

