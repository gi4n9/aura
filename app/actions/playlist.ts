"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// 1. Hàm tạo khóa học mới
export async function createPlaylist(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const channel = formData.get("channel") as string; // Tên giảng viên

  if (!title) return { error: "Vui lòng nhập tên khóa học" };

  try {
    await prisma.playlist.create({
      data: {
        title,
        description,
        channel,
        thumbnail: "", // Có thể nâng cấp upload ảnh thumbnail sau
      },
    });

    revalidatePath("/instructor/upload"); // Refresh lại trang upload để thấy khóa mới
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Lỗi tạo khóa học" };
  }
}

// 2. Hàm lấy danh sách khóa học (chỉ lấy id và title cho nhẹ)
export async function getPlaylistsForSelect() {
  const playlists = await prisma.playlist.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
    },
  });
  return playlists;
}
