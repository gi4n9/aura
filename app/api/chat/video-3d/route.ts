import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getPromptForVideo3D } from "@/app/actions/video-chat";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });



export async function POST(req: Request) {
    try {
        const { lessonId, query } = await req.json();
        console.log("Jarvis 3D Request Received:", { lessonId, query });

        if (!lessonId || !query) {
            return Response.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Trích xuất context & sinh prompt RAG
        const { systemPrompt, isFromCurriculum, maxSimilarity } = await getPromptForVideo3D(lessonId, query);

        // Thiết lập headers trả về metadata trước
        const headers = new Headers({
            "Content-Type": "text/plain; charset=utf-8",
            "x-max-similarity": maxSimilarity.toString(),
            "x-is-from-curriculum": isFromCurriculum.toString()
        });

        // 2. Stream văn bản về cho Client để hiển thị lập tức
        try {
            const result = await streamText({
                model: google("gemini-2.5-flash"),
                maxRetries: 0,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: query }
                ]
            });

            // Đọc chunk đầu tiên để ép API thực thi và bắt lỗi (nếu có, VD: 429 Quota Exceeded)
            const reader = result.textStream.getReader();
            const { value, done } = await reader.read();

            // Nếu stream bị đóng ngay lập tức mà không có dữ liệu (thường do lỗi ngầm không ném ra ngoài như Quota Exceeded)
            if (done && !value) {
                throw new Error("Gemini stream closed immediately with no data. Suspected Quota Error.");
            }

            const stream = new ReadableStream({
                async start(controller) {
                    if (!done && value) {
                        controller.enqueue(new TextEncoder().encode(value));
                    }
                    try {
                        while (true) {
                            const { value: nextVal, done: isDone } = await reader.read();
                            if (isDone) break;
                            if (nextVal) controller.enqueue(new TextEncoder().encode(nextVal));
                        }
                    } catch (e) {
                        console.error("Lỗi stream Gemini:", e);
                    } finally {
                        controller.close();
                    }
                }
            });

            return new Response(stream, { headers });
        } catch (geminiError: any) {
            console.warn("⚠️ Gemini Stream Quota Exceeded. Falling back to Groq stream...", geminiError.message);
            try {
                // Sử dụng Groq Llama 3.3 làm phương án dự phòng dạng Stream qua chuẩn của Vercel AI
                const { createOpenAI } = await import("@ai-sdk/openai");
                const groqAi = createOpenAI({
                    baseURL: "https://api.groq.com/openai/v1",
                    apiKey: process.env.GROQ_API_KEY
                });

                const groqResult = await streamText({
                    model: groqAi("llama-3.3-70b-versatile"),
                    maxRetries: 0,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: query }
                    ]
                });

                const reader = groqResult.textStream.getReader();
                const { value, done } = await reader.read();
                
                console.log("Groq First Chunk:", { done, value });

                const stream = new ReadableStream({
                    async start(controller) {
                        if (!done && value) {
                            console.log("Groq Enqueuing first chunk:", value);
                            controller.enqueue(new TextEncoder().encode(value));
                        }
                        try {
                            while (true) {
                                const { value: nextVal, done: isDone } = await reader.read();
                                if (isDone) {
                                    console.log("Groq Stream Done");
                                    break;
                                }
                                if (nextVal) {
                                    // Bỏ console log quá nhiều để tránh spam, chỉ log độ dài
                                    console.log(`Groq Chunk Length: ${nextVal.length}`);
                                    controller.enqueue(new TextEncoder().encode(nextVal));
                                }
                            }
                        } catch (e) {
                            console.error("Lỗi stream Groq:", e);
                            controller.enqueue(new TextEncoder().encode("\n[Lỗi kết nối Groq]"));
                        } finally {
                            controller.close();
                        }
                    }
                });

                return new Response(stream, { headers });
            } catch (groqError: any) {
                console.error("❌ Lỗi cả Gemini và Groq stream:", groqError.message);
                return Response.json({ error: "All AI services failed" }, { status: 500 });
            }
        }
    } catch (error: any) {
        console.error("Jarvis Streaming Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
