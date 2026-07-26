"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen, Map, Calendar, PlayCircle, Trophy,
  ArrowRight, CheckCircle, Clock, User, FileText,
  Sparkles, TrendingUp, Target, Flame, Settings,
  Plus, MoreHorizontal, ArrowUpRight, HelpCircle,
  Users, Award, BarChart3, Layers, Compass
} from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface LearningDashboardProps {
  userName: string;
  roadmapTitle: string;
  totalHours: number;
  completedItems: number;
  totalItems: number;
  totalCups: number;
  weeklyCompletedLessons: number;
  nextLesson: {
    id: string;
    title: string;
    courseTitle: string;
    courseId: string;
  } | null;
  courses: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    instructorName: string;
    totalLessons: number;
    progress: number;
  }[];
  totalCoursesCount: number;
  interests: string[];
}

export default function LearningDashboard({
  userName,
  roadmapTitle,
  totalHours,
  completedItems,
  totalItems,
  totalCups,
  weeklyCompletedLessons,
  nextLesson,
  courses,
  totalCoursesCount,
  interests
}: LearningDashboardProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState("overview");

  const progressPercent = Math.min(100, Math.round((completedItems / (totalItems || 1)) * 100));
  const practiceHours = Math.round(completedItems * 1.5 * 10) / 10;

  const tabs = [
    { id: "overview", label: t("nav.dashboard", "Tổng quan") },
    { id: "study-plan", label: t("nav.roadmap", "Lộ trình học") },
    { id: "courses", label: t("nav.myCourses", "Khóa học của tôi") },
    { id: "practice", label: t("nav.practice", "Bài tập & Quiz") },
    { id: "ai", label: "AI Trợ lý" },
    { id: "analytics", label: "Thống kê" },
  ];

  // Bar chart dataset matching reference image style
  const chartBars = [
    { date: "27 Jun", height1: 75, height2: 45, label: "85%" },
    { date: "28 Jun", height1: 50, height2: 30, label: "62%" },
    { date: "29 Jun", height1: 65, height2: 25, label: "70%" },
    { date: "30 Jun", height1: 20, height2: 80, label: "40%", dotted: true },
    { date: "1 Jul",  height1: 85, height2: 55, label: "87%", active: true },
    { date: "2 Jul",  height1: 30, height2: 60, label: "50%", dotted: true },
    { date: "3 Jul",  height1: 55, height2: 40, label: "68%" },
    { date: "4 Jul",  height1: 45, height2: 35, label: "58%" },
  ];

  return (
    <div className="space-y-6 pb-12">

      {/* TOP TITLE & ACTION HEADER (MATCHING REFERENCE IMAGE) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className={`font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight flex flex-wrap items-center gap-3 ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            <span>Managing</span>
            <span className="w-9 h-9 rounded-full bg-[#C5A059]/20 border border-[#C5A059] text-[#C5A059] flex items-center justify-center text-sm inline-flex">
              <Sparkles size={18} />
            </span>
            <span>Your Learning Path</span>
            <br className="hidden sm:inline" />
            <span>and</span>
            <span className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400 text-amber-400 flex items-center justify-center text-sm inline-flex">
              <Target size={18} />
            </span>
            <span className="text-[#C5A059] italic">AI Workflows</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto">
          <button className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all liquid-glass ${
            isDark ? "text-stone-300 hover:text-white" : "text-stone-700 hover:text-stone-900 shadow-sm"
          }`}>
            <Settings size={20} />
          </button>

          <Link
            href="/onboarding/study-plan/create"
            className={`px-6 py-3.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 shadow-xl hover:scale-105 ${
              isDark
                ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176] shadow-[0_0_25px_rgba(197,160,89,0.35)]"
                : "bg-stone-900 text-white hover:bg-stone-800 shadow-lg"
            }`}
          >
            <Plus size={18} />
            <span>{t("studyPlan.createPlan", "+ Tạo kế hoạch mới")}</span>
          </Link>
        </div>
      </div>

      {/* HORIZONTAL CATEGORY TABS PILL ROW */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id
                ? isDark
                  ? "bg-white text-[#080808] shadow-lg"
                  : "bg-stone-900 text-white shadow-md"
                : isDark
                  ? "bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white"
                  : "bg-white/70 text-stone-600 hover:bg-white hover:text-stone-900 shadow-sm"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN BENTO GRID LAYOUT (3 METRICS CARDS + CHART + RIGHT SIDEBAR CARDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT & CENTER COLUMN (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">

          {/* TOP METRICS ROW (3 CARDS MATCHING REFERENCE IMAGE) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* CARD 1: OPERATIONS / LESSONS COMPLETED */}
            <div className={`p-6 rounded-3xl transition-all relative overflow-hidden flex flex-col justify-between liquid-glass ${
              isDark ? "text-white" : "text-stone-900 shadow-md"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-stone-500/10 flex items-center justify-center text-[#C5A059]">
                    <Target size={16} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Bài học hoàn thành</span>
                </div>
                <button className="text-stone-400 hover:text-current">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="flex items-baseline justify-between mb-4">
                <div className="font-serif text-3xl font-bold">
                  {completedItems} <span className="text-base text-stone-400 font-sans font-normal">/ {totalItems}</span>
                </div>
                <div className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#C5A059]/20 text-[#C5A059]">
                  {progressPercent}% ◯
                </div>
              </div>

              {/* Connected Pill Segment Progress */}
              <div className="flex items-center gap-1.5 pt-2">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-7 flex-1 rounded-full border transition-all ${
                      i < Math.round((progressPercent / 100) * 8)
                        ? isDark
                          ? "bg-white border-white"
                          : "bg-stone-900 border-stone-900"
                        : isDark
                          ? "bg-transparent border-white/20 border-dashed"
                          : "bg-stone-100 border-stone-300 border-dashed"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* CARD 2: DATA TRANSFER / PRACTICE HOURS */}
            <div className={`p-6 rounded-3xl transition-all relative overflow-hidden flex flex-col justify-between ${
              isDark
                ? "bg-[#C5A059]/20 border border-[#C5A059]/40 text-white"
                : "bg-amber-100/70 border border-amber-300/80 text-stone-900 shadow-md"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#C5A059]/30 flex items-center justify-center text-[#080808]">
                    <Clock size={16} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Thời gian Luyện tập</span>
                </div>
                <button className="text-stone-500 hover:text-current">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="flex items-baseline justify-between mb-4">
                <div className="font-serif text-3xl font-bold">
                  {practiceHours} <span className="text-base opacity-60 font-sans font-normal">/ {totalHours || 24}h</span>
                </div>
                <div className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#080808]/15 text-current">
                  68% ◯
                </div>
              </div>

              {/* Connected Gold Pill Segment Progress */}
              <div className="flex items-center gap-1.5 pt-2">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-7 flex-1 rounded-full border transition-all ${
                      i < 5
                        ? "bg-[#080808] border-[#080808]"
                        : "bg-transparent border-current/30 border-dashed"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* CARD 3: FEATURED PROMO / NEXT LESSON PROMO */}
            <div className="p-6 rounded-3xl transition-all relative overflow-hidden flex flex-col justify-between bg-stone-900 text-white shadow-xl group">
              <div className="absolute inset-0 z-0 opacity-40 overflow-hidden">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                >
                  <source
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4"
                    type="video/mp4"
                  />
                </video>
              </div>
              <div className="relative z-10 space-y-3">
                <h3 className="font-serif text-xl font-bold leading-tight">
                  Take Your Learning to the Next Level
                </h3>
                <p className="text-xs text-stone-300 line-clamp-2">
                  {nextLesson?.title || "Khai phá trợ lý AI giúp tăng tốc hiệu quả gấp 300%"}
                </p>
              </div>

              <div className="relative z-10 pt-4">
                <Link
                  href={nextLesson ? `/courses/${nextLesson.courseId}/lessons/${nextLesson.id}` : "/roadmap"}
                  className="w-full py-3 px-5 rounded-full bg-white text-[#080808] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#C5A059] transition-all duration-300 shadow-lg"
                >
                  <span>{nextLesson ? "Học ngay ▷" : "Khám phá AI ▷"}</span>
                </Link>
              </div>
            </div>

          </div>

          {/* MAIN CHART SECTION (STATISTICS MATCHING REFERENCE IMAGE) */}
          <div className={`p-6 sm:p-8 rounded-3xl transition-all relative overflow-hidden liquid-glass ${
            isDark ? "text-white" : "text-stone-900 shadow-md"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <BarChart3 size={22} className="text-[#C5A059]" />
                  <h2 className="font-serif text-2xl font-bold">Statistics</h2>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#080808] dark:bg-white inline-block" />
                    Bài học hoàn thành
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    Giờ luyện tập
                  </span>
                </div>
              </div>

              <div className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                isDark ? "bg-white/5 border-white/10" : "bg-stone-100 border-stone-200 text-stone-800"
              }`}>
                <span>2026</span>
                <span>▾</span>
              </div>
            </div>

            {/* BAR CHART PILLARS */}
            <div className="h-64 sm:h-72 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-stone-500/20">
              {chartBars.map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Floating percentage badge */}
                  {bar.active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mb-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#080808] text-white dark:bg-white dark:text-[#080808] shadow-lg"
                    >
                      {bar.label}
                    </motion.div>
                  )}

                  {/* Dual Capsule Bar */}
                  <div className={`w-full max-w-[36px] rounded-full flex flex-col items-center justify-end p-1 transition-all duration-500 relative ${
                    bar.dotted
                      ? "border border-dashed border-stone-400/40"
                      : isDark
                      ? "bg-white/5"
                      : "bg-stone-100"
                  }`} style={{ height: `${bar.height1}%` }}>
                    {/* Top capsule segment */}
                    <div
                      className={`w-full rounded-full transition-all duration-700 mb-1 ${
                        isDark ? "bg-white" : "bg-stone-900"
                      }`}
                      style={{ height: `${bar.height2}%` }}
                    />
                    {/* Bottom capsule segment */}
                    <div
                      className="w-full rounded-full bg-amber-400 transition-all duration-700"
                      style={{ height: `${100 - bar.height2}%` }}
                    />
                  </div>

                  {/* Date label */}
                  <span className={`text-[11px] font-medium mt-3 ${
                    isDark ? "text-stone-400" : "text-stone-500"
                  }`}>
                    {bar.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN CARDS STACK (4 COLS MATCHING REFERENCE IMAGE) */}
        <div className="lg:col-span-4 space-y-5">

          {/* TOP 2 SMALL BENTO BUTTONS */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/community"
              className={`p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3 transition-all hover:scale-105 liquid-glass ${
                isDark ? "text-white" : "text-stone-900 shadow-sm"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center">
                <Users size={20} />
              </div>
              <span className="text-xs font-bold">Community</span>
            </Link>

            <Link
              href="/courses"
              className={`p-6 rounded-3xl flex flex-col items-center justify-center text-center gap-3 transition-all hover:scale-105 liquid-glass ${
                isDark ? "text-white" : "text-stone-900 shadow-sm"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-400/15 text-amber-500 flex items-center justify-center">
                <Award size={20} />
              </div>
              <span className="text-xs font-bold">Academy</span>
            </Link>
          </div>

          {/* CARD 1: HELP CENTER */}
          <Link
            href="/contact"
            className={`p-6 rounded-3xl transition-all block group relative overflow-hidden liquid-glass ${
              isDark ? "text-white" : "text-stone-900 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-500/10 flex items-center justify-center text-current">
                <HelpCircle size={20} />
              </div>
              <ArrowUpRight size={20} className="text-stone-400 group-hover:text-[#C5A059] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>
            <h3 className="font-serif text-lg font-bold mb-1">Help Center</h3>
            <p className="text-xs text-stone-400 line-clamp-2">
              Explore our detailed documentation & AI guides for optimal learning.
            </p>
          </Link>

          {/* CARD 2: PARTNER DIRECTORY / AI ROADMAP */}
          <Link
            href="/roadmap"
            className={`p-6 rounded-3xl transition-all block group relative overflow-hidden liquid-glass ${
              isDark ? "text-white" : "text-stone-900 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C5A059]/15 flex items-center justify-center text-[#C5A059]">
                <Compass size={20} />
              </div>
              <ArrowUpRight size={20} className="text-stone-400 group-hover:text-[#C5A059] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>
            <h3 className="font-serif text-lg font-bold mb-1">AI Roadmap Directory</h3>
            <p className="text-xs text-stone-400 line-clamp-2">
              Find the perfect learning path to support your career growth.
            </p>
          </Link>

          {/* CARD 3: BLOG & KNOWLEDGE HUB */}
          <Link
            href="/about"
            className={`p-6 rounded-3xl transition-all block group relative overflow-hidden liquid-glass ${
              isDark ? "text-white" : "text-stone-900 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                <Layers size={20} />
              </div>
              <ArrowUpRight size={20} className="text-stone-400 group-hover:text-[#C5A059] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>
            <h3 className="font-serif text-lg font-bold mb-1">Aura Knowledge Hub</h3>
            <p className="text-xs text-stone-400 line-clamp-2">
              Access popular guides & stories about AI education & engineering.
            </p>
          </Link>

          {/* CARD 4: PRACTICE & EXAMS */}
          <Link
            href="/onboarding/practice"
            className={`p-6 rounded-3xl transition-all block group relative overflow-hidden liquid-glass ${
              isDark ? "text-white" : "text-stone-900 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <FileText size={20} />
              </div>
              <ArrowUpRight size={20} className="text-stone-400 group-hover:text-[#C5A059] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>
            <h3 className="font-serif text-lg font-bold mb-1">Use Cases & Practice</h3>
            <p className="text-xs text-stone-400 line-clamp-2">
              Get inspired by practice questions, interactive quizzes & code challenges.
            </p>
          </Link>

        </div>

      </div>

    </div>
  );
}
