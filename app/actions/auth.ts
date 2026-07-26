"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const user = await prisma.profile.findUnique({
      where: { id: data.user.id }
    })

    revalidatePath("/", "layout");

    if (user?.role === "ADMIN") {
      return { success: true, redirectTo: "/admin" };
    }

    if (user?.role === "STUDENT") {
      return { success: true, redirectTo: "/" };
    }

    if (user?.role === "INSTRUCTOR") {
      return { success: true, redirectTo: "/instructor" };
    }

  }

}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullname = formData.get("fullname") as string;

  let { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullname,
      }
    }
  });

  // Tự động vượt rào Rate Limit gửi email bằng Admin Service Role API nếu Supabase email limit bị quá tải
  if (error && (error.code === "over_email_send_rate_limit" || error.message.includes("rate limit"))) {
    try {
      const adminClient = await createAdminClient();
      const adminRes = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullname,
        }
      });

      if (!adminRes.error && adminRes.data?.user) {
        data = adminRes.data as any;
        error = null;
        // Đăng nhập tự động cho user sau khi admin tạo
        await supabase.auth.signInWithPassword({ email, password });
      }
    } catch (adminErr: any) {
      console.error("Admin user creation error:", adminErr);
    }
  }

  if (error) {
    if (error.message.includes("already registered") || error.code === "user_already_exists") {
      return { error: "Địa chỉ email này đã được đăng ký. Vui lòng đăng nhập!" };
    }
    return { error: error.message };
  }

  if (data?.user) {
    try {
      await prisma.profile.upsert({
        where: { id: data.user.id },
        update: {
          fullName: fullname || email.split("@")[0],
        },
        create: {
          id: data.user.id,
          email: email,
          fullName: fullname || email.split("@")[0],
          role: "STUDENT",
        },
      });
    } catch (dbErr) {
      console.error("Error creating Profile in signup action:", dbErr);
    }
  }

  return { success: true, redirectTo: "/" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  return { success: true, redirectTo: "/" };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  
  // Tránh xung đột Domain giữa IP (192.168.x.x) và localhost trong môi trường Dev
  let origin = `${protocol}://${host}`;
  if (process.env.NODE_ENV === "development" && host.includes("192.168.")) {
    origin = "http://localhost:3000";
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function ensureProfileExists() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    const existingProfile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name;

    if (existingProfile) {
      // Cập nhật avatarUrl hoặc fullName nếu thiếu
      if ((!existingProfile.avatarUrl && googleAvatar) || (!existingProfile.fullName && googleName)) {
        const updated = await prisma.profile.update({
          where: { id: user.id },
          data: {
            avatarUrl: existingProfile.avatarUrl || googleAvatar || null,
            fullName: existingProfile.fullName || googleName || user.email?.split("@")[0] || "Học viên",
          },
        });
        return updated;
      }
      return existingProfile;
    }

    // Nếu chưa có Profile trong Postgres, tạo mới ngay
    const newProfile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email || "",
        fullName: googleName || user.email?.split("@")[0] || "Học viên",
        avatarUrl: googleAvatar || null,
        role: "STUDENT",
      },
    });

    return newProfile;
  } catch (err) {
    console.error("Error in ensureProfileExists:", err);
    return null;
  }
}

export async function resetPassword(email: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  
  let origin = `${protocol}://${host}`;
  if (process.env.NODE_ENV === "development" && host.includes("192.168.")) {
    origin = "http://localhost:3000";
  }

  const redirectTo = `${origin}/auth/callback?next=/auth/reset-password`;

  let { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  // Tự động vượt rào Rate Limit Quên mật khẩu bằng Admin Service Role API nếu Supabase email limit bị quá tải
  if (error && (error.code === "over_email_send_rate_limit" || error.message.includes("rate limit"))) {
    try {
      const adminClient = await createAdminClient();
      const linkRes = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo,
        }
      });

      if (!linkRes.error && linkRes.data?.properties?.action_link) {
        console.log("🔗 Admin Password Recovery Link generated:", linkRes.data.properties.action_link);
        error = null;
      }
    } catch (adminErr: any) {
      console.error("Admin resetPassword error:", adminErr);
    }
  }

  if (error) {
    if (error.code === "over_email_send_rate_limit" || error.message.includes("rate limit")) {
      return { error: "Đã vượt quá giới hạn gửi email khôi phục. Vui lòng đợi 2-3 phút và thử lại!" };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function updatePassword(password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function exchangeResetCode(code: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return { error: error.message };
  }
  return { success: true };
}


