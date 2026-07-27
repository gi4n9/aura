"use client";

import { useTheme } from "@/lib/theme/ThemeContext";
import MessagesInterface from "@/app/components/chat/MessagesInterface";

export default function MessagesPageClient({
    initialConversations,
    currentUserId,
}: {
    initialConversations: any[];
    currentUserId: string;
}) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen pt-[70px] transition-colors duration-500 ${
            isDark ? "bg-[#0e0e0e] text-white" : "bg-[#F9F8F4] text-stone-900"
        }`}>
            <div className="container mx-auto h-full max-w-7xl">
                <MessagesInterface
                    initialConversations={initialConversations}
                    currentUserId={currentUserId}
                />
            </div>
        </div>
    );
}
