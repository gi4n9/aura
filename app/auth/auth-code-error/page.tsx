"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";

export default function AuthCodeErrorPage() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-500 ${
      isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
    }`}>
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 pt-32 pb-20 relative z-10">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[140px] ${
            isDark ? "bg-red-500/10" : "bg-red-500/15"
          }`} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10 border shadow-2xl backdrop-blur-xl text-center flex flex-col items-center gap-6 ${
            isDark
              ? "bg-[#0e0e0e]/90 border-white/10 text-white"
              : "bg-white/90 border-stone-200 text-stone-900"
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
            <AlertCircle size={32} />
          </div>

          <div>
            <h1 className="font-serif text-2xl font-bold mb-2">
              {t("auth.codeErrorTitle", "Lỗi xác thực liên kết")}
            </h1>
            <p className={`text-xs leading-relaxed ${isDark ? "text-stone-400" : "text-stone-600"}`}>
              {t("auth.codeErrorSubtitle", "Mã xác thực hoặc liên kết khôi phục đã hết hạn, không hợp lệ hoặc đã được sử dụng trước đó.")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <Link
              href="/"
              className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border ${
                isDark
                  ? "border-white/10 text-stone-300 hover:bg-white/5"
                  : "border-stone-300 text-stone-700 hover:bg-stone-100"
              }`}
            >
              <ArrowLeft size={14} />
              <span>{t("nav.courses", "Trang chủ")}</span>
            </Link>
            <Link
              href="/"
              className="flex-1 py-3 px-4 bg-[#C5A059] text-[#080808] font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#e9c176] transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <RefreshCw size={14} />
              <span>{t("auth.tryAgain", "Thử lại")}</span>
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
