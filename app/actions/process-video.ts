"use server";

import { google } from "googleapis";
import { GoogleGenerativeAI, SchemaType, Schema, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { transcribeWithGemini } from "@/lib/transcript-gemini";
import { callLocalGeminiJSON } from "@/lib/local-gemini";
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

// --- 2. CẤU HÌNH GEMINI & GROQ ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const fileManager = new GoogleAIFileManager(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
);
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const getVideoDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("FFprobe Error:", err);
        return resolve(0);
      }
      const duration = metadata.format?.duration || 0;
      resolve(duration);
    });
  });
};

function getFileSize(filePath: string): number {
  if (!filePath) return 0;
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function safeUnlink(filePath?: string): void {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn("safeUnlink error:", err);
    }
  }
}

export async function cleanupFailedUpload(baseFileName: string, totalChunks: number) {
  try {
    const tempDir = path.join(process.cwd(), "tmp");
    let deletedCount = 0;
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${baseFileName}_part_${i}`);
      if (fs.existsSync(chunkPath)) {
        fs.unlinkSync(chunkPath);
        deletedCount++;
      }
    }
    console.log(`🧹 Đã dọn dẹp ${deletedCount} chunks do upload thất bại.`);
    return { success: true };
  } catch (err) {
    console.error("⚠️ Lỗi dọn dẹp chunk thất bại:", err);
    return { success: false };
  }
}

// --- AUDIO EXTRACTION: Trích xuất audio từ video để giảm 90-95% token Gemini ---
const extractAudio = (videoPath: string, audioPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()               // Bỏ video track hoàn toàn
      .audioCodec('aac')       // Codec phổ biến, tương thích Gemini
      .audioBitrate('64k')     // Bitrate thấp nhưng đủ rõ lời nói
      .audioChannels(1)        // Mono (giảm 50% size so với stereo)
      .output(audioPath)
      .on('end', () => {
        console.log(`🎵 Trích xuất audio thành công: ${audioPath}`);
        resolve();
      })
      .on('error', (err, stdout, stderr) => {
        console.error('❌ Lỗi trích xuất audio:', err.message);
        console.error('📋 FFmpeg stderr:', stderr);
        reject(err);
      })
      .run();
  });
};

// --- DYNAMIC KEYFRAME CONFIG: Tính toán maxFrames và sceneThreshold theo thời lượng video ---
// Video ngắn → ít frame, ngưỡng nhạy hơn (bắt nhiều chi tiết)
// Video dài → nhiều frame hơn nhưng ngưỡng cao hơn (chỉ bắt thay đổi lớn, tránh quá tải)
function getSmartKeyframeConfig(durationSeconds: number): { maxFrames: number; sceneThreshold: number } {
  if (durationSeconds <= 120) {
    // Video <= 2 phút: tối đa 6 frame, ngưỡng 0.25
    return { maxFrames: 6, sceneThreshold: 0.25 };
  } else if (durationSeconds <= 300) {
    // Video 2-5 phút: tối đa 8 frame, ngưỡng 0.3
    return { maxFrames: 8, sceneThreshold: 0.3 };
  } else if (durationSeconds <= 600) {
    // Video 5-10 phút: tối đa 10 frame, ngưỡng 0.35
    return { maxFrames: 10, sceneThreshold: 0.35 };
  } else if (durationSeconds <= 1200) {
    // Video 10-20 phút: tối đa 12 frame, ngưỡng 0.4
    return { maxFrames: 12, sceneThreshold: 0.4 };
  } else if (durationSeconds <= 2400) {
    // Video 20-40 phút: tối đa 15 frame, ngưỡng 0.45
    return { maxFrames: 15, sceneThreshold: 0.45 };
  } else {
    // Video > 40 phút: tối đa 18 frame, ngưỡng 0.5 (chỉ bắt thay đổi lớn)
    return { maxFrames: 18, sceneThreshold: 0.5 };
  }
}

// --- SMART KEYFRAME EXTRACTION: 2-Phase Scene Change Detection ---
// Phase 1: Quét toàn bộ video thu thập timestamps (không ghi file, cực nhanh)
// Phase 2: Chọn lọc maxFrames timestamps phân bố đều → trích xuất chính xác
const extractKeyframes = (
  videoPath: string,
  outputDir: string,
  maxFrames: number = 10,       // Giới hạn tối đa frames (kiểm soát token)
  sceneThreshold: number = 0.3  // Ngưỡng scene change (0-1, thấp = nhạy hơn)
): Promise<string[]> => {
  return new Promise(async (resolve) => {
    try {
      const duration = await getVideoDuration(videoPath);
      if (duration <= 0) {
        console.warn('⚠️ Không lấy được duration, bỏ qua keyframe extraction.');
        return resolve([]);
      }

      // Tạo thư mục chứa keyframes
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      // Trích xuất keyframes phân bố đều khắp video (nhanh x50 lần, không gây treo khi quét video dài)
      const count = Math.min(maxFrames, 8);
      const interval = duration / (count + 1);
      const selectedTimestamps: number[] = [];

      for (let i = 1; i <= count; i++) {
        selectedTimestamps.push(Math.floor(interval * i));
      }

      console.log(`📸 Trích xuất ${selectedTimestamps.length} keyframes phân bố đều khắp ${(duration / 60).toFixed(1)} phút video...`);

      const extractedPaths: string[] = [];
      for (let i = 0; i < selectedTimestamps.length; i++) {
        const ts = selectedTimestamps[i];
        const outputPath = path.join(outputDir, `frame_${String(i).padStart(4, '0')}.jpg`);
        await new Promise<void>((res) => {
          ffmpeg(videoPath)
            .seekInput(ts)
            .frames(1)
            .outputOptions(['-q:v', '5', '-vf', 'scale=640:-1'])
            .output(outputPath)
            .on('end', () => {
              extractedPaths.push(outputPath);
              res();
            })
            .on('error', () => res())
            .run();
        });
      }

      console.log(`📸 Keyframe extraction hoàn tất: ${extractedPaths.length}/${maxFrames} frames (2-phase scene detection).`);
      resolve(extractedPaths);
    } catch (err) {
      console.error('❌ Lỗi keyframe extraction:', err);
      resolve([]); // Trả về mảng rỗng thay vì reject
    }
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
    };
  }
}

const videoTimelineSchema: Schema = {
  description:
    "Danh sách các mốc thời gian trong video.",
  type: SchemaType.OBJECT,
  properties: {
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
  },
  required: ["timeline"],
};

export async function processVideoUpload(
  baseFileName: string,
  totalChunks: number,
  title: string,
  chapterId: string,
) {
  let tempFilePath = "";
  let audioFilePath = "";
  let keyframeDir = "";
  let youtubeId = "";
  let geminiFileName = "";

  try {
    // Sanitize title for DB & AI (Keep FULL title untruncated)
    let safeTitle = (title || "")
      .replace(/[<>]/g, "")
      .trim();

    if (!safeTitle) {
      safeTitle = `Video bài giảng Aura - ${new Date().toLocaleDateString('vi-VN')}`;
    }

    console.log(`🚀 [START] Bắt đầu xử lý (Prompt Engineering Mode): ${safeTitle}`);

    // =========================================================
    // BƯỚC 1: TẢI TỪNG PHẦN TỪ SUPABASE VÀ GHÉP NỐI
    // =========================================================
    // Tạo thư mục tạm
    const tempDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    tempFilePath = path.join(
      tempDir,
      `${Date.now()}_${path.basename(baseFileName)}`,
    );

    // Đảm bảo file không tồn tại trước khi ghi nối tiếp
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log(`📥 Đang ghép ${totalChunks} phần từ thư mục tạm (Local mode)...`);

    // Stream-based chunk merging: Đọc trực tiếp từ local disk (không qua Supabase)
    const writeStream = fs.createWriteStream(tempFilePath);
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${baseFileName}_part_${i}`);

      if (!fs.existsSync(chunkPath)) {
        writeStream.destroy();
        throw new Error(`Không tìm thấy phần ${i}: ${chunkPath}`);
      }

      const chunkBuffer = fs.readFileSync(chunkPath);

      // Ghi bằng stream, đợi drain nếu buffer đầy (tránh tràn RAM)
      await new Promise<void>((resolve, reject) => {
        const canContinue = writeStream.write(chunkBuffer);
        if (canContinue) {
          resolve();
        } else {
          writeStream.once('drain', resolve);
        }
      });
      console.log(`✅ Đã ghép phần ${i + 1}/${totalChunks}`);
    }
    // Đóng stream và đợi ghi xong
    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });

    const finalVideoSize = getFileSize(tempFilePath);
    console.log(`💾 Đã ghép file tạm thành công. Kích thước tổng: ${(finalVideoSize / 1024 / 1024).toFixed(2)} MB`);
    console.log("⏱️ Đang tính toán thời lượng video (ffmpeg)...");

    const durationInSeconds = await getVideoDuration(tempFilePath);
    console.log(`⏱️ Thời lượng: ${durationInSeconds} giây`);

    // =========================================================
    // BƯỚC 2: TRÍCH XUẤT AUDIO + KEYFRAMES (Tiết kiệm 90-95% token Gemini)
    // =========================================================
    console.log("🎵 Đang trích xuất audio từ video (tiết kiệm token)...");
    audioFilePath = tempFilePath.replace(/\.[^.]+$/, '_audio.m4a');
    await extractAudio(tempFilePath, audioFilePath);

    const audioSize = getFileSize(audioFilePath);
    const videoSize = getFileSize(tempFilePath);
    console.log(`📊 Kích thước: Video=${(videoSize / 1024 / 1024).toFixed(1)}MB → Audio=${(audioSize / 1024 / 1024).toFixed(1)}MB (giảm ${((1 - audioSize / (videoSize || 1)) * 100).toFixed(0)}%)`);

    console.log("📸 Đang phát hiện scene changes trong video (smart keyframe)...");
    keyframeDir = path.join(path.dirname(tempFilePath), `keyframes_${Date.now()}`);
    const videoDuration = await getVideoDuration(tempFilePath);
    const keyframeConfig = getSmartKeyframeConfig(videoDuration);
    console.log(`🎯 Video ${(videoDuration / 60).toFixed(1)} phút → maxFrames=${keyframeConfig.maxFrames}, sceneThreshold=${keyframeConfig.sceneThreshold}`);
    const keyframePaths = await extractKeyframes(tempFilePath, keyframeDir, keyframeConfig.maxFrames, keyframeConfig.sceneThreshold);

    // =========================================================
    // BƯỚC 3.5: TẠO DRAFT LESSON TRONG DB VÀ TRẢ VỀ SỚM (BACKGROUND JOB)
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

    // Tạo Lesson với trạng thái "Đang xử lý ngầm"
    const lesson = await prisma.lesson.create({
      data: {
        title: safeTitle,
        chapterId: chapterId,
        position: newPosition,
        duration: Math.round(durationInSeconds),
        youtubeVideoId: null, // Bỏ trống để làm cờ nhận biết trạng thái đang xử lý
        transcript: "Đang được AI xử lý ngầm...",
        timeline: [],
      },
    });

    console.log(`🚀 Đã khởi tạo Lesson ${lesson.id}, bắt đầu chạy ngầm AI...`);

    // Chạy ngầm (Fire and forget)
    runBackgroundVideoProcessing(
      lesson.id,
      safeTitle,
      chapterId,
      tempFilePath,
      audioFilePath,
      keyframeDir,
      keyframePaths,
      durationInSeconds,
      baseFileName,
      totalChunks
    ).catch(console.error);

    return {
      success: true,
      lessonId: lesson.id,
      message: "Video đang được AI xử lý ngầm. Bạn có thể rời khỏi trang này.",
    };
  } catch (error: any) {
    console.error("❌ LỖI TRƯỚC KHI TẠO LESSON:", error.message);
    return { success: false, error: error.message };
  }
}

