import { prisma } from "@/lib/prisma";
import { redirect } from "next/dist/client/components/navigation";
import { createClient } from "@/utils/supabase/server";

// 1. Lấy danh sách tất cả khóa học
export async function getCourses() {
  const courses = await prisma.course.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      instructor: true, // Lấy thông tin giảng viên
      organization: true, // Lấy thông tin tổ chức
      _count: {
        select: { chapters: true }, // Đếm số chương
      },
      // Lấy chương đầu tiên và bài học đầu tiên để hiển thị preview (nếu cần)
      chapters: {
        orderBy: { position: "asc" },
        take: 1,
        include: {
          lessons: {
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      },
    },
  });
  return courses;
}

// 2. Lấy thông tin chi tiết khóa học theo ID (Kèm toàn bộ chương và bài học)
export async function getCourseById(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      instructor: true,
      organization: true,
      chapters: {
        orderBy: {
          position: "asc", // Sắp xếp chương theo thứ tự
        },
        include: {
          lessons: {
            orderBy: {
              position: "asc", // Sắp xếp bài học theo thứ tự
            },
          },
        },
      },
      _count: {
        select: {
          chapters: true, // Đếm số chương
        },
      },
    },
  });
  return course;
}

// 3. Lấy danh sách rút gọn cho dropdown
export async function getCourseOfInstructorForSelect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  return await prisma.course.findMany({
    where: {
      instructorId: user.id,
      status: "PUBLISHED", // Thường chỉ cho chọn khóa đã public
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
    },
  });
}

// 4. Tạo khóa học mới
export async function createCourseService(data: {
  title: string;
  description?: string;
  instructorId: string;
  thumbnailUrl?: string;
  categoryId?: string;
  price?: number;
}) {
  return await prisma.course.create({
    data: {
      title: data.title,
      description: data.description || "",
      instructorId: data.instructorId,
      thumbnailUrl: data.thumbnailUrl || null,
      categoryId: data.categoryId || null,
      price: data.price || 0,
      status: "DRAFT",
    },
  });
}
