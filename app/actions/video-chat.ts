"use server";

import { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/lib/ai/embedding";
import { google } from "@ai-sdk/google";
import { streamText, generateText } from "ai";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// TYPE DEFINITIONS
interface VideoSegment {
    id: string;
    content: string;
    start_time: number;
    end_time: number;
    similarity: number;
}

// 1. TẠO EMBEDDING CHO MỘT LESSON (gọi từ instructor panel)
export async function processLessonEmbeddings(lessonId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const { db } = await import("@/lib/prisma");
        const lesson = await db.lesson.findUnique({
            where: { id: lessonId },
            select: { transcript: true, duration: true }
        });

        if (!lesson || !lesson.transcript) {
            return { success: false, error: "Không tìm thấy Transcript của bài học này." };
        }

        const { generateEmbeddings } = await import("@/lib/ai/embedding");

        // Chunk transcript with overlap
        const chunks = chunkText(lesson.transcript, lesson.duration || 60);

        if (chunks.length === 0) {
            return { success: false, error: "Transcript rỗng, không thể tạo embedding." };
        }

        const texts = chunks.map(c => c.text);
        const embeddings = await generateEmbeddings(texts);

        // Xóa embedding cũ
        await supabase.from('video_embeddings').delete().eq('lesson_id', lessonId);

        // Insert theo batch
        const batchSize = 20;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize).map((chunk, idx) => ({
                lesson_id: lessonId,
                content: chunk.text,
                start_time: chunk.start,
                end_time: chunk.end,
                embedding: embeddings[i + idx],
            }));

            const { error } = await supabase.from('video_embeddings').insert(batch);
            if (error) {
                console.error(`Embedding batch ${i} error:`, error.message);
            }
        }

        return { success: true, count: chunks.length };

    } catch (error: any) {
        console.error("Process Embedding Error:", error);
        return { success: false, error: error.message };
    }
}

// 2. CHAT WITH VIDEO (RAG Pipeline)
export async function chatWithVideo(lessonId: string, query: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        // Bước 1: Tạo embedding cho câu hỏi
        const queryEmbedding = await generateEmbedding(query);

        if (!queryEmbedding || queryEmbedding.length === 0) {
            return new Response(
                "Xin lỗi, tôi không thể xử lý câu hỏi lúc này. Vui lòng thử lại.",
                { status: 200, headers: { 'Content-Type': 'text/plain' } }
            );
        }

        // Bước 2: Vector Search - Tìm đoạn transcript liên quan nhất
        const { data: segments, error } = await supabase.rpc('match_video_segments', {
            query_embedding: queryEmbedding,
            match_threshold: 0.35,  // Hạ threshold để có nhiều kết quả hơn
            match_count: 6,          // Lấy 6 đoạn liên quan nhất
            filter_lesson_id: lessonId
        });

        if (error) {
            console.error("Vector search error:", error);
            // Fallback: trả lời dù không tìm được context
            return streamFallbackResponse(query);
        }

        const matchedSegments = (segments as VideoSegment[]) || [];

        // Bước 3: Xây dựng Context cho AI
        let contextText = "";
        if (matchedSegments.length > 0) {
            contextText = matchedSegments
                .map(s => `[Thời điểm ${formatTime(s.start_time)} - ${formatTime(s.end_time)}]: ${s.content}`)
                .join("\n\n");
        }

        const systemPrompt = `
Bạn là trợ giảng AI thông minh cho nền tảng học trực tuyến Aura LMS.

**VAI TRÒ:**
- Bạn giúp học viên hiểu bài giảng video bằng cách trả lời câu hỏi dựa trên nội dung transcript.
- Bạn trả lời bằng tiếng Việt, rõ ràng, dễ hiểu.

**QUY TẮC QUAN TRỌNG:**
1. Trả lời DỰA TRÊN ngữ cảnh (Context) được cung cấp bên dưới.
2. Nếu câu hỏi nằm ngoài Context, hãy nói: "📌 Thông tin này không có trong bài giảng hiện tại. Bạn có thể xem thêm tài liệu bổ sung hoặc hỏi giảng viên."
3. **LUÔN trích dẫn mốc thời gian** dạng [MM:SS] khi đề cập đến nội dung (ví dụ: "Tại [05:20], giảng viên giải thích...").
4. Format câu trả lời bằng Markdown với bullet points, code blocks khi cần.
5. Ngắn gọn nhưng đầy đủ. Không lặp lại câu hỏi.
6. **BẮT BUỘC CUỐI CÙNG:** Luôn thêm mục "💡 **Gợi ý câu hỏi tiếp theo:**" và liệt kê ra 3 câu hỏi ngắn gọn mà người dùng có thể muốn hỏi tiếp theo dựa trên kiến thức bạn vừa cung cấp hoặc các phần khác của video. (Format dạng list với dấu sao *).

${contextText ? `**NGỮ CẢNH TỪ VIDEO:**\n${contextText}` : "**LƯU Ý:** Không tìm thấy nội dung liên quan trong video. Hãy trả lời chung dựa trên kiến thức của bạn nhưng lưu ý rằng câu trả lời không dựa trên bài giảng."}
        `.trim();

        // Bước 4: Stream response từ Gemini và Lưu vào DB
        const result = streamText({
            model: google('gemini-2.5-flash'),
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            onFinish: async ({ text }) => {
                try {
                    const { db } = await import("@/lib/prisma");

                    // 1. Tìm hoặc tạo ChatSession cho lessonId này
                    let session = await db.chatSession.findFirst({
                        where: { userId: user.id, lessonId: lessonId }
                    });

                    if (!session) {
                        session = await db.chatSession.create({
                            data: {
                                userId: user.id,
                                lessonId: lessonId,
                                title: query.substring(0, 50) + (query.length > 50 ? "..." : "")
                            }
                        });
                    }

                    // 2. Lưu tin nhắn User
                    await db.message.create({
                        data: {
                            sessionId: session.id,
                            role: 'user',
                            content: query
                        }
                    });

                    // 3. Lưu tin nhắn Assistant (AI)
                    await db.message.create({
                        data: {
                            sessionId: session.id,
                            role: 'assistant',
                            content: text
                        }
                    });

                } catch (saveError) {
                    console.error("Vấn đề lưu lịch sử chat vào DB:", saveError);
                }
            }
        });

        return result.toTextStreamResponse();

    } catch (error: any) {
        console.error("Chat with video error:", error);
        return new Response(
            `Xin lỗi, có lỗi xảy ra: ${error.message}. Vui lòng thử lại.`,
            { status: 200, headers: { 'Content-Type': 'text/plain' } }
        );
    }
}

