import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // nếu "next" parameter có trong URL, redirect tới đó sau khi login
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("❌ Auth Callback Error:", error.message, error);
      // Fallback for password reset flow if PKCE code_verifier is missing in server cookies
      if (next && next.includes("reset-password")) {
        return NextResponse.redirect(`${origin}/auth/reset-password?code=${code}`);
      }
    } else {
      // Tự động kiểm tra và tạo Profile cho người dùng đăng nhập qua Google OAuth nếu chưa có
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

      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Nếu lỗi, trả về trang lỗi
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
