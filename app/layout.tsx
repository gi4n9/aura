import type { Metadata } from "next";
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "./components/AuthProvider";
import { createClient } from "@/utils/supabase/server";
import NextTopLoader from 'nextjs-toploader';
import { ClientToaster } from "@/app/components/ClientToaster";
import { db } from "@/lib/prisma";
import ClientChatBot from "@/app/components/chat/ClientChatBot";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: '--font-be-vietnam',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aura-learning.vn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aura Learning - Nền Tảng Học Trực Tuyến & Trợ Lý AI Thông Minh",
    template: "%s | Aura Learning",
  },
  description: "Aura Learning - Nền tảng học lập trình, CNTT và AI hiện đại. Lộ trình học cá nhân hóa với trợ lý AI, bóc băng bài giảng thông minh và bài tập tương tác.",
  keywords: [
    "Aura Learning",
    "học lập trình",
    "học AI",
    "khóa học trực tuyến",
    "trí tuệ nhân tạo",
    "React",
    "Next.js",
    "Python",
    "fullstack developer",
  ],
  authors: [{ name: "Aura Learning Team", url: siteUrl }],
  creator: "Aura Learning",
  publisher: "Aura Learning",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    title: "Aura Learning - Nền Tảng Học Trực Tuyến & Trợ Lý AI Thông Minh",
    description: "Khám phá các khóa học công nghệ đỉnh cao với lộ trình bài bản và trợ lý AI thông minh tại Aura Learning.",
    siteName: "Aura Learning",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura Learning - Nền Tảng Học Trực Tuyến & Trợ Lý AI",
    description: "Nâng cao kỹ năng lập trình và AI với nền tảng học tập thông minh Aura Learning.",
  },
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
    <html lang="vi" suppressHydrationWarning className={`${beVietnamPro.variable} ${plusJakartaSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "name": "Aura Learning",
              "url": siteUrl,
              "logo": `${siteUrl}/logo.png`,
              "description": "Nền tảng học trực tuyến về Lập trình, Trí tuệ nhân tạo và Công nghệ thông tin hiện đại.",
              "sameAs": [
                "https://facebook.com/auralearning",
                "https://github.com/auralearning",
                "https://youtube.com/@auralearning"
              ]
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('aura_learning_theme');
                  if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${beVietnamPro.className} antialiased transition-colors duration-300 bg-[var(--background)] text-[var(--foreground)]`}>

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

        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider initialUser={user} initialProfile={userProfile}>
              {children}
              <ClientChatBot />
              <ClientToaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}