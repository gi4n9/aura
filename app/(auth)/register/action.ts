"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function register(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  // 1. Đăng ký tài khoản bên Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName, // Lưu tên vào metadata của Supabase
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // 2. Đồng bộ User sang Database chính (Prisma)
  // Bước này cực quan trọng để sau này check Role (USER, ADMIN, INSTRUCTOR)
  if (data.user) {
    try {
      await prisma.profile.create({
        data: {
          id: data.user.id, // ID phải khớp với Supabase
          email: email,
          fullName: fullName,
          avatarUrl: "", // Avatar rỗng
        },
      });
    } catch (dbError) {
      console.error("Lỗi đồng bộ Prisma:", dbError);
      // Có thể user đã tồn tại hoặc lỗi kết nối, nhưng account Supabase đã tạo xong
    }
  }

  // 3. Xử lý sau khi đăng ký
  // Nếu Supabase bật chế độ "Confirm Email", ta cần báo user check mail
  if (data.session) {
    // Nếu không cần xác thực mail -> Đăng nhập luôn -> Redirect về Home
    redirect("/");
  } else {
    // Nếu cần xác thực mail -> Trả về thông báo thành công
    return {
      success: true,
      message:
        "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
    };
  }
}
