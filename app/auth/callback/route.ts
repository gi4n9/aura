import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // Xử lý OTP Token Hash (cho Supabase Recovery / Magic Links)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const redirectUrl = next ? `${origin}${next}` : `${origin}/`;
      return NextResponse.redirect(redirectUrl);
    } else {
      console.error("❌ Auth Callback OTP Error:", error.message);
    }
  }

  // Xử lý PKCE Code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const existingProfile = await prisma.profile.findUnique({
            where: { id: user.id },
          });

          if (!existingProfile) {
            const fullName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "Học viên";
            const avatarUrl =
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              null;

            await prisma.profile.create({
              data: {
                id: user.id,
                email: user.email || "",
                fullName,
                avatarUrl,
                role: "STUDENT",
              },
            });
          }
        } catch (dbErr) {
          console.error("Error creating OAuth profile in callback:", dbErr);
        }
      }

      const redirectUrl = next ? `${origin}${next}` : `${origin}/`;
      return NextResponse.redirect(redirectUrl);
    } else {
      console.error("❌ Auth Callback Code Error:", error.message);
      // Nếu là reset-password flow và code exchange bị lỗi do đã tiêu thụ ở server hoặc thiếu PKCE verifier, 
      // vẫn redirect về trang reset-password để client kiểm tra session hiện tại
      if (next && next.includes("reset-password")) {
        return NextResponse.redirect(`${origin}/auth/reset-password?code=${code}`);
      }
    }
  }

  // Trả về trang lỗi nếu không xác thực được
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
