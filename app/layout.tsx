import type { Metadata } from "next";

import { Inter, Playfair_Display } from "next/font/google";

import "./globals.css";

import { createClient } from "@/utils/supabase/server";

import Header from "@/app/components/Header";

import { AuthProvider } from "./components/AuthProvider";

import ChatBot from "./components/ChatBot";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});
const playfair = Playfair_Display({ subsets: ['latin','vietnamese'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: "Aura Learning - Nền tảng học trực tuyến hàng đầu Việt Nam",
  description: "Khám phá hàng ngàn khóa học chất lượng cao từ các chuyên gia hàng đầu. Học mọi lúc, mọi nơi với trải nghiệm học tập cá nhân hóa.",
  keywords: ["học trực tuyến", "khóa học online", "video learning", "e-learning", "học lập trình"],
  authors: [{ name: "Aura Learning" }],
  openGraph: {
    title: "Aura Learning - Nền tảng học trực tuyến hàng đầu Việt Nam",
    description: "Khám phá hàng ngàn khóa học chất lượng cao từ các chuyên gia hàng đầu.",
    type: "website",
  },
};

// 3. Chuyển thành async function để dùng await
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 4. Khởi tạo Supabase và lấy User
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("Current User in Layout:", user?.email);

  return (
    <html lang="vi">
      <body className={`${inter.className} ${playfair.variable} font-sans antialiased bg-nobel-cream text-nobel-dark`}>
        {/* Bọc toàn bộ app trong AuthProvider */}
        <AuthProvider initialUser={user} key={user?.id}>
          
          {/* Header giờ sẽ tự lấy user từ Context, không cần truyền prop nữa (hoặc giữ prop cũng được) */}
          <Header />
          
          <main className="min-h-screen pt-16">
            {children}
            <ChatBot />
          </main>

          
        </AuthProvider>
      </body>
      
    </html>
  );
}