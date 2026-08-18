"use server";

import { db } from "@/lib/prisma";
import { youtube } from "@/lib/youtube";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface FlashcardPayload {
  id?: string;
  front: string;
  back: string;
}

interface UpdateLessonPayload {
  transcript?: string;
  timeline?: any[];
  mindMapData?: any;
  flashcards?: FlashcardPayload[];
}

export async function getLessonTranscript(lessonId: string) {
  try {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { transcript: true, timeline: true, youtubeVideoId: true }
    });

    if (!lesson) return { success: false, error: "Lesson not found" };

    const transcript = lesson.transcript || "";
    const isProcessing = transcript.startsWith("PROCESSING:") || transcript === "Đang được AI xử lý ngầm...";

    return {
      success: true,
      transcript: isProcessing ? "" : transcript,
      timeline: (lesson.timeline as any[]) || [],
      isProcessing,
      rawTranscript: transcript,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createLesson(chapterId: string, title: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      select: { courseId: true },
    });

    if (!chapter) return { success: false, error: "Chapter not found" };

    const lastLesson = await db.lesson.findFirst({
      where: { chapterId },
      orderBy: { position: "desc" },
    });

    const newPosition = lastLesson ? lastLesson.position + 1 : 1;

    const lesson = await db.lesson.create({
      data: {
        title,
        chapterId,
        position: newPosition,
      },
    });

    // Revalidate the course settings page to update the UI
    // Path might be tentative, but it works for dynamic routes often if generic enough or specific
    // revalidatePath(`/instructor/courses/${chapter.courseId}/settings`);

    return { success: true, data: lesson };
  } catch (error) {
    console.error("[CREATE_LESSON]", error);
    return { success: false, error: "Internal Error" };
  }
}

export async function updateLessonContent(lessonId: string, data: UpdateLessonPayload) {
  try {
    // 1. CẬP NHẬT CÁC TRƯỜNG CƠ BẢN (Transcript, Timeline, Mindmap)
    const updateData: any = {};
    if (data.transcript !== undefined) updateData.transcript = data.transcript;
    if (data.timeline !== undefined) updateData.timeline = data.timeline;
    if (data.mindMapData !== undefined) updateData.mindMapData = data.mindMapData;

    if (Object.keys(updateData).length > 0) {
      await db.lesson.update({
        where: { id: lessonId },
        data: updateData
      });
    }

    // 2. XỬ LÝ ĐỒNG BỘ BẢNG FLASHCARDS (NẾU CÓ DỮ LIỆU)
    if (data.flashcards) {
      // Lọc ra danh sách ID hợp lệ (những thẻ cũ đã có trong DB)
      const validExistingIds = data.flashcards
        .filter(fc => fc.id && !fc.id.startsWith("fc-new"))
        .map(fc => fc.id as string);

      // A. XÓA: Những thẻ có trong DB nhưng không có mặt trong danh sách Frontend gửi lên
      await db.flashcard.deleteMany({
        where: {
          lessonId: lessonId,
          id: { notIn: validExistingIds }
        }
      });

      // B. THÊM MỚI & CẬP NHẬT
      for (const card of data.flashcards) {
        if (card.id && !card.id.startsWith("fc-new")) {
          // Bắt lỗi thẻ bị xóa ngoài luồng để không báo RecordNotFound (P2025)
          const exists = await db.flashcard.findUnique({ where: { id: card.id } });
          if (exists) {
            await db.flashcard.update({
              where: { id: card.id },
              data: { front: card.front, back: card.back }
            });
          } else {
            // Nếu không tìm thấy thẻ cũ (dù có ID xịn), ta cũng tạo mới để phục hồi
            await db.flashcard.create({
              data: { lessonId: lessonId, front: card.front, back: card.back }
            });
          }
        } else {
          // Thêm thẻ mới từ UI
          await db.flashcard.create({
            data: { lessonId: lessonId, front: card.front, back: card.back }
          });
        }
      }
    }

    // 3. Xóa cache để giao diện cập nhật ngay lập tức
    revalidatePath(`/instructor/courses/[courseId]/chapters/[chapterId]/lessons/${lessonId}`, "page");

    return { success: true };
  } catch (error: any) {
    console.error("Update Lesson Content Error:", error);
    return { success: false, error: error.message };
  }
}

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

    // 2. Update YouTube (Safe title length for YouTube snippet API)
    const ytSnippetTitle = title.length > 100 ? title.substring(0, 97) + "..." : title;
    await youtube.videos.update({
      part: ["snippet"],
      requestBody: {
        id: lesson.youtubeVideoId,
        snippet: {
          title: ytSnippetTitle, // Update YouTube Title (safe length)
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
