import { createServerClient } from "@supabase/ssr";
import { es } from "date-fns/locale";
import { NextResponse, type NextRequest } from "next/server";

// Paths không cần auth check
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api",
  "/auth",
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (error.message !== "Auth session missing!") {
        console.warn("⚠️ Lỗi Auth thực tế:", error.message);
      }
    } else {
      user = data.user;
    }
  } catch (error: any) {
    console.error(" Lỗi nghiêm trọng từ Supabase Auth:", error.message)
  }


  // --- ROLE-BASED REDIRECT LOGIC ---
  // Chỉ check role khi ở root path "/" và đã đăng nhập
  if (pathname === "/" && user) {
    try {
      const { data: profile, error } = await supabase
        .from("Profile")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile && !error) {
        if (profile.role === "INSTRUCTOR") {
          return NextResponse.redirect(new URL("/instructor", request.url));
        } else if (profile.role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
    } catch (e) {
      console.error("Proxy role check error:", e);
    }
  }

  return supabaseResponse;
}

// Cấu hình matcher tối ưu
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|models|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|glb|gltf|woff|woff2|ttf|eot)$).*)",
  ],
};

