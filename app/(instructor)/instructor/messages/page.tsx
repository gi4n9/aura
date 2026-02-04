import { getConversations } from "@/app/actions/chat";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MessagesInterface from "@/app/components/chat/MessagesInterface";

export default async function InstructorMessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const conversations = await getConversations();

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col -m-8 p-4">
            <h1 className="text-2xl font-bold font-serif text-stone-800 mb-4 shrink-0">Tin nhắn & Hỗ trợ</h1>
            <div className="flex-1 min-h-0">
                <MessagesInterface
                    initialConversations={conversations}
                    currentUserId={user.id}
                    className="flex h-full w-full bg-white overflow-hidden rounded-2xl shadow-sm border border-stone-200"
                />
            </div>
        </div>
    );
}
