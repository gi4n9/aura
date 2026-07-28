"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveLoginError } from "@/lib/auth-error";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const rawEmail = (formData.get("email") as string || "").trim();
  const password = formData.get("password") as string || "";
  const customRedirect = formData.get("redirectTo") as string | null;

  if (!rawEmail) {
    return { error: "Vui lòng nhập địa chỉ email của bạn.", code: "ERR_EMAIL_REQUIRED" };
  }
  if (!password) {
    return { error: "Vui lòng nhập mật khẩu.", code: "ERR_PASSWORD_REQUIRED" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: rawEmail,
    password
  });

  if (error) {
    const resolvedError = await resolveLoginError(error, rawEmail);
    return { error: resolvedError.error, code: resolvedError.code };
  }

  if (data.user) {
    const user = await prisma.profile.findUnique({
      where: { id: data.user.id }
    });

    revalidatePath("/", "layout");

    if (customRedirect) {
      return { success: true, redirectTo: customRedirect };
    }

    if (user?.role === "ADMIN") {
      return { success: true, redirectTo: "/admin" };
    }

    if (user?.role === "INSTRUCTOR") {
      return { success: true, redirectTo: "/instructor" };
    }

    // Regular users remain on the current page instead of forcing redirect to "/"
    return { success: true };
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullname = formData.get("fullname") as string;
  const customRedirect = formData.get("redirectTo") as string | null;

  let { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullname,
      }
    }
  });

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

  if (customRedirect) {
    return { success: true, redirectTo: customRedirect };
  }

  return { success: true };
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

    if (existingProfile) {
      if (!existingProfile.avatarUrl && googleAvatar) {
        const updated = await prisma.profile.update({
          where: { id: user.id },
          data: { avatarUrl: googleAvatar }
        });
        return updated;
      }
      return existingProfile;
    }

    const newProfile = await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email || "",
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
        avatarUrl: googleAvatar || null,
        role: "STUDENT",
      },
    });

    return newProfile;
  } catch (error) {
    console.error("Error in ensureProfileExists:", error);
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
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

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
