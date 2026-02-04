import { getConversations } from "@/app/actions/chat";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MessagesInterface from "@/app/components/chat/MessagesInterface";

export default async function MessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const conversations = await getConversations();

    return (
        <div className="h-screen pt-[70px] bg-[#F9F8F4]">
            {/* Limit container width for large screens */}
            <div className="container mx-auto h-full max-w-7xl">
                <MessagesInterface
                    initialConversations={conversations}
                    currentUserId={user.id}
                />
            </div>
        </div>
    );
}
