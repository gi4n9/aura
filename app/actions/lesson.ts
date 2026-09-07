"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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

    revalidatePath(`/instructor/courses/${chapter.courseId}/chapters/${chapterId}`);
    revalidatePath(`/instructor/courses/${chapter.courseId}/settings`);

    return { success: true, data: lesson };
  } catch (error) {
    console.error("[CREATE_LESSON]", error);
    return { success: false, error: "Internal Error" };
  }
}

export async function deleteLesson(lessonId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          include: {
            course: { select: { id: true, instructorId: true } },
          },
        },
      },
    });

    if (!lesson) return { success: false, error: "Không tìm thấy bài học" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (lesson.chapter.course.instructorId !== user.id && profile?.role !== "ADMIN") {
      return { success: false, error: "Không có quyền xóa bài học này" };
    }

    const courseId = lesson.chapter.course.id;
    const chapterId = lesson.chapterId;

    await db.$transaction(async (tx) => {
      // Xóa các liên kết khóa ngoại không cascade
      await tx.studyPlanItem.deleteMany({
        where: { lessonId },
      });

      // Xóa bài học (Cascade sẽ tự động xóa Flashcards, Questions, Passages, VideoProgress, QuizResult, VideoEmbedding, LectureScript)
      await tx.lesson.delete({
        where: { id: lessonId },
      });
    });

    revalidatePath(`/instructor/courses/${courseId}/chapters/${chapterId}`);
    revalidatePath(`/instructor/courses/${courseId}/settings`);

    return { success: true };
  } catch (error: any) {
    console.error("[DELETE_LESSON]", error);
    return { success: false, error: error.message || "Lỗi xóa bài học" };
  }
}

export async function deleteAllLessons(chapterId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      include: {
        course: { select: { id: true, instructorId: true } },
        lessons: { select: { id: true } },
      },
    });

    if (!chapter) return { success: false, error: "Không tìm thấy chương" };

    const profile = await db.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (chapter.course.instructorId !== user.id && profile?.role !== "ADMIN") {
      return { success: false, error: "Không có quyền xóa bài học trong chương này" };
    }

    const lessonIds = chapter.lessons.map((l) => l.id);
    if (lessonIds.length === 0) {
      return { success: true, count: 0 };
    }

    await db.$transaction(async (tx) => {
      // Xóa liên kết studyPlanItems
      await tx.studyPlanItem.deleteMany({
        where: { lessonId: { in: lessonIds } },
      });

      // Xóa tất cả lessons trong chương
      await tx.lesson.deleteMany({
        where: { chapterId },
      });
    });

    revalidatePath(`/instructor/courses/${chapter.course.id}/chapters/${chapterId}`);
    revalidatePath(`/instructor/courses/${chapter.course.id}/settings`);

    return { success: true, count: lessonIds.length };
  } catch (error: any) {
    console.error("[DELETE_ALL_LESSONS]", error);
    return { success: false, error: error.message || "Lỗi xóa tất cả bài học" };
  }
}
