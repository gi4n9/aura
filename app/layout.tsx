import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import { createClient } from "@/utils/supabase/server";

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
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}