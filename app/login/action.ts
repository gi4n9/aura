"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

// --- SIGNUP ---
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // Lấy tên để gửi sang metadata cho Trigger bắt được
  const name = (formData.get("name") as string) || email.split("@")[0];

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Quan trọng: Gửi data này để Trigger bên SQL lấy ra lưu vào bảng User
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực.",
  };
}

// --- LOGIN (Giữ nguyên) ---
export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Supabase sẽ tự check password hash trong bảng auth.users nội bộ của nó
  // Bạn không cần quan tâm password lưu ở đâu.
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email hoặc mật khẩu không chính xác" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

// --- SIGNOUT (Giữ nguyên) ---
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  const { redirect } = await import("next/navigation");
  redirect("/login");
}
