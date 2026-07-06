import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { getPromptForVideo3D } from "@/app/actions/video-chat";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
    try {
        const { lessonId, query } = await req.json();

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
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: query }
                ]
            });

            return result.toTextStreamResponse({ headers });
        } catch (geminiError: any) {
            console.warn("⚠️ Gemini Stream Quota Exceeded. Falling back to Groq stream...", geminiError.message);
            try {
                // Sử dụng Groq Llama 3.3 làm phương án dự phòng dạng Stream
                const responseStream = await groq.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: query }
                    ],
                    stream: true,
                    temperature: 0.4
                });

                // Chuyển đổi Groq stream sang ReadableStream chuẩn Web
                const stream = new ReadableStream({
                    async start(controller) {
                        for await (const chunk of responseStream) {
                            const text = chunk.choices[0]?.delta?.content || "";
                            if (text) {
                                controller.enqueue(new TextEncoder().encode(text));
                            }
                        }
                        controller.close();
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
