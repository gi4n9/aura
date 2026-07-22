import type { Metadata } from "next";
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import { createClient } from "@/utils/supabase/server";
import NextTopLoader from 'nextjs-toploader';
import { ClientToaster } from "@/app/components/ClientToaster";
import { db } from "@/lib/prisma";
import ChatBot from "@/app/components/chat/ChatBot";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: 'swap',
  variable: '--font-be-vietnam',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

import { LanguageProvider } from "@/lib/i18n/LanguageContext";

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

  // KHÔNG CACHE profile trong layout - cần data mới nhất khi user thay đổi
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
          avatarUrl: true,
        },
      });
    } catch (error) {
      console.error("Error fetching profile in RootLayout:", error);
    }
  }

  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${plusJakartaSans.variable}`}>
      <body className={`${beVietnamPro.className} antialiased`}>

        <NextTopLoader
          color="#C5A059"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #C5A059,0 0 5px #C5A059"
        />

        <LanguageProvider>
          <AuthProvider initialUser={user} initialProfile={userProfile}>
            {children}
            <ChatBot />
            <ClientToaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}