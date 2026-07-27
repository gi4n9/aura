import { getConversations } from "@/app/actions/chat";
import { getMyInvitations } from "@/app/actions/community-actions";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import InstructorMessagesClient from "./InstructorMessagesClient";

export default async function InstructorMessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const [conversations, invitations] = await Promise.all([
        getConversations(),
        getMyInvitations()
    ]);

    // Lấy khóa học giảng viên đã tạo (dùng cho modal tạo nhóm)
    const instructorCourses = await prisma.course.findMany({
        where: { instructorId: user.id },
        select: { id: true, title: true, thumbnailUrl: true }
    });

    return (
        <InstructorMessagesClient
            conversations={conversations}
            currentUserId={user.id}
            invitations={invitations}
            instructorCourses={instructorCourses}
        />
    );
}
