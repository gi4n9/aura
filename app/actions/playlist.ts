"use server";

import { revalidatePath } from "next/cache";

import {
  createCourseService,
  getCourseForSelect,
} from "@/services/courses/courses";

export async function createPlaylist(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const channel = formData.get("channel") as string;

  if (!title) {
    return {
      error: "Tiêu đề khóa học không được để trống.",
    };
  } else if (!description) {
    return {
      error: "Mô tả khóa học không được để trống.",
    };
  } else if (!channel) {
    return {
      error: "Kênh giảng dạy không được để trống.",
    };
  }

  try {
    await createCourseService({ title, description, channel });

    revalidatePath("/admin/courses");

    return {
      success: true,
      message: "Tạo khóa học thành công!",
    };
  } catch (error) {
    return {
      error: "Đã có lỗi xảy ra khi tạo khóa học. Vui lòng thử lại.",
    };
  }
}

export async function getPlaylistsForSelect() {
  try {
    const playlists = await getCourseForSelect();
    return playlists;
  } catch (error) {
    console.log("Đã có lỗi xảy ra khi lấy danh sách khóa học:", error);
    return [];
  }
}
