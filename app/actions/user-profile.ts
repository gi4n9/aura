"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type UpdateProfileInput = FormData | {
  fullName?: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  birthDate?: string | null;
  occupation?: string | null;
  country?: string | null;
  city?: string | null;
};

export async function updateUserProfile(input: UpdateProfileInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  // Parse fields based on FormData or Object
  let fullName: string | undefined;
  let avatarUrl: string | null | undefined;

  if (input instanceof FormData) {
    fullName = (input.get("fullName") as string) || undefined;
    avatarUrl = (input.get("avatarUrl") as string) || undefined;
  } else {
    fullName = input.fullName;
    avatarUrl = input.avatarUrl;
  }

  try {
    // 1. Kiểm tra xem user có avatar từ Google Auth metadata không
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;

    // Lấy profile hiện tại
    const existing = await prisma.profile.findUnique({
      where: { id: user.id }
    });

    let finalAvatarUrl = avatarUrl;
    if (finalAvatarUrl === undefined) {
      finalAvatarUrl = existing?.avatarUrl || googleAvatar || null;
    }

    const updated = await prisma.profile.upsert({
      where: { id: user.id },
      update: {
        fullName: fullName ?? existing?.fullName ?? user.email?.split("@")[0] ?? "User",
        avatarUrl: finalAvatarUrl,
      },
      create: {
        id: user.id,
        email: user.email || "",
        fullName: fullName || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        avatarUrl: finalAvatarUrl,
        role: "STUDENT",
      }
    });

    revalidatePath("/", "layout");
    revalidatePath("/setting");
    revalidatePath("/profile");
    revalidatePath("/instructor/profile");

    return { success: true, profile: updated, message: "Cập nhật hồ sơ thành công!" };
  } catch (error) {
    console.error("Lỗi updateUserProfile:", error);
    return { success: false, error: "Có lỗi xảy ra khi cập nhật hồ sơ." };
  }
}

export async function syncGoogleAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  if (!googleAvatar) {
    return { success: false, error: "Không tìm thấy avatar từ tài khoản Google của bạn." };
  }

  try {
    const updated = await prisma.profile.update({
      where: { id: user.id },
      data: { avatarUrl: googleAvatar }
    });

    revalidatePath("/", "layout");
    revalidatePath("/setting");

    return { success: true, avatarUrl: googleAvatar, message: "Đồng bộ avatar từ Google thành công!" };
  } catch (error) {
    console.error("Lỗi syncGoogleAvatar:", error);
    return { success: false, error: "Không thể cập nhật avatar từ Google." };
  }
}

export async function sendProfileCheer(targetUserId: string, message: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Bạn cần đăng nhập để gửi lời cổ vũ" };

  try {
    const cheer = await prisma.profileCheer.create({
      data: {
        senderId: user.id,
        targetUserId,
        message: message.trim() || "🎉 Chúc mừng bạn nhé!"
      },
      include: {
        sender: {
          select: { fullName: true, email: true, avatarUrl: true }
        }
      }
    });

    revalidatePath("/profile");
    return { success: true, cheer };
  } catch (error) {
    console.error("Lỗi sendProfileCheer:", error);
    return { success: false, error: "Không thể gửi lời cổ vũ." };
  }
}

export async function toggleProfileReaction(targetUserId: string, type: 'heart' | 'thumb' | 'idea' | 'star') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Bạn cần đăng nhập để thả cảm xúc" };

  try {
    const existing = await prisma.profileReaction.findUnique({
      where: {
        senderId_targetUserId_type: {
          senderId: user.id,
          targetUserId,
          type
        }
      }
    });

    if (existing) {
      await prisma.profileReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.profileReaction.create({
        data: {
          senderId: user.id,
          targetUserId,
          type
        }
      });
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Lỗi toggleProfileReaction:", error);
    return { success: false, error: "Có lỗi khi thả cảm xúc." };
  }
}

export async function incrementProfileViews(targetUserId: string) {
  try {
    await prisma.profile.update({
      where: { id: targetUserId },
      data: { viewsCount: { increment: 1 } }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function getPublicUserProfileData(targetUserId: string) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: targetUserId },
      include: {
        userStats: true,
        cheersReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, fullName: true, avatarUrl: true, email: true }
            }
          }
        },
        reactionsReceived: true
      }
    });

    if (!profile) return null;

    // Reaction counts
    const reactionsCount = {
      heart: profile.reactionsReceived.filter(r => r.type === 'heart').length,
      thumb: profile.reactionsReceived.filter(r => r.type === 'thumb').length,
      idea: profile.reactionsReceived.filter(r => r.type === 'idea').length,
      star: profile.reactionsReceived.filter(r => r.type === 'star').length,
      total: profile.reactionsReceived.length
    };

    return {
      profile,
      reactionsCount,
      cheers: profile.cheersReceived
    };
  } catch (error) {
    console.error("Lỗi getPublicUserProfileData:", error);
    return null;
  }
}
