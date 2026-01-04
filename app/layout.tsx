import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
