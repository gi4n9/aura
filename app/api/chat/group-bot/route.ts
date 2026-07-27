import { db } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/ai/embedding";
import Groq from "groq-sdk";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { encryptMessage, decryptMessage } from "@/lib/security/chat-crypto";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { conversationId, courseId, query, senderId } = body;

        if (!conversationId || !query) {
            return Response.json({ error: "Missing conversationId or query" }, { status: 400 });
        }

        // 1. Generate Embedding for the Query
        const queryEmbedding = await generateEmbedding(query);
        const queryEmbeddingString = `[${queryEmbedding.join(',')}]`;

        // 2. Search Video Embeddings (if courseId provided)
        let videoContext = "";
        let sources: any[] = [];
        
        if (courseId) {
            const lessons = await db.lesson.findMany({
                where: { chapter: { courseId } },
                select: { id: true, title: true }
            });
            const lessonIds = lessons.map(l => l.id);
            
            if (lessonIds.length > 0) {
                const videoMatches: any[] = await db.$queryRawUnsafe(`
                    SELECT id, lesson_id, content, start_time, end_time, 1 - (embedding <=> $1::vector) as similarity
                    FROM video_embeddings
                    WHERE lesson_id IN (${lessonIds.map(id => `'${id}'`).join(',')})
                    AND embedding IS NOT NULL
                    ORDER BY embedding <=> $1::vector
                    LIMIT 5
                `, queryEmbeddingString);

                if (videoMatches.length > 0) {
                    sources.push(...videoMatches.map(m => ({
                        type: 'video',
                        lessonId: m.lesson_id,
                        startTime: m.start_time,
                        title: lessons.find(l => l.id === m.lesson_id)?.title || 'Video'
                    })));
                    videoContext = videoMatches.map(m => `[Video: ${lessons.find(l => l.id === m.lesson_id)?.title} at ${m.start_time}s]\n${m.content}`).join("\n\n");
                }
            }
        }

        // 3. Search Past Group Messages
        let messageContext = "";
        const messageMatches: any[] = await db.$queryRawUnsafe(`
            SELECT id, content, "senderId", 1 - (embedding <=> $1::vector) as similarity
            FROM "DirectMessage"
            WHERE "conversationId" = $2
            AND embedding IS NOT NULL
            AND "isBotResponse" = false
            ORDER BY embedding <=> $1::vector
            LIMIT 5
        `, queryEmbeddingString, conversationId);

        if (messageMatches.length > 0) {
            messageContext = messageMatches.map(m => `[Past Question]\n${decryptMessage(m.content)}`).join("\n\n");
            sources.push(...messageMatches.map(m => ({
                type: 'qa',
                messageId: m.id
            })));
        }

        // 4. Check for Auto-FAQ
        const verySimilarMessages = messageMatches.filter(m => m.similarity > 0.85);
        if (verySimilarMessages.length >= 3 && courseId) {
            const existingFaq = await db.courseFaq.findFirst({
                where: { courseId, question: query }
            });
            if (existingFaq) {
                await db.courseFaq.update({
                    where: { id: existingFaq.id },
                    data: { askCount: existingFaq.askCount + 1 }
                });
            } else {
                await db.courseFaq.create({
                    data: {
                        courseId,
                        question: query,
                        answer: "To be answered by bot",
                        askCount: verySimilarMessages.length + 1
                    }
                });
            }
        }

        // 5. Rerank with Groq
        const rerankPrompt = `
You are a helpful assistant. I will provide a user query and some retrieved contexts (Video transcripts and past Q&A).
Your task is to identify which parts of the context are MOST relevant to answering the query.
Respond with ONLY the relevant text snippets concatenated together. If none are relevant, say "NONE".

User Query: ${query}

Video Contexts:
${videoContext}

Past Q&A Contexts:
${messageContext}
        `;

        const groqCompletion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: rerankPrompt }],
            temperature: 0.1
        });

        const rerankedContext = groqCompletion.choices[0]?.message?.content || "";
        const finalContext = rerankedContext === "NONE" ? "" : rerankedContext;

        // 6. Generate final answer with Gemini
        const systemPrompt = `Bạn là @AuraBot, trợ lý AI quản lý nhóm học tập.
Hãy trả lời câu hỏi của học viên dựa vào các Context được cung cấp.
Nếu trong Context có thông tin, hãy trích dẫn (ví dụ: "Theo video bài giảng tại giây X...").
Nếu bạn không có thông tin từ Context, hãy dùng kiến thức chung nhưng phải báo cho học viên biết.
Bạn phải tự đánh giá độ tự tin (confidence) cho câu trả lời của mình từ 0.0 đến 1.0.

Trả về kết quả bằng định dạng JSON nghiêm ngặt:
{
  "answer": "Nội dung câu trả lời của bạn, dùng markdown",
  "confidence": 0.85
}`;

        const geminiResult = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            prompt: `Context: ${finalContext}\n\nUser Question: ${query}`,
        });

        let aiAnswer = "Xin lỗi, tôi không thể trả lời lúc này.";
        let confidence = 0;
        try {
            const jsonText = geminiResult.text.replace(/\`\`\`json\n/g, '').replace(/\`\`\`/g, '').trim();
            const parsed = JSON.parse(jsonText);
            aiAnswer = parsed.answer || aiAnswer;
            confidence = parsed.confidence || 0;
        } catch (e) {
            aiAnswer = geminiResult.text;
        }

        // 7. Auto-tag instructor if confidence < 0.7
        if (confidence < 0.7) {
            aiAnswer += "\n\n*@AuraBot: Em không hoàn toàn chắc chắn về câu trả lời này. Xin nhờ Giảng viên hoặc các bạn khác hỗ trợ thêm nhé!*";
        }

        // 8. Update FAQ answer
        if (courseId && confidence >= 0.7) {
            const faqToUpdate = await db.courseFaq.findFirst({
                where: { courseId, question: query },
                orderBy: { createdAt: 'desc' }
            });
            if (faqToUpdate && faqToUpdate.answer === "To be answered by bot") {
                await db.courseFaq.update({
                    where: { id: faqToUpdate.id },
                    data: { answer: aiAnswer }
                });
            }
        }

        // 9. Ensure bot profile exists or use system id
        // We will just use 'aura-bot' and handle it on UI, but DB needs a real foreign key for senderId.
        // Let's check if 'aura-bot' Profile exists. If not, create it.
        let botProfile = await db.profile.findUnique({ where: { id: 'aura-bot' } });
        if (!botProfile) {
            botProfile = await db.profile.create({
                data: {
                    id: 'aura-bot',
                    email: 'bot@aura.edu.vn',
                    fullName: 'AuraBot',
                    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=AuraBot',
                }
            });
        }

        const botMessage = await db.directMessage.create({
            data: {
                content: encryptMessage(aiAnswer),
                conversationId,
                senderId: 'aura-bot',
                isBotResponse: true,
                sources: sources,
            }
        });

        return Response.json({
            message: {
                ...botMessage,
                content: aiAnswer
            },
            confidence
        });

    } catch (error: any) {
        console.error("AuraBot Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
