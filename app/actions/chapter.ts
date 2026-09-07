"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. TẠO CHƯƠNG ---
export async function createChapter(courseId: string, title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const lastChapter = await db.chapter.findFirst({
      where: { courseId: courseId },
      orderBy: { position: "desc" },
    });
    const newPosition = lastChapter ? lastChapter.position + 1 : 1;

    const chapter = await db.chapter.create({
      data: {
        title,
        courseId,
        position: newPosition,
        status: "DRAFT",
      },
    });
    revalidatePath(`/instructor/courses/${courseId}/edit`);
    return { success: true, data: chapter };
  } catch (error) {
    return { success: false, error: "Lỗi tạo chương" };
  }
}

// --- 2. UPDATE CHƯƠNG (DEBUG MODE) ---
export async function updateChapter(
  courseId: string,
  chapterId: string,
  values: {
    title?: string;
    description?: string;
    isPublished?: boolean;
    position?: number;
    videoUrl?: string;
  }
) {
  console.log("--- BẮT ĐẦU UPDATE CHAPTER ---");
  console.log("1. Inputs:", { courseId, chapterId, values });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("User:", user);

  if (!user) {
    console.log("2. Lỗi: User chưa đăng nhập");
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check quyền
    const ownCourse = await db.course.findUnique({
      where: { id: courseId, instructorId: user.id },
    });

    console.log("Data", ownCourse);

    if (!ownCourse) {
      console.log("3. Lỗi: Không tìm thấy khóa học hoặc không có quyền");
      return { success: false, error: "Không có quyền" };
    }

    // Xử lý dữ liệu
    const { isPublished, ...otherValues } = values;
    const dataToUpdate: any = { ...otherValues };

    if (isPublished !== undefined) {
      // Logic convert
      dataToUpdate.status = isPublished ? "PUBLISHED" : "DRAFT";
      console.log("4. Convert status:", isPublished, "->", dataToUpdate.status);
    }

    console.log("5. Data chuẩn bị update vào DB:", dataToUpdate);

    // Update DB
    const chapter = await db.chapter.update({
      where: { id: chapterId },
      data: dataToUpdate,
    });

    console.log("6. Update thành công:", chapter);

    revalidatePath(`/instructor/courses/${courseId}/edit`);
    return { success: true, data: chapter };
  } catch (error) {
    // In lỗi chi tiết ra Terminal
    console.error("❌ LỖI UPDATE:", error);
    return {
      success: false,
      error: "Lỗi hệ thống (Xem terminal để biết chi tiết)",
    };
  }
}

// ... (existing code for updateChapter)

export async function getChapterByCourseId(courseId: string) {
  try {
    const chapters = await db.chapter.findMany({
      where: {
        courseId: courseId,
      },
      orderBy: { position: "asc" },
      select: {
        id: true,
        title: true,
      },
    });
    return chapters;
  } catch (error) {
    console.log("Get Chapter Error:", error);
    return [];
  }
}

// ============================================
// DATA FETCHING FOR CHAPTER-LEVEL QUIZ EDITING
// ============================================

export async function getChapterLessons(chapterId: string) {
  try {
    const lessons = await db.lesson.findMany({
      where: { chapterId },
      orderBy: { position: "asc" },
      select: {
          id: true,
          title: true,
          position: true,
          youtubeVideoId: true,
          transcript: true,
          _count: {
              select: { questions: { where: { isArchived: false } } }
          }
      }
    });
    
    return { success: true, data: lessons };
  } catch (error) {
    console.error("Get Chapter Lessons Error:", error);
    return { success: false, error: "Lỗi tải bài học" };
  }
}

// --- 3. XÓA CHƯƠNG ---
export async function deleteChapter(courseId: string, chapterId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // Kiểm tra quyền sở hữu khóa học
    const ownCourse = await db.course.findUnique({
      where: { id: courseId, instructorId: user.id },
    });

    if (!ownCourse) {
      return { success: false, error: "Không có quyền xóa chương này" };
    }

    // Kiểm tra xem chương có tồn tại và thuộc khóa học này không
    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      include: {
        lessons: {
          include: { questions: true }
        }
      }
    });

    if (!chapter || chapter.courseId !== courseId) {
      return { success: false, error: "Chương không tồn tại" };
    }

    // Xóa tất cả questions của các lessons trong chapter
    for (const lesson of chapter.lessons) {
      await db.question.deleteMany({
        where: { lessonId: lesson.id }
      });
    }

    // Xóa tất cả lessons trong chapter
    await db.lesson.deleteMany({
      where: { chapterId: chapterId }
    });

    // Xóa chapter
    await db.chapter.delete({
      where: { id: chapterId }
    });

    revalidatePath(`/instructor/courses/${courseId}/settings`);
    return { success: true };
  } catch (error) {
    console.error("Delete Chapter Error:", error);
    return { success: false, error: "Lỗi xóa chương" };
  }
}
