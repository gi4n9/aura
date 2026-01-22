import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import { createClient } from "@/utils/supabase/server";
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aura Learning",
  description: "Nền tảng học trực tuyến",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Chỉ lấy user để nạp vào Context, không check Role ở đây
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="vi">
      <body className={inter.className}>
        <NextTopLoader
          color="#C5A059" // Màu vàng gold của Aura
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #C5A059,0 0 5px #C5A059"
        />
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}