"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== "ADMIN") {
    throw new Error("Forbidden: Admin only");
  }

  return user;
}

export async function getCommunityData() {
  try {
    await requireAdmin();

    const [conversations, groupQuestions, recentMessages] = await Promise.all([
      // 1. All Conversations (Group chats)
      prisma.conversation.findMany({
        where: { isGroup: true },
        include: {
          _count: {
            select: {
              participants: true,
              messages: true,
            },
          },
          course: { select: { title: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      // 2. Group Questions
      prisma.groupQuestion.findMany({
        include: {
          author: { select: { fullName: true, email: true, avatarUrl: true } },
          conversation: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      // 3. Recent DirectMessages (for moderation)
      prisma.directMessage.findMany({
        include: {
          sender: { select: { fullName: true, email: true, avatarUrl: true } },
          conversation: { select: { name: true, isGroup: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return {
      success: true,
      data: {
        conversations,
        groupQuestions,
        recentMessages,
      },
    };
  } catch (error: any) {
    console.error("getCommunityData error:", error);
    return { success: false, error: error?.message || "Không thể tải dữ liệu Cộng đồng" };
  }
}

export async function updateConversationSettings(
  conversationId: string,
  data: { isPublic?: boolean; maxMembers?: number; name?: string }
) {
  try {
    await requireAdmin();

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
        ...(data.maxMembers !== undefined ? { maxMembers: data.maxMembers } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      },
    });

    revalidatePath("/admin/community");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateConversationSettings error:", error);
    return { success: false, error: error?.message || "Không thể cập nhật cấu hình nhóm chat" };
  }
}

export async function toggleGroupQuestionResolved(questionId: string, isResolved: boolean) {
  try {
    await requireAdmin();

    const updated = await prisma.groupQuestion.update({
      where: { id: questionId },
      data: { isResolved },
    });

    revalidatePath("/admin/community");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("toggleGroupQuestionResolved error:", error);
    return { success: false, error: error?.message || "Không thể cập nhật trạng thái thắc mắc" };
  }
}

export async function toggleMessageDeleted(messageId: string, deleted: boolean) {
  try {
    await requireAdmin();

    const updated = await prisma.directMessage.update({
      where: { id: messageId },
      data: { deleted },
    });

    revalidatePath("/admin/community");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("toggleMessageDeleted error:", error);
    return { success: false, error: error?.message || "Không thể thay đổi trạng thái tin nhắn" };
  }
}
