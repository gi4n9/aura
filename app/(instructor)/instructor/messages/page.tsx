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
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold font-serif text-stone-800">Tin nhắn & Hỗ trợ</h1>
            {/* Wrapper không cần height cứng nữa vì ta truyền height trực tiếp vào Component */}
            <div className="w-full">
                <MessagesInterface
                    initialConversations={conversations}
                    currentUserId={user.id}
                    // Instructor layout: Cao hơn và cố định hơn (85vh, min 800px)
                    className="flex h-[85vh] min-h-[800px] w-full bg-white overflow-hidden rounded-2xl shadow-sm border border-stone-200"
                />
            </div>
        </div>
    );
}
