import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { decryptMessage } from "@/lib/security/chat-crypto";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lessonId = searchParams.get("lessonId");

        if (!lessonId) {
            return new Response(JSON.stringify({ error: "Missing lessonId" }), { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        // Lấy Session chứa lịch sử chat theo bài học
        const session = await db.chatSession.findFirst({
            where: {
                userId: user.id,
                lessonId: lessonId
            },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" }
                }
            }
        });

        if (!session) {
            return new Response(JSON.stringify({ messages: [] }), { status: 200 });
        }

        const formattedMessages = session.messages.map(msg => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: decryptMessage(msg.content)
        }));

        return new Response(JSON.stringify({ messages: formattedMessages }), { status: 200 });

    } catch (error: any) {
        console.error("Fetch chat history error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
