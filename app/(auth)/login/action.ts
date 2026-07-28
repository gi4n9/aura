"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveLoginError } from "@/lib/auth-error";

// --- SIGNUP ---
export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string) || email.split("@")[0];

  const { error } = await supabase.auth.signUp({
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

  return {
    success: true,
    message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực.",
  };
}

// --- LOGIN ---
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string || "").trim();
  const password = formData.get("password") as string || "";

  if (!email) {
    return { error: "Vui lòng nhập địa chỉ email của bạn.", code: "ERR_EMAIL_REQUIRED" };
  }
  if (!password) {
    return { error: "Vui lòng nhập mật khẩu.", code: "ERR_PASSWORD_REQUIRED" };
  }

  // Supabase sẽ tự check password hash trong bảng auth.users nội bộ của nó
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const resolvedError = await resolveLoginError(error, email);
    return { error: resolvedError.error, code: resolvedError.code };
  }

  let redirectUrl = "/";

  try {
    const dbUser = await prisma.profile.findUnique({
      where: { id: data.user.id },
      select: { role: true },
    });

    if (dbUser?.role === "ADMIN") {
      redirectUrl = "/admin";
    } else if (dbUser?.role === "INSTRUCTOR") {
      redirectUrl = "/instructor";
    }
  } catch (e) {
    console.error("Lỗi khi lấy thông tin Role của giảng viên/admin:", e);
  }

  revalidatePath('/', 'layout')

  return {
    success: true,
    redirectUrl: redirectUrl
  }
}

// --- SIGNOUT ---
export async function signOut() {
  const supabase = await createClient();

  revalidatePath('/', 'layout');

  return { success: true };
}
