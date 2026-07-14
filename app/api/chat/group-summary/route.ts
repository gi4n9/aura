import { db } from "@/lib/prisma";
import Groq from "groq-sdk";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { conversationId, userId } = body;

        if (!conversationId || !userId) {
            return Response.json({ error: "Missing conversationId or userId" }, { status: 400 });
        }

        // 1. Get Conversation and Participant
        const conversation = await db.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: { where: { userId } }
            }
        });

        if (!conversation) {
            return Response.json({ error: "Conversation not found" }, { status: 404 });
        }

        const participant = conversation.participants[0];
        if (!participant) {
            return Response.json({ error: "User is not a participant" }, { status: 403 });
        }

        const lastReadAt = participant.lastReadAt;

        // 2. Fetch unread messages
        const unreadMessages = await db.directMessage.findMany({
            where: {
                conversationId,
                createdAt: { gt: lastReadAt }
            },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: { select: { fullName: true } }
            }
        });

        if (unreadMessages.length === 0) {
            return Response.json({
                summary: "Không có tin nhắn mới nào kể từ lần cuối bạn online.",
                keyTopics: [],
                sharedLinks: [],
                hotQuestions: [],
                activeMembers: 0,
                messageCount: 0
            });
        }

        // 3. Fetch user's Video Progress to personalize summary
        let progressContext = "";
        if (conversation.courseId) {
            const userProgress = await db.videoProgress.findMany({
                where: {
                    userId,
                    lesson: { chapter: { courseId: conversation.courseId } },
                    percentage: { gt: 0 }
                },
                orderBy: { updatedAt: 'desc' },
                take: 3,
                include: { lesson: { select: { title: true } } }
            });

            if (userProgress.length > 0) {
                progressContext = "Học viên đang học các bài: " + userProgress.map(p => p.lesson.title).join(", ");
            }
        }

        // 4. Prepare messages for AI
        const formattedMessages = unreadMessages.map(m => `[${m.createdAt.toISOString()}] ${m.sender.fullName || 'User'}: ${m.content}`).join("\n");
        const activeMembers = new Set(unreadMessages.map(m => m.senderId)).size;
        const messageCount = unreadMessages.length;

        // 5. Generate Summary with Gemini (or Groq if Gemini fails, here we just use Gemini for simplicity and capability)
        const systemPrompt = `Bạn là trợ lý AI tóm tắt nội dung thảo luận nhóm.
Nhiệm vụ: Tóm tắt ngắn gọn, dễ hiểu các tin nhắn đã bị bỏ lỡ.
Bối cảnh học tập của học viên: ${progressContext || 'Không rõ'}
Hãy ưu tiên làm nổi bật các cuộc thảo luận liên quan đến bài học hiện tại của học viên.

Trả về kết quả bằng định dạng JSON nghiêm ngặt:
{
  "summary": "Tóm tắt tổng quan (khoảng 2-3 câu)",
  "keyTopics": ["Chủ đề 1", "Chủ đề 2"],
  "sharedLinks": [{"title": "Tên link", "url": "https..."}],
  "hotQuestions": [{"question": "Câu hỏi?", "answerCount": 2}]
}`;

        // Truncate messages if too long for prompt to save tokens
        const maxChars = 20000;
        const messagesPrompt = formattedMessages.length > maxChars 
            ? formattedMessages.substring(formattedMessages.length - maxChars) 
            : formattedMessages;

        const geminiResult = await generateText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            prompt: `Messages:\n${messagesPrompt}`,
        });

        let summaryData = {
            summary: "Đã có lỗi trong quá trình tóm tắt.",
            keyTopics: [],
            sharedLinks: [],
            hotQuestions: []
        };

        try {
            const jsonText = geminiResult.text.replace(/\`\`\`json\n/g, '').replace(/\`\`\`/g, '').trim();
            summaryData = JSON.parse(jsonText);
        } catch (e) {
            console.error("Failed to parse summary JSON", geminiResult.text);
        }

        // 6. Save to cache (ConversationSummary)
        const savedSummary = await db.conversationSummary.create({
            data: {
                conversationId,
                period: "CUSTOM",
                startAt: lastReadAt,
                endAt: new Date(),
                summary: summaryData.summary,
                keyTopics: summaryData.keyTopics || [],
                sharedLinks: summaryData.sharedLinks || [],
                hotQuestions: summaryData.hotQuestions || [],
                activeMembers,
                messageCount
            }
        });

        // 7. Update lastReadAt for the user
        await db.conversationParticipant.update({
            where: { id: participant.id },
            data: { lastReadAt: new Date(), hasSeenLatest: true }
        });

        return Response.json(savedSummary);

    } catch (error: any) {
        console.error("Group Summary Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
