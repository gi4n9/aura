"use server";

import { revalidatePath } from "next/cache";
// import { redirect } from "next/navigation"; // <-- Bỏ cái này ở logic chính đi
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

// --- LOGIN ---
export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Thay vì redirect, trả về lỗi
    return { error: "Email hoặc mật khẩu không chính xác" };
  }

  // Refresh lại data
  revalidatePath("/", "layout");

  // Trả về thành công
  return { success: true };
}

// --- SIGNUP ---
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string) || email.split("@")[0];

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          name: name,
          role: "USER",
          avatarUrl: null,
        },
      });
    } catch (e) {
      console.error("Lỗi Prisma:", e);
      // Không cần return lỗi ở đây nếu không muốn chặn người dùng
    }
  }

  // Trả về thành công kèm thông báo để client redirect
  return {
    success: true,
    message:
      "Đăng ký thành công! Vui lòng kiểm tra email (nếu cần) và đăng nhập.",
  };
}

// Hàm signOut giữ nguyên redirect cũng được, hoặc chuyển sang client redirect
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  // return { success: true }; // Nếu muốn client redirect
  // Nhưng signOut thường ít lỗi hơn nên để redirect vẫn được, nếu lỗi thì sửa sau.
  const { redirect } = await import("next/navigation");
  redirect("/login");
}
