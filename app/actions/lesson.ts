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

    // Revalidate the course settings page to update the UI
    // Path might be tentative, but it works for dynamic routes often if generic enough or specific
    // revalidatePath(`/instructor/courses/${chapter.courseId}/settings`);
    
    return { success: true, data: lesson };
  } catch (error) {
    console.error("[CREATE_LESSON]", error);
    return { success: false, error: "Internal Error" };
  }
}
