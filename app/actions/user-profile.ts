"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const fullName = formData.get("fullName") as string;
  // Avatar xử lý riêng (upload lên storage rồi lấy url, ở đây giả sử đã có url hoặc text)
  // Trong thực tế bạn sẽ cần component upload ảnh riêng.

  try {
    await prisma.profile.update({
      where: { id: user.id }, // Lưu ý: Đảm bảo bảng User có id khớp với Supabase Auth ID
      data: {
        fullName: fullName,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/instructor/profile");
    revalidatePath("/admin/profile");

    return { success: true, message: "Cập nhật thành công!" };
  } catch (error) {
    return { success: false, error: "Lỗi cập nhật dữ liệu." };
  }
}