// 3. KIỂM TRA XEM LESSON ĐÃ CÓ EMBEDDING CHƯA
export async function checkLessonEmbeddings(lessonId: string) {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('video_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_id', lessonId);

    return {
        hasEmbeddings: (count || 0) > 0,
        count: count || 0,
        error: error?.message
    };
}

// ===== HELPER FUNCTIONS =====

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function streamFallbackResponse(query: string) {
    const result = streamText({
        model: google('gemini-2.5-flash'),
        messages: [
            {
                role: "system",
                content: "Bạn là trợ giảng AI. Bài giảng này chưa được phân tích embedding. Hãy trả lời câu hỏi dựa trên kiến thức chung nhưng lưu ý rằng bạn không có context cụ thể từ video. Trả lời bằng tiếng Việt."
            },
            { role: "user", content: query }
        ],
    });
    return result.toTextStreamResponse();
}

// Chunk text with overlapping windows
function chunkText(text: string, duration: number): { text: string; start: number; end: number }[] {
    if (!text || text.length === 0) return [];

    const chunkSize = 500;
    const overlapSize = 80;
    const totalChars = text.length;
    const charsPerSec = totalChars / (duration || 1);

    const sentences = text.match(/[^.!?。]+[.!?。]+[\])'"]*|[^.!?。]+$/g) || [text];

    const chunks: { text: string; start: number; end: number }[] = [];
    let currentText = "";
    let currentStartChar = 0;
    let charOffset = 0;

    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        if (currentText.length + trimmed.length <= chunkSize) {
            currentText += (currentText ? " " : "") + trimmed;
        } else {
            if (currentText) {
                const startTime = Math.floor(currentStartChar / charsPerSec);
                const endTime = Math.floor((currentStartChar + currentText.length) / charsPerSec);
                chunks.push({
                    text: currentText,
                    start: Math.min(startTime, duration),
                    end: Math.min(endTime, duration),
                });
            }

            const overlapText = currentText.length > overlapSize
                ? currentText.slice(-overlapSize)
                : currentText;

            currentStartChar = charOffset - overlapText.length;
            currentText = overlapText + " " + trimmed;
        }

        charOffset += trimmed.length + 1;
    }

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

