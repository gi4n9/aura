import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { runWithConcurrencyLimit } from "@/lib/ocr-cache";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";

// Cấu hình đường dẫn fluent-ffmpeg từ các package static
ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath);

const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

/**
 * Lấy độ dài file audio bằng ffprobe
 */
const getAudioDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve) => {
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

/**
 * Phát hiện các điểm silence bằng filter silencedetect của ffmpeg
 */
function detectSilencePoints(audioPath: string, noiseDb = -35, minDuration = 0.5): Promise<number[]> {
  return new Promise((resolve) => {
    const normalizedPath = path.normalize(audioPath);
    const cmd = `"${ffmpegPath}" -i "${normalizedPath}" -af silencedetect=noise=${noiseDb}dB:d=${minDuration} -f null -`;
    console.log(`🔍 Đang quét silence points bằng FFmpeg...`);
    
    exec(cmd, (error, stdout, stderr) => {
      const silenceStarts: number[] = [];
      const output = stderr + "\n" + stdout;
      const lines = output.split("\n");
      
      for (const line of lines) {
        const match = line.match(/silence_start:\s*([\d.]+)/);
        if (match) {
          silenceStarts.push(parseFloat(match[1]));
        }
      }
      
      const uniqueSilence = Array.from(new Set(silenceStarts)).sort((a, b) => a - b);
      console.log(`🔍 Phát hiện được ${uniqueSilence.length} điểm silence.`);
      resolve(uniqueSilence);
    });
  });
}

/**
 * Tính toán các điểm cắt adaptive dựa trên silence points
 */
function calculateSplitPoints(
  silenceStarts: number[],
  duration: number,
  minSize = 150,     // 2.5 phút
  maxSize = 240,     // 4 phút
  targetSize = 180,  // 3 phút
  overlap = 3        // 3s overlap
): Array<{ start: number; end: number }> {
  const chunks: Array<{ start: number; end: number }> = [];
  let currentStart = 0;

  while (currentStart < duration) {
    // Nếu phần còn lại nhỏ hơn kích thước tối đa, gộp thành chunk cuối cùng luôn
    if (duration - currentStart <= maxSize) {
      chunks.push({ start: currentStart, end: duration });
      break;
    }

    const preferredStart = currentStart + minSize;
    const preferredEnd = currentStart + maxSize;
    const targetEnd = currentStart + targetSize;

    // Tìm các điểm silence nằm trong khoảng tối ưu [preferredStart, preferredEnd]
    const candidates = silenceStarts.filter(s => s >= preferredStart && s <= preferredEnd);

    let splitAt = targetEnd;
    if (candidates.length > 0) {
      // Chọn điểm gần với targetEnd nhất
      candidates.sort((a, b) => Math.abs(a - targetEnd) - Math.abs(b - targetEnd));
      splitAt = candidates[0];
      console.log(`🎯 Chọn điểm silence thích ứng tại giây thứ ${splitAt} (trong khoảng tối ưu)`);
    } else {
      // Mở rộng khoảng tìm kiếm nếu không có điểm nào trong khoảng tối ưu
      const wideStart = currentStart + minSize * 0.7;
      const wideEnd = Math.min(currentStart + maxSize * 1.3, duration);
      const wideCandidates = silenceStarts.filter(s => s >= wideStart && s <= wideEnd);
      if (wideCandidates.length > 0) {
        wideCandidates.sort((a, b) => Math.abs(a - targetEnd) - Math.abs(b - targetEnd));
        splitAt = wideCandidates[0];
        console.log(`🎯 Chọn điểm silence thích ứng tại giây thứ ${splitAt} (khoảng mở rộng)`);
      } else {
        console.log(`⚠️ Không tìm thấy điểm silence nào hợp lý, cắt cứng tại giây thứ ${splitAt}`);
      }
    }

    if (splitAt >= duration) {
      splitAt = duration;
    }

    chunks.push({ start: currentStart, end: splitAt });

    // Điểm bắt đầu của chunk kế tiếp lùi lại một khoảng overlap
    currentStart = Math.max(0, splitAt - overlap);

    // Tránh vòng lặp vô tận nếu cắt quá ngắn
    if (splitAt - currentStart <= overlap) {
      currentStart = splitAt;
    }
  }

  return chunks;
}

/**
 * Cắt nhỏ audio thành file tạm
 */
function sliceAudio(
  inputPath: string,
  outputPath: string,
  start: number,
  end: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(start)
      .duration(end - start)
      .audioCodec('aac')
      .audioBitrate('64k')
      .audioChannels(1)
      .output(outputPath)
      .on('end', () => {
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Cắt audio thất bại từ ${start} đến ${end}:`, err);
        reject(err);
      })
      .run();
  });
}

/**
 * Tính mã SHA-256 hash của một file
 */
function getFileHash(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Lấy transcript từ DB cache
 */
async function getCachedTranscript(hash: string): Promise<string | null> {
  try {
    const entry = await prisma.ocrCache.findUnique({
      where: { hash }
    });
    if (entry && entry.type === "audio") {
      return entry.text;
    }
  } catch (err) {
    console.error("⚠️ Lỗi kiểm tra STT Cache trong DB:", err);
  }
  return null;
}

/**
 * Ghi transcript vào DB cache
 */
async function setCachedTranscript(hash: string, text: string, meta: any): Promise<void> {
  try {
    await prisma.ocrCache.upsert({
      where: { hash },
      update: { type: "audio", text, meta },
      create: { hash, type: "audio", text, meta }
    });
  } catch (err) {
    console.error("⚠️ Lỗi lưu STT Cache vào DB:", err);
  }
}

/**
 * Hàm retry tự động với Exponential Backoff và Random Jitter
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelayMs = 2000
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt >= retries) {
        throw error;
      }
      // Delay = initialDelay * 2^(attempt-1) + Jitter (0 -> 1000ms)
      const delay = initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.warn(`⚠️ Gọi API thất bại (Lần ${attempt}/${retries}). Đang thử lại sau ${Math.round(delay)}ms... Lỗi: ${error.message || error}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Retry failed");
}

/**
 * Gọi STT bằng Gemini model đính kèm audio inline (base64)
 */
async function transcribeChunkWithGeminiModel(
  chunkPath: string,
  modelName: string,
  prompt: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1
    }
  });

  const base64Audio = fs.readFileSync(chunkPath).toString("base64");
  
  const contentParts = [
    {
      inlineData: {
        data: base64Audio,
        mimeType: "audio/mp4" // định dạng aac từ ffmpeg
      }
    },
    prompt
  ];

  const result = await model.generateContent(contentParts);
  const text = result.response.text();
  if (!text) {
    throw new Error(`Empty response from model ${modelName}`);
  }
  return text.trim();
}

