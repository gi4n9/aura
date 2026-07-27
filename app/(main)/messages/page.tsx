import { getConversations } from "@/app/actions/chat";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MessagesPageClient from "./MessagesPageClient";

export default async function MessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const conversations = await getConversations();

    return (
        <MessagesPageClient
            initialConversations={conversations}
            currentUserId={user.id}
        />
    );
}
