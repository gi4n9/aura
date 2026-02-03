"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

/**
 * Lưu tiến độ xem video
 * Được gọi định kỳ khi user xem video (throttled ở client)
 */
export async function saveVideoProgress(
  lessonId: string,
  currentTime: number,
  duration: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isCompleted = percentage >= 90; // Coi như hoàn thành nếu xem >= 90%

    const progress = await db.videoProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lessonId,
        },
      },
      update: {
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
        percentage: Math.round(percentage * 100) / 100, // Round to 2 decimals
        isCompleted,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: user.id,
        lessonId: lessonId,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
        percentage: Math.round(percentage * 100) / 100,
        isCompleted,
      },
    });

    return { success: true, progress };
  } catch (error) {
    console.error("Error saving video progress:", error);
    return { error: "Failed to save progress" };
  }
}

/**
 * Lấy tiến độ xem video của user cho một bài học
 */
export async function getVideoProgress(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  try {
    const progress = await db.videoProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lessonId,
        },
      },
    });

    return progress;
  } catch (error) {
    console.error("Error fetching video progress:", error);
    return null;
  }
}

/**
 * Lấy tất cả video progress của user cho một khóa học
 */
export async function getCourseVideoProgress(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const progressList = await db.videoProgress.findMany({
      where: {
        userId: user.id,
        lesson: {
          chapter: {
            courseId: courseId,
          },
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            chapterId: true,
          },
        },
      },
    });

    return progressList;
  } catch (error) {
    console.error("Error fetching course video progress:", error);
    return [];
  }
}

/**
 * Đánh dấu video đã hoàn thành
 */
export async function markVideoCompleted(lessonId: string, duration: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const progress = await db.videoProgress.upsert({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId: lessonId,
        },
      },
      update: {
        currentTime: duration,
        duration: duration,
        percentage: 100,
        isCompleted: true,
        lastWatchedAt: new Date(),
      },
      create: {
        userId: user.id,
        lessonId: lessonId,
        currentTime: duration,
        duration: duration,
        percentage: 100,
        isCompleted: true,
      },
    });

    return { success: true, progress };
  } catch (error) {
    console.error("Error marking video completed:", error);
    return { error: "Failed to mark completed" };
  }
}
