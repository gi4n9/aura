"use server";

import { prisma } from "@/lib/prisma";
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
    const lastChapter = await prisma.chapter.findFirst({
      where: { courseId: courseId },
      orderBy: { position: "desc" },
    });
    const newPosition = lastChapter ? lastChapter.position + 1 : 1;

    const chapter = await prisma.chapter.create({
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
    const ownCourse = await prisma.course.findUnique({
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
    const chapter = await prisma.chapter.update({
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

export async function getChapterByCourseId(courseId: string) {
  try {
    const chapters = await prisma.chapter.findMany({
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
