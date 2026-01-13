import { prisma } from "@/lib/prisma";

// 1. Lấy danh sách tất cả khóa học
export async function getCourses() {
  const courses = await prisma.playlist.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      videos: {
        take: 1,
        orderBy: {
          stt: "asc",
        },
      },
    },
  });
  return courses;
}

// 2. Lấy thông tin chi tiết khóa học theo ID
export async function getCourseById(id: string) {
  const course = await prisma.playlist.findUnique({
    where: { id },
    include: {
      videos: {
        orderBy: {
          stt: "asc",
        },
      },
      _count: {
        select: { videos: true },
      },
    },
  });
  return course;
}

// 3. Lấy danh sách rút gọn cho dropdown
export async function getCourseForSelect() {
  return await prisma.playlist.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
    },
  });
}

// 4. Tạo khóa học mới
export async function createCourseService(data: {
  title: string;
  description: string;
  channel: string;
}) {
  return await prisma.playlist.create({
    data: {
      title: data.title,
      description: data.description,
      channel: data.channel,
      thumbnail: "",
    },
  });
}
