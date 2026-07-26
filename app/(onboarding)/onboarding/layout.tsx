"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  BookOpen,
  FileText,
  User,
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import Image from "next/image";
import { motion } from "framer-motion";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { name: t("nav.dashboard", "Tổng quan"), href: "/onboarding", icon: LayoutDashboard },
    { name: t("nav.roadmap", "Study plan"), href: "/onboarding/study-plan", icon: Map },
    { name: t("nav.myCourses", "My courses"), href: "/onboarding/my-courses", icon: BookOpen },
    { name: t("nav.practice", "Test Practice"), href: "/onboarding/practice", icon: FileText },
    { name: t("nav.profile", "Learning Profile"), href: "/onboarding/profile", icon: User },
  ];

  return (
    <div className={`h-screen w-screen overflow-hidden p-3 sm:p-4 flex gap-3 sm:gap-4 font-sans transition-colors duration-500 relative ${
      isDark ? "bg-[#080808] text-white" : "bg-[#F4F3EE] text-stone-900"
    }`}>

      {/* LEFT: FLOATING COLLAPSIBLE SIDEBAR (OVERFLOW-VISIBLE ALLOWS FLOATING HANDLE TO EXTEND OUTSIDE) */}
      <aside className={`h-full relative flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col p-3 rounded-[32px] shadow-2xl backdrop-blur-2xl liquid-glass-strong overflow-visible z-[80] ${
        isCollapsed ? "w-16 sm:w-20" : "w-64 sm:w-72"
      } ${
        isDark ? "bg-[#0e0e0e]/95 text-white border border-white/10" : "bg-white/95 text-stone-900 border border-stone-200 shadow-xl"
      }`}>

        {/* FLOATING TOGGLE HANDLE BUTTON ON MIDDLE RIGHT EDGE OF SIDEBAR (TOPMOST Z-INDEX Z-[100]) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 z-[100] focus:outline-none hover:scale-110 cursor-pointer ${
            isDark
              ? "bg-[#C5A059] text-[#080808] border-2 border-[#080808]"
              : "bg-stone-900 text-white border-2 border-white"
          }`}
          title={isCollapsed ? "Mở rộng Thanh điều hướng" : "Thu hẹp Thanh điều hướng"}
        >
          {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>

        {/* Top Logo Container */}
        <div className={`flex items-center p-2 mb-4 flex-shrink-0 ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-[#C5A059] text-[#080808] flex items-center justify-center font-bold font-serif text-xl shadow-lg shadow-[#C5A059]/30 flex-shrink-0">
              α
            </div>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-serif font-bold text-xl tracking-tight text-current whitespace-nowrap"
              >
                Aura<span className="text-[#C5A059] italic font-normal text-base">Platform</span>
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none my-2 space-y-2 pr-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-300 font-medium relative ${
                  isActive
                    ? "bg-[#C5A059] text-[#080808] font-bold shadow-lg shadow-[#C5A059]/30"
                    : isDark
                    ? "text-stone-400 hover:bg-white/10 hover:text-white"
                    : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900"
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <div className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? "w-full" : "w-6 h-6"}`}>
                  <Icon size={20} className={isActive ? "text-[#080808]" : "text-current"} />
                </div>

                {!isCollapsed && (
                  <span className="text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Home Button */}
        <div className="pt-3 border-t border-stone-500/20 mt-auto flex-shrink-0">
          <Link
            href="/"
            className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              isDark
                ? "text-stone-400 hover:bg-white/10 hover:text-white"
                : "text-stone-600 hover:bg-stone-200/70 hover:text-stone-900"
            }`}
            title={isCollapsed ? t("nav.backHome", "Về trang chủ") : undefined}
          >
            <div className={`flex items-center justify-center flex-shrink-0 ${isCollapsed ? "w-full" : "w-6 h-6"}`}>
              <ArrowLeft size={18} />
            </div>
            {!isCollapsed && (
              <span className="whitespace-nowrap">{t("nav.backHome", "Về trang chủ")}</span>
            )}
          </Link>
        </div>
      </aside>

      {/* RIGHT PANEL: TOP HEADER BAR + MAIN CONTENT AREA (FLEX COLUMN SIDE-BY-SIDE) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-visible gap-3 sm:gap-4 relative z-10">

        {/* TOP HEADER BAR (OVERFLOW-VISIBLE ALLOWS LANGUAGE DROPDOWN TO RENDER ON TOP) */}
        <header className={`h-16 flex-shrink-0 rounded-[24px] backdrop-blur-2xl flex items-center justify-between px-6 shadow-lg liquid-glass-strong overflow-visible relative z-50 ${
          isDark ? "bg-[#0e0e0e]/80 border border-white/10" : "bg-white/85 border border-stone-200"
        }`}>

          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              Aura AI Learning Hub
            </span>
          </div>

          {/* Right Actions: Theme, Lang, Notifications & Profile */}
          <div className="flex items-center gap-3 overflow-visible relative z-50">
            <ThemeSwitcher />
            <LanguageSwitcher />

            <button className={`p-2 rounded-full transition-colors ${
              isDark ? "text-stone-400 hover:text-white hover:bg-white/10" : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/70"
            }`}>
              <Bell size={18} />
            </button>

            <div className={`flex items-center gap-3 pl-4 border-l ${isDark ? "border-white/10" : "border-stone-200"}`}>
              <div className="text-right hidden md:block">
                <div className={`text-xs font-bold leading-tight ${isDark ? "text-white" : "text-stone-900"}`}>
                  {profile?.fullName || "Người dùng"}
                </div>
                <div className="text-[10px] text-[#C5A059] font-semibold uppercase tracking-wider">
                  Active Learner
                </div>
              </div>

              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border-2 border-[#C5A059] shadow-sm overflow-hidden relative flex-shrink-0">
                {profile?.avatarUrl ? (
                  <Image src={profile.avatarUrl} alt="Avatar" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#C5A059] font-bold text-xs font-serif">
                    {(profile?.fullName?.[0] || "A").toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA (INDEPENDENT Y-SCROLL CONTAINER) */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none pr-1 relative z-10">
          <div className="w-full max-w-[1600px] mx-auto p-1 sm:p-2">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