// =========================================================
// HÀM CHẠY NGẦM (BACKGROUND JOB)
// =========================================================
async function runBackgroundVideoProcessing(
  lessonId: string,
  title: string,
  chapterId: string,
  tempFilePath: string,
  audioFilePath: string,
  keyframeDir: string,
  keyframePaths: string[],
  durationInSeconds: number,
  baseFileName: string,
  totalChunks: number
) {
  let youtubeId = "";
  let geminiFileName = "";

  try {
    // Bước 1: Khởi động
    await updateProcessingStep(lessonId, 1, "Ghép file & trích xuất Audio (FFmpeg)", 15, 35);

    // Lấy thông tin khóa học và chương học để làm ngữ cảnh bóc băng
    console.log(`🔍 Đang truy vấn ngữ cảnh khóa học cho chapterId: ${chapterId}...`);
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        course: {
          select: {
            title: true,
          }
        }
      }
    });
    const courseTitle = chapter?.course?.title || "";
    const chapterTitle = chapter?.title || "";
    console.log(`📚 Ngữ cảnh khóa học: "${courseTitle}" | Chương: "${chapterTitle}"`);

    // Ensure safe title for YouTube API (non-empty, max 100 chars, no HTML tags)
    let ytTitle = (title || "")
      .replace(/[<>]/g, "")
      .trim();

    if (!ytTitle) {
      ytTitle = `Video bài giảng Aura - ${new Date().toLocaleDateString('vi-VN')}`;
    }

    if (ytTitle.length > 100) {
      ytTitle = ytTitle.substring(0, 97) + "...";
    }

    // =========================================================
    // BƯỚC 2: UPLOAD YOUTUBE & STT TRANSCRIPT BẰNG WHISPER + LOCAL GEMINI 3.6
    // =========================================================
    await updateProcessingStep(lessonId, 2, "Bóc băng âm thanh & Hiệu chỉnh (Local Gemini 3.6 Flash)", 35, 25);
    console.log(`⚡ Đang upload lên YouTube ("${ytTitle}") và bóc băng bằng Groq Whisper + Local Gemini 3.6...`);
    const youtubeUploadPromise = youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: ytTitle,
          description: "Video bài giảng thuộc hệ thống Aura LMS.",
        },
        status: { privacyStatus: "unlisted" },
      },
      media: { body: fs.createReadStream(tempFilePath) },
    }).then(async (ytRes) => {
      if (!ytRes.data.id) throw new Error("Không nhận được YouTube Video ID.");
      console.log(`✅ YouTube Upload OK. ID: ${ytRes.data.id}`);

      // Cập nhật database lưu youtubeVideoId ngay lập tức để tránh mất link video
      console.log(`💾 Đang lưu youtubeVideoId (${ytRes.data.id}) vào database...`);
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { youtubeVideoId: ytRes.data.id }
      });

      return ytRes.data.id;
    });

    // B. Bóc băng audio bằng Gemini-First STT
    const geminiTranscriptionPromise = transcribeWithGemini(
      audioFilePath,
      courseTitle,
      chapterTitle,
      title // lessonTitle
    );

    // Đợi cả 2 hoàn tất an toàn
    const uploadResults = await Promise.allSettled([
      youtubeUploadPromise,
      geminiTranscriptionPromise,
    ]);

    if (uploadResults[0].status === "rejected") {
      throw new Error(`YouTube API Error: ${uploadResults[0].reason?.message || "Lỗi không xác định"}`);
    }
    if (uploadResults[1].status === "rejected") {
      throw new Error(`Gemini STT Error: ${uploadResults[1].reason?.message || "Lỗi không xác định"}`);
    }
    youtubeId = uploadResults[0].value;
    const transcriptText = uploadResults[1].value;
    console.log(`📝 Gemini transcript length: ${transcriptText.length} characters`);

    // =========================================================
    // BƯỚC 4: GỬI GROQ PHÂN TÍCH VÀ SINH TIMELINE TỪ TRANSCRIPT TEXT
    // =========================================================
    await updateProcessingStep(lessonId, 4, "Sinh mốc thời gian Timeline (Groq Llama 3.3)", 75, 12);
    console.log("🧠 Đang gửi yêu cầu sinh timeline từ transcript văn bản qua Groq...");

    // --- PROMPT ĐƯỢC THIẾT KẾ RIÊNG ---
    const videoDuration = Math.round(durationInSeconds);
    const prompt = `
      Bạn là một chuyên gia phân tích bài giảng giáo dục và ngôn ngữ học.
      
      **THÔNG TIN BÀI GIẢNG:**
      - Tiêu đề: "${title}"
      - Thời lượng: ${videoDuration} giây (tương đương ${Math.floor(videoDuration / 60)} phút ${videoDuration % 60} giây)
      - Dữ liệu đầu vào: Văn bản transcript bóc băng từ video bài giảng bên dưới.
      
      **VĂN BẢN TRANSCRIPT:**
      """
      ${transcriptText}
      """
      
      Nhiệm vụ của bạn là sinh Timeline (Mốc thời gian bài giảng) dưới dạng JSON chính xác tuyệt đối theo các yêu cầu sau:
      - Chia bài giảng thành các đoạn (chapters) có ý nghĩa dựa trên nội dung transcript.
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

      ### CẤU TRÚC JSON ĐẦU RA (BẮT BUỘC):
      {
        "timeline": [
          { "time": 0, "label": "Giới thiệu" },
          { "time": 120, "label": "Nội dung chính" }
        ]
      }
    `;

    console.log("⏳ Local Gemini 3.6 Flash đang sinh timeline...");

    let aiData: any = { timeline: [] };
    try {
      aiData = await callLocalGeminiJSON(
        {
          messages: [{ role: "user", content: prompt }],
          model: "gemini-3.6-flash",
          temperature: 0.2,
          timeoutMs: 180000,
        },
        { timeline: [] }
      );
      console.log(`✨ Local Gemini AI hoàn tất! Timeline: ${aiData.timeline?.length || 0} mốc`);
    } catch (geminiError: any) {
      console.error("❌ Lỗi gọi Local Gemini Timeline:", geminiError.message);
      // Fallback: sinh timeline cơ bản
      aiData = {
        timeline: [
          { time: 0, label: "Bắt đầu bài giảng" },
          { time: Math.floor(durationInSeconds / 2), label: "Nội dung chính" },
        ],
      };
    }

    // =========================================================
    // BƯỚC 5: VALIDATE & CLEAN TIMELINE
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
    // BƯỚC 6: TẠO EMBEDDINGS CHO RAG (Tự động)
    // =========================================================
    await updateProcessingStep(lessonId, 5, "Tạo dữ liệu RAG Search Embeddings", 90, 5);
    console.log("🧬 Đang tạo embeddings cho video search...");
    try {
      const { generateEmbeddings: genEmbed } = await import("@/lib/ai/embedding");

      // Chunk transcript bằng thuật toán Overlapping
      const transcript = transcriptText || "";
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
        await supabaseAdmin.from('video_embeddings').delete().eq('lesson_id', lessonId);

        // Insert từng batch (tránh quá tải)
        const batchSize = 20;
        for (let i = 0; i < chunks.length; i += batchSize) {
          const batch = chunks.slice(i, i + batchSize).map((chunk, idx) => ({
            lesson_id: lessonId,
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

    // =========================================================
    // BƯỚC 7: CẬP NHẬT DATABASE HOÀN TẤT (Lưu Transcript & Timeline cuối cùng)
    // =========================================================
    console.log(`💾 Ghi đè cập nhật DB hoàn tất cho Lesson ${lessonId}...`);
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        youtubeVideoId: youtubeId,
        transcript: transcriptText,
        timeline: validatedTimeline, // Đã validate
        translations: {}, // Tạm tắt dịch thuật vì vượt giới hạn token Gemini
      },
    });

    console.log("✅ Xử lý thành công toàn diện cho Lesson", lessonId);
  } catch (error: any) {
    console.error("❌ LỖI PROCESS BACKGROUND VIDEO:", error.message);

    // Nếu lỗi ngầm, cập nhật trạng thái lỗi vào transcript
    try {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { transcript: "Lỗi trong quá trình AI xử lý: " + error.message }
      });
    } catch (e) { }
  } finally {
    // =========================================================
    // BƯỚC 8: DỌN DẸP TÀI NGUYÊN (bao gồm audio + keyframes)
    // =========================================================
    try {
      if (tempFilePath) {
        safeUnlink(tempFilePath);
        console.log("🧹 Đã xóa file video tạm local.");
      }
      if (audioFilePath) {
        safeUnlink(audioFilePath);
        console.log("🧹 Đã xóa file audio tạm local.");
      }
      if (keyframeDir && fs.existsSync(keyframeDir)) {
        // Xóa toàn bộ keyframe files và thư mục
        const files = fs.readdirSync(keyframeDir);
        for (const file of files) {
          safeUnlink(path.join(keyframeDir, file));
        }
        fs.rmdirSync(keyframeDir);
        console.log("🧹 Đã xóa thư mục keyframes tạm.");
      }
      if (geminiFileName) {
        await fileManager.deleteFile(geminiFileName);
        console.log("🧹 Đã xóa file trên Gemini.");
      }
      if (baseFileName && totalChunks > 0) {
        const tempDir = path.join(process.cwd(), "tmp");
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(tempDir, `${baseFileName}_part_${i}`);
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }
        console.log("🧹 Đã xóa toàn bộ các chunk tạm trên Local Server.");
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

// =========================================================
// HELPER CẬP NHẬT VÀ LẤY TRẠNG THÁI TIẾN ĐỘ CHO INSTRUCTOR UI
// =========================================================
export async function updateProcessingStep(
  lessonId: string,
  stepIndex: number,
  stepName: string,
  progressPercent: number,
  etaSeconds: number
) {
  try {
    const statusData = JSON.stringify({
      isProcessing: true,
      step: stepIndex,
      stepName: stepName,
      progress: progressPercent,
      eta: etaSeconds,
      updatedAt: Date.now()
    });

    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        transcript: `PROCESSING:${statusData}`
      }
    });
  } catch (err) {
    console.error("⚠️ Lỗi cập nhật trạng thái tiến độ bài học:", err);
  }
}

