"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  createCourseService,
  getCourseOfInstructorForSelect,
} from "@/services/courses/courses";
import { prisma } from "@/lib/prisma";

// --- 1. TẠO KHÓA HỌC MỚI ---
export async function createCourse(formData: FormData) {
  const supabase = await createClient();

  // A. Xác thực người dùng
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Bạn cần đăng nhập để thực hiện chức năng này.",
    };
  }

  // B. Lấy và Validate dữ liệu
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const thumbnailUrl = formData.get("thumbnailUrl") as string;
  const categoryId = formData.get("category") as string;
  const priceRaw = formData.get("price") as string;

  if (!title || title.trim() === "") {
    return { success: false, error: "Tiêu đề khóa học không được để trống." };
  }

  let price = 0;
  if (priceRaw) {
    const parsed = Number(priceRaw);
    if (isNaN(parsed) || parsed < 0) {
      return {
        success: false,
        error: "Giá khóa học phải là một số dương hợp lệ.",
      };
    }
    price = parsed;
  }

  try {
    // C. Gọi Service
    const newCourse = await createCourseService({
      title,
      description,
      instructorId: user.id,
      thumbnailUrl,
      categoryId,
      price,
    });

    revalidatePath("/instructor/dashboard");

    const plainCourse = {
      ...newCourse,
      price: Number(newCourse.price),
    };

    return {
      success: true,
      message: "Tạo khóa học thành công!",
      data: plainCourse,
    };
  } catch (error) {
    console.error("Create Course Error:", error);
    return {
      success: false,
      error: "Đã có lỗi xảy ra khi tạo khóa học. Vui lòng thử lại.",
    };
  }
}

// --- 2. LẤY DANH SÁCH CHO DROPDOWN ---
export async function getCoursesForSelect() {
  try {
    const courses = await getCourseOfInstructorForSelect();
    return courses;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách khóa học:", error);
    return [];
  }
}

export async function updateCourse(courseId: string, values: Partial<any>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Auto update isFree based on price
    if (values.price !== undefined) {
       values.isFree = Number(values.price) === 0;
    }

    const course = await prisma.course.update({
      where: {
        id: courseId,
        instructorId: user.id, // Bảo mật: Chỉ chủ sở hữu mới được sửa
      },
      data: {
        ...values,
      },
    });

    revalidatePath(`/instructor/courses/${courseId}/edit`);

    const plainCourse = {
      ...course,
      price: course.price ? Number(course.price) : 0,
    };
    return { success: true, data: plainCourse };
  } catch (error) {
    console.log("Update Course Error:", error);
    return { success: false, error: "Lỗi khi cập nhật khóa học" };
  }
}

// --- PUBLIC KHÓA HỌC ---
export async function publishCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const course = await prisma.course.findFirst({
      where: { id: courseId, instructorId: user.id },
      include: { chapters: true },
    });

    if (!course) return { success: false, error: "Không tìm thấy khóa học" };

    // Validate dữ liệu lần cuối phía Server để đảm bảo an toàn
    const hasChapters = course.chapters.some(
      (chapter) => chapter.status === "PUBLISHED"
    );
    if (
      !course.title ||
      !course.description ||
      !course.thumbnailUrl ||
      !hasChapters
    ) {
      return {
        success: false,
        error:
          "Vui lòng điền đầy đủ thông tin và có ít nhất 1 chương đã đăng trước khi xuất bản.",
      };
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { status: "PUBLISHED" },
    });

    revalidatePath(`/instructor/courses/${courseId}/settings`);

    const plainCourse = {
      ...updatedCourse,
      price: updatedCourse.price ? Number(updatedCourse.price) : 0,
    };

    return { success: true, data: plainCourse };
  } catch (error) {
    console.log("Publish Error:", error);
    return { success: false, error: "Lỗi khi xuất bản khóa học" };
  }
}

// --- UNPUBLISH (GỠ BỎ) ---
export async function unpublishCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const updatedCourse = await prisma.course.update({
      where: { id: courseId, instructorId: user.id },
      data: { status: "DRAFT" },
    });

    revalidatePath(`/instructor/courses/${courseId}/edit`);

    const plainCourse = {
      ...updatedCourse,
      price: updatedCourse.price ? Number(updatedCourse.price) : 0,
    };

    return { success: true, data: plainCourse };
  } catch (error) {
    return { success: false, error: "Lỗi khi gỡ bỏ khóa học" };
  }
}
