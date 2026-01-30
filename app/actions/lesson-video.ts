"use server";

import { db } from "@/lib/prisma";
import { youtube } from "@/lib/youtube";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getLessonVideoDetails(lessonId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "Unauthorized" };
    }

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) return { success: false, error: "Bài học không tồn tại" };

    if (lesson.chapter.course.instructorId !== authUser.id) {
      return { success: false, error: "Bạn không có quyền truy cập bài học này" };
    }

    if (!lesson.youtubeVideoId) {
      return { success: false, error: "Bài học này chưa có video YouTube" };
    }

    // Fetch details from YouTube
    const ytRes = await youtube.videos.list({
      part: ["snippet", "status"],
      id: [lesson.youtubeVideoId],
    });

    if (!ytRes.data.items || ytRes.data.items.length === 0) {
      return { success: false, error: "Video không tồn tại trên YouTube" };
    }

    const video = ytRes.data.items[0];

    return {
      success: true,
      data: {
        title: video.snippet?.title || "",
        description: video.snippet?.description || "",
        lessonTitle: lesson.title, // Also return DB title to sync
        videoId: lesson.youtubeVideoId,
      },
    };
  } catch (error: any) {
    console.error("Get Video Details Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateLessonVideoDetails(
  lessonId: string,
  title: string,
  description: string
) {
  try {
    // 1. Auth Check
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return { success: false, error: "Unauthorized" };

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) return { success: false, error: "Lesson not found" };
    if (lesson.chapter.course.instructorId !== authUser.id) {
      return { success: false, error: "Forbidden" };
    }
    if (!lesson.youtubeVideoId) {
      return { success: false, error: "No YouTube video linked" };
    }

    // 2. Update YouTube
    await youtube.videos.update({
      part: ["snippet"],
      requestBody: {
        id: lesson.youtubeVideoId,
        snippet: {
          title: title, // Update YouTube Title
          description: description, // Update YouTube Description
          categoryId: "27", // Education
        },
      },
    });

    // 3. Update Prisma (DB)
    // We only have 'title' in DB.
    await db.lesson.update({
      where: { id: lessonId },
      data: {
        title: title, // Sync title to DB
      },
    });

    revalidatePath(`/instructor/courses/${lesson.chapter.course.id}/chapters/${lesson.chapter.id}/lesson/${lessonId}`);

    return { success: true, message: "Cập nhật thành công!" };
  } catch (error: any) {
    console.error("Update Video Error:", error);
    return { success: false, error: error.message || "Lỗi cập nhật video" };
  }
}