/**
 * Hiệu chỉnh lỗi chính tả cho text bóc băng từ Whisper
 */
async function correctWhisperChunk(
  rawText: string,
  courseTitle: string,
  chapterTitle: string,
  lessonTitle: string
): Promise<string> {
  const prompt = `
Bạn là chuyên gia hiệu chỉnh bản ghi âm (transcript) tiếng Việt bài giảng CNTT/Lập trình.
Dưới đây là một đoạn transcript bóc băng bằng công cụ STT tự động từ audio (có thể chứa nhiều lỗi phát âm tiếng Anh hoặc từ rời rạc).

NGỮ CẢNH BÀI HỌC:
- Khóa học: "${courseTitle}"
- Chương: "${chapterTitle}"
- Bài học: "${lessonTitle}"

VĂN BẢN STT GỐC:
"""
${rawText}
"""

NHIỆM VỤ:
1. Hãy sửa các lỗi chính tả, đặc biệt là các thuật ngữ tiếng Anh bị nhận dạng sai thành tiếng Việt hoặc từ vô nghĩa (ví dụ: "Asian Skill" -> "Agentic Skill", "ây-dần" -> "Agent", "phải tôn" -> "Python").
2. Đảm bảo cấu trúc câu rõ ràng, giữ nguyên ý nghĩa và phong cách giảng dạy của giảng viên.
3. Tuyệt đối KHÔNG tự ý thêm thông tin, KHÔNG tóm tắt hay bình luận.

Trả về duy nhất đoạn văn bản đã hiệu chỉnh, không kèm bất kỳ giải thích nào khác.
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
  });

  return chatCompletion.choices[0].message.content || rawText;
}

/**
 * Gọi STT với Fallback Chain & Retry Jitter cho 1 chunk
 */
async function callSTTWithRetry(
  chunkPath: string,
  prompt: string,
  courseTitle: string,
  chapterTitle: string,
  lessonTitle: string,
  chunkIndex: number
): Promise<{ text: string; modelUsed: string; isFallback: boolean }> {
  // 1. Thử với gemini-2.5-flash (Primary)
  try {
    const text = await retryWithBackoff(() => 
      transcribeChunkWithGeminiModel(chunkPath, "gemini-2.5-flash", prompt)
    );
    return { text, modelUsed: "gemini-2.5-flash", isFallback: false };
  } catch (err: any) {
    console.warn(`⚠️ gemini-2.5-flash thất bại ở chunk ${chunkIndex}: ${err.message}. Chuyển sang gemini-1.5-flash...`);
  }

  // 2. Thử với gemini-1.5-flash (Secondary)
  try {
    const text = await retryWithBackoff(() => 
      transcribeChunkWithGeminiModel(chunkPath, "gemini-1.5-flash", prompt)
    );
    return { text, modelUsed: "gemini-1.5-flash", isFallback: true };
  } catch (err: any) {
    console.warn(`⚠️ gemini-1.5-flash thất bại ở chunk ${chunkIndex}: ${err.message}. Chuyển sang Whisper fallback...`);
  }

  // 3. Fallback sang Whisper (Groq) + Llama correction
  try {
    const rawWhisper = await retryWithBackoff(async () => {
      const response = await groq.audio.transcriptions.create({
        file: fs.createReadStream(chunkPath),
        model: "whisper-large-v3",
        language: "vi",
        response_format: "json",
      });
      return response.text;
    });

    console.log(`💡 Đã lấy raw Whisper transcript cho chunk ${chunkIndex}. Đang chạy Llama correction...`);
    const correctedText = await correctWhisperChunk(rawWhisper, courseTitle, chapterTitle, lessonTitle);
    return { text: correctedText, modelUsed: "whisper+llama", isFallback: true };
  } catch (err: any) {
    console.error(`❌ Tất cả các model STT đều thất bại cho chunk ${chunkIndex}: ${err.message}`);
    throw err;
  }
}

/**
 * Hiệu đính một phần transcript (sử dụng Gemini Text model)
 */
async function cleanMergedTranscriptBlock(
  rawText: string,
  courseTitle: string,
  chapterTitle: string,
  lessonTitle: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `
Bạn là một chuyên gia biên tập và hiệu đính văn bản chuyên nghiệp.
Dưới đây là bản dịch ghi âm (transcript) của một bài giảng lập trình/CNTT tiếng Việt được ghép lại từ nhiều đoạn nhỏ (có thể bị lặp từ ở các điểm nối hoặc chứa lỗi chính tả nhỏ).

VĂN BẢN CẦN HIỆU ĐĨNH:
"""
${rawText}
"""

NHIỆM VỤ:
1. Hãy loại bỏ các từ/câu bị lặp ở các điểm nối (do chia đoạn audio bị gối đầu).
2. Sửa các lỗi chính tả, ngữ pháp rõ ràng (đặc biệt là thuật ngữ tiếng Anh bị ghi sai hoặc rời rạc).
3. Đảm bảo văn bản trôi chảy, tự nhiên và liền mạch.
4. TUYỆT ĐỐI KHÔNG tóm tắt, KHÔNG tự ý thêm nội dung mới, KHÔNG giải thích, giữ nguyên đại từ nhân xưng và phong cách nói của giảng viên.

Trả về toàn bộ văn bản đã được hiệu chỉnh sạch sẽ, không kèm bất kỳ giải thích nào khác.
`;

  try {
    const result = await retryWithBackoff(() => model.generateContent(prompt));
    return result.response.text().trim();
  } catch (err: any) {
    console.error(`⚠️ Gemini cleanup block thất bại: ${err.message}. Trả về văn bản gốc.`);
    return rawText;
  }
}

/**
 * Hiệu đính toàn bộ transcript an toàn chống tràn context đầu ra
 */
async function cleanMergedTranscriptSafely(
  rawText: string,
  courseTitle: string,
  chapterTitle: string,
  lessonTitle: string
): Promise<string> {
  if (rawText.length <= 20000) {
    return cleanMergedTranscriptBlock(rawText, courseTitle, chapterTitle, lessonTitle);
  }

  console.log(`📝 Bản dịch thô dài (${rawText.length} ký tự). Đang chia thành các khối để hiệu đính an toàn...`);
  
  // Tách câu dựa trên các dấu chấm câu tiếng Việt phổ biến
  const sentences = rawText.match(/[^.!?。]+[.!?。]+[\])'"\u201d]*|[^.!?。]+$/g) || [rawText];
  const blocks: string[] = [];
  let currentBlock = "";

  for (const sentence of sentences) {
    if (currentBlock.length + sentence.length > 15000) {
      blocks.push(currentBlock);
      currentBlock = sentence;
    } else {
      currentBlock += (currentBlock ? " " : "") + sentence;
    }
  }
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  console.log(`📦 Đã chia thành ${blocks.length} khối để hiệu đính.`);
  const cleanedBlocks: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    console.log(`🧹 Đang hiệu đính khối ${i + 1}/${blocks.length}...`);
    const cleaned = await cleanMergedTranscriptBlock(blocks[i], courseTitle, chapterTitle, lessonTitle);
    cleanedBlocks.push(cleaned);
  }

  return cleanedBlocks.join(" ");
}

/**
 * Hàm điều phối chính (Orchestrator): Transcribe âm thanh bằng Gemini-First
 */
export async function transcribeWithGemini(
  audioFilePath: string,
  courseTitle: string,
  chapterTitle: string,
  lessonTitle: string
): Promise<string> {
  console.log(`🎬 Bắt đầu STT Pipeline (Gemini-First) cho bài học: "${lessonTitle}"`);

  // 1. Lấy tổng độ dài audio
  const duration = await getAudioDuration(audioFilePath);
  console.log(`⏱️ Tổng thời lượng: ${duration} giây (${(duration / 60).toFixed(1)} phút)`);

  // 2. Phát hiện các điểm silence
  const silencePoints = await detectSilencePoints(audioFilePath);

  // 3. Tính toán các điểm cắt adaptive
  const splitPoints = calculateSplitPoints(silencePoints, duration);
  console.log(`✂️ Đã tính toán ${splitPoints.length} chunks adaptive.`);

  // 4. Tạo thư mục tạm lưu các file chunk
  const tempDir = path.join(process.cwd(), "tmp", `chunks_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const chunkPaths: string[] = [];
  const resolvedTranscripts = new Array<string>(splitPoints.length).fill("");
  const chunkStats: any[] = [];

  try {
    // 5. Thực hiện cắt nhỏ audio
    for (let i = 0; i < splitPoints.length; i++) {
      const { start, end } = splitPoints[i];
      const chunkPath = path.join(tempDir, `chunk_${i}.m4a`);
      await sliceAudio(audioFilePath, chunkPath, start, end);
      chunkPaths.push(chunkPath);
    }

    // 6. Xây dựng các tác vụ xử lý chunk
    const factories = chunkPaths.map((chunkPath, i) => {
      return async () => {
        const startTime = Date.now();
        const { start, end } = splitPoints[i];
        const chunkDuration = end - start;

        console.log(`⏳ Đang xử lý chunk ${i + 1}/${splitPoints.length} (Thời lượng: ${Math.round(chunkDuration)}s)...`);

        // Tính mã hash của file chunk để kiểm tra Cache
        const hash = getFileHash(chunkPath);
        const cachedText = await getCachedTranscript(hash);

        if (cachedText) {
          console.log(`💾 Chunk ${i + 1} (hash: ${hash}) đã có trong Cache DB.`);
          resolvedTranscripts[i] = cachedText;
          chunkStats.push({
            chunk_id: i + 1,
            duration: `${Math.round(chunkDuration)}s`,
            latency: `${Date.now() - startTime}ms`,
            model: "cache",
            cached: true,
            isFallback: false
          });
          return cachedText;
        }

        // Lấy ngữ cảnh từ chunk trước đó nếu có
        const previousChunkText = i > 0 ? resolvedTranscripts[i - 1] : undefined;

        // Xây dựng Prompt
        let prompt = `Bạn là chuyên gia bóc băng (transcription) bài giảng tiếng Việt chuyên ngành CNTT/Lập trình.
Nhiệm vụ: Nghe đoạn audio đính kèm và ghi lại chính xác văn bản tiếng Việt.

NGỮ CẢNH BÀI HỌC:
- Khóa học: "${courseTitle}"
- Chương: "${chapterTitle}"
- Bài học: "${lessonTitle}"

YÊU CẦU QUAN TRỌNG:
1. Giảng viên Việt Nam thường phát âm tiếng Anh chưa chuẩn (ví dụ: "Asian Skill" -> "Agentic Skill", "ây-dần" -> "Agent", "phải-tôn" -> "Python"). Dựa vào ngữ cảnh bài học, hãy nhận diện đúng và ghi đúng thuật ngữ tiếng Anh gốc.
2. Nhận diện chính xác các ký tự, từ đơn, tên biến hoặc cú pháp lập trình khi giảng viên đánh vần hoặc đọc code.
3. Giữ nguyên cấu trúc câu nói tự nhiên của giảng viên, KHÔNG tóm tắt, KHÔNG giải thích, KHÔNG thêm bớt nội dung.
`;

        if (previousChunkText) {
          prompt += `
4. Đây là văn bản của đoạn ngay trước đó để bạn hiểu ngữ cảnh và nối ý:
"""
${previousChunkText.slice(-1000)}
"""
Hãy tiếp tục ghi âm đoạn tiếp theo liền mạch với đoạn trên.
`;
        }

        prompt += `\nTrả về bản dịch plain text duy nhất, không có markdown hay bất kỳ bình luận nào.`;

        // Gọi API với Fallback chain
        let resultText = "";
        let modelUsed = "";
        let isFallback = false;

        try {
          const res = await callSTTWithRetry(chunkPath, prompt, courseTitle, chapterTitle, lessonTitle, i + 1);
          resultText = res.text;
          modelUsed = res.modelUsed;
          isFallback = res.isFallback;
        } catch (err: any) {
          console.error(`❌ Lỗi nghiêm trọng: Không thể bóc băng chunk ${i + 1}:`, err.message);
          resultText = "";
          modelUsed = "failed";
        }

        // Lưu vào Cache DB nếu thành công
        if (resultText && modelUsed !== "failed") {
          await setCachedTranscript(hash, resultText, {
            duration: chunkDuration,
            model: modelUsed,
            chunkIndex: i + 1
          });
        }

        resolvedTranscripts[i] = resultText;

        chunkStats.push({
          chunk_id: i + 1,
          duration: `${Math.round(chunkDuration)}s`,
          latency: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          model: modelUsed,
          cached: false,
          isFallback
        });

        console.log(`✅ Hoàn thành chunk ${i + 1}/${splitPoints.length}. Model: ${modelUsed}. Độ dài: ${resultText.length} ký tự.`);
        return resultText;
      };
    });

    // 7. Thực thi song song với Concurrency Limit = 2
    await runWithConcurrencyLimit(factories, 2);

    // 8. In bảng thống kê xử lý các chunks ra console
    console.log("📊 BẢNG THỐNG KÊ XỬ LÝ CHUNKS STT:");
    console.table(chunkStats);

    // 9. Ghép nối và chạy Cleanup Pass hiệu đính
    const mergedRaw = resolvedTranscripts.filter(Boolean).join(" ");
    console.log(`🔗 Tổng độ dài transcript thô ghép lại: ${mergedRaw.length} ký tự.`);

    console.log("🧹 Đang chạy Gemini Cleanup Pass để tinh chỉnh...");
    const cleanedTranscript = await cleanMergedTranscriptSafely(mergedRaw, courseTitle, chapterTitle, lessonTitle);
    console.log(`✨ Đã hoàn thành Cleanup Pass. Độ dài transcript sạch: ${cleanedTranscript.length} ký tự.`);

    return cleanedTranscript;
  } finally {
    // 10. Dọn dẹp các files chunk tạm trên đĩa
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
        console.log(`🧹 Đã dọn dẹp thư mục chunks tạm: ${tempDir}`);
      }
    } catch (e) {
      console.warn("⚠️ Không thể dọn dẹp thư mục chunks tạm:", e);
    }
  }
}