export async function getPromptForVideo3D(lessonId: string, query: string) {
    const supabase = await createClient();
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error("Không thể tạo embedding cho câu hỏi");
    }

    const { data: segments, error } = await supabase.rpc('match_video_segments', {
        query_embedding: queryEmbedding,
        match_threshold: 0.25,
        match_count: 5,
        filter_lesson_id: lessonId
    });

    if (error) throw error;
    // Phân đoạn phù hợp
    const matchedSegments = (segments as VideoSegment[]) || [];

    // Tính độ tương đồng lớn nhất
    const maxSimilarity = matchedSegments.length > 0 ? Math.max(...matchedSegments.map(s => s.similarity)) : 0;
    // Kiểm tra xem có từ giáo trình không
    const isFromCurriculum = maxSimilarity >= 0.45;

    // Lấy context
    let contextText = "";
    if (matchedSegments.length > 0) {
        contextText = matchedSegments
            .map(s => `[Thời điểm ${formatTime(s.start_time)} - ${formatTime(s.end_time)} (Độ tương đồng: ${s.similarity.toFixed(2)})]: ${s.content}`)
            .join("\n\n");
    }

    const systemPrompt = `
Bạn là Jarvis - Trợ lý ảo AI học tập thông minh tại Aura LMS.

NGUỒN THÔNG TIN DUY NHẤT:
- Dưới đây là nội dung giảng dạy trong video bài giảng:
${contextText}

QUY TẮC PHÒNG CHỐNG ẢO GIÁC (HALLUCINATION) CỰC KỲ NGHIÊM NGẶT:
1. Bạn chỉ được khẳng định là đúng nếu thông tin đó xuất hiện trong nội dung video bài giảng phía trên.
2. Nếu câu hỏi yêu cầu thông tin không có trong video bài giảng:
   - Bạn PHẢI nói rõ: "📌 Giáo trình bài học hiện tại không đề cập đến thông tin này."
   - Sau đó, bạn có thể trả lời ngắn gọn dựa trên kiến thức bên ngoài nhưng PHẢI nhấn mạnh đó là "Kiến thức mở rộng tham khảo". Tuyệt đối không được gán ghép kiến thức ngoài đó là của bài học.
3. Luôn luôn trích dẫn timestamp dưới định dạng [MM:SS] (ví dụ: "[02:15]") khi nói về nội dung xuất hiện trong bài giảng.
4. Trả lời bằng tiếng Việt, ngắn gọn, súc tích, đi thẳng vào vấn đề sinh viên thắc mắc.

CẤU TRÚC PHẢN HỒI BẮT BUỘC:
[Nội dung câu trả lời]
💡 **Câu hỏi gợi ý tiếp theo:**
* [Câu hỏi gợi ý 1]
* [Câu hỏi gợi ý 2]
`;

    return {
        systemPrompt,
        isFromCurriculum,
        maxSimilarity
    };
}

export async function chatWithVideo3D(lessonId: string, query: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized", status: 401 };

    try {
        const { systemPrompt, isFromCurriculum, maxSimilarity } = await getPromptForVideo3D(lessonId, query);

        let resultText = "";
        try {
            const result = await generateText({
                model: google('gemini-2.5-flash'),
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: query }
                ]
            });
            resultText = result.text;
        } catch (geminiError: any) {
            console.warn("⚠️ Lỗi Gemini (Có thể do hết quota 429), chuyển sang dùng Groq (Llama 3.3):", geminiError.message);
            try {
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: query }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.4,
                });
                resultText = chatCompletion.choices[0].message.content || "";
            } catch (groqError: any) {
                console.error("❌ Lỗi cả Gemini và Groq:", groqError.message);
                throw new Error(`Cả hai dịch vụ AI (Gemini & Groq) đều gặp sự cố: ${groqError.message}`);
            }
        }

        return {
            text: resultText,
            isFromCurriculum,
            maxSimilarity
        };

    } catch (e: any) {
        console.error(e);
        return { error: e.message };
    }
}