export async function getLessonProcessingStatus(lessonId: string) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        youtubeVideoId: true,
        transcript: true
      }
    });

    if (!lesson) {
      return { isProcessing: false, isError: true, errorMessage: "Không tìm thấy bài học" };
    }

    const transcriptStr = lesson.transcript || "";

    if (transcriptStr.startsWith("Lỗi")) {
      return { isProcessing: false, isError: true, errorMessage: transcriptStr };
    }

    if (transcriptStr.startsWith("PROCESSING:")) {
      try {
        const jsonStr = transcriptStr.replace("PROCESSING:", "");
        const status = JSON.parse(jsonStr);
        return {
          isProcessing: true,
          isError: false,
          step: status.step || 1,
          stepName: status.stepName || "Đang xử lý...",
          progress: status.progress || 15,
          etaSeconds: status.eta || 30
        };
      } catch (e) { }
    }

    if (transcriptStr === "Đang được AI xử lý ngầm..." || (!lesson.youtubeVideoId && !transcriptStr)) {
      return {
        isProcessing: true,
        isError: false,
        step: 1,
        stepName: "Ghép file & trích xuất Audio (FFmpeg)",
        progress: 15,
        etaSeconds: 35
      };
    }

    // Đã hoàn tất!
    return {
      isProcessing: false,
      isError: false,
      step: 6,
      stepName: "Hoàn tất!",
      progress: 100,
      etaSeconds: 0
    };
  } catch (err: any) {
    return { isProcessing: false, isError: true, errorMessage: err.message };
  }
}
