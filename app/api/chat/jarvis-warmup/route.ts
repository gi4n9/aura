import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type TimelineItem = {
    time: number;
    label: string;
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) return Response.json({ error: "Missing lessonId" }, { status: 400 });

    try {
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            select: { 
                title: true, 
                transcript: true,
                timeline: true,
                jarvisWarmup: true
            }
        });

        if (!lesson) {
            return Response.json({ error: "Lesson not found" }, { status: 404 });
        }

        // 1. Nếu đã có dữ liệu cache trong DB -> Trả về ngay lập tức (0 token cost!)
        if (lesson.jarvisWarmup) {
            return Response.json(lesson.jarvisWarmup);
        }

        // 2. Nếu chưa có -> Gọi Gemini sinh 1 lần duy nhất, bám sát theo transcript bài học
        const timeline = (lesson.timeline as unknown as TimelineItem[]) || [];
        const transcript = lesson.transcript || "";

        // Trường hợp bài học trống transcript -> Dùng mẫu mặc định tĩnh
        if (!transcript.trim()) {
            const defaultWarmup = {
                greeting: `Chào mừng bạn đến với bài học "**${lesson.title}**"! Tôi là Jarvis, trợ lý ảo học tập 1-kèm-1 của bạn. Bạn có thắc mắc gì về bài giảng này không?`,
                suggestions: [
                    "Tóm tắt nội dung chính của bài giảng này.",
                    "Các khái niệm quan trọng nhất cần ghi nhớ là gì?",
                    "Bài học này cung cấp những kiến thức thực tế nào?"
                ]
            };
            
            // Lưu cache lại luôn
            await prisma.lesson.update({
                where: { id: lessonId },
                data: { jarvisWarmup: defaultWarmup }
            });

            return Response.json(defaultWarmup);
        }

        // Dùng Gemini phân tích transcript đã được embedding để sinh câu hỏi thảo luận cốt lõi
        const response = await generateObject({
            model: google("gemini-2.5-flash"),
            schema: z.object({
                greeting: z.string().describe("Lời chào ấm áp kiểu Jarvis tóm tắt ngắn 1-2 câu bài học và đặt câu hỏi gợi mở"),
                suggestions: z.array(z.string()).length(3).describe("3 câu hỏi gợi ý cốt lõi, cụ thể dựa trực tiếp trên transcript của bài")
            }),
            prompt: `Dưới đây là tiêu đề và transcript của bài giảng:
Tiêu đề: ${lesson.title}
Transcript: ${transcript.substring(0, 4000)}

Nhiệm vụ:
1. Hãy tạo ra 1 lời chào chủ động (Greeting) ấm áp kiểu trợ lý Jarvis, tóm tắt cực ngắn 1 câu nội dung của bài học và đặt 1 câu hỏi gợi mở (Socratic question) để khơi dậy tò mò.
2. Tạo ra 3 câu hỏi gợi ý thông minh, cụ thể, không chung chung, dựa trực tiếp trên kiến thức và nội dung thực tế xuất hiện trong transcript của bài giảng để học sinh click vào hỏi luôn.

Ví dụ: Nếu transcript nói về Anthropic Agent Skills, gợi ý câu hỏi phải là "Agent Skills là gì và tại sao Anthropic lại đề xuất nó?" chứ không được hỏi chung chung là "Nội dung bài học là gì?".`
        });

        const generatedData = response.object;

        // 3. Lưu dữ liệu đã sinh vào database để cache cho các lần tải sau
        await prisma.lesson.update({
            where: { id: lessonId },
            data: { jarvisWarmup: generatedData }
        });

        return Response.json(generatedData);

    } catch (e: any) {
        console.error("Jarvis Warmup Error:", e);
        return Response.json({ error: e.message }, { status: 500 });
    }
}
