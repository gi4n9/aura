import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import { createClient } from "@/utils/supabase/server";
import NextTopLoader from 'nextjs-toploader';
import { ClientToaster } from "@/app/components/ClientToaster";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "700"],
});

import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Aura Learning",
  description: "Nền tảng học trực tuyến",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;
  if (user) {
    try {
      userProfile = await db.profile.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          email: true,
          fullName: true,
          avatarUrl: true
        }
      });
    } catch (error) {
      console.error("Error fetching profile in RootLayout:", error);
    }
  }

  return (
    <html lang="vi">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
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
        <AuthProvider initialUser={user} initialProfile={userProfile}>
          {children}
          <ClientToaster />
        </AuthProvider>
      </body>
    </html>
  );
}