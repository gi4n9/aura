'use server';

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
export async function joinGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Check if group exists
        const group = await db.conversation.findUnique({
            where: { id: groupId, isGroup: true }
        });

        if (!group) {
            return { success: false, error: "Nhóm không tồn tại" };
        }

        // Check if already a member
        const existingParticipant = await db.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: groupId,
                    userId: user.id
                }
            }
        });

        if (existingParticipant) {
            return { success: false, error: "Bạn đã tham gia nhóm này" };
        }

        // Add to group
        await db.conversationParticipant.create({
            data: {
                conversationId: groupId,
                userId: user.id,
                role: "MEMBER"
            }
        });

        revalidatePath("/community");
        
        return { success: true };
    } catch (error) {
        console.error("Lỗi tham gia nhóm:", error);
        return { success: false, error: "Có lỗi xảy ra, vui lòng thử lại sau" };
    }
}

export async function leaveGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await db.conversationParticipant.deleteMany({
            where: {
                conversationId: groupId,
                userId: user.id
            }
        });

        revalidatePath("/community");
        
        return { success: true };
    } catch (error) {
        console.error("Lỗi rời nhóm:", error);
        return { success: false, error: "Có lỗi xảy ra, vui lòng thử lại sau" };
    }
}
