"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass, ArrowRight, Sparkles, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import RoadmapView from "@/app/components/RoadmapView";

interface RoadmapClientPageProps {
  roadmap: any | null;
  profile: any | null;
  skipRoadmapNodeAction: (nodeId: string) => Promise<any>;
}

export default function RoadmapClientPage({
  roadmap,
  profile,
  skipRoadmapNodeAction,
}: RoadmapClientPageProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // CASE 1: NO ROADMAP YET (EMPTY STATE)
  if (!roadmap) {
    return (
      <div className={`min-h-screen flex flex-col justify-between transition-colors duration-500 font-sans ${
        isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
      }`}>
        <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-24 relative z-10 overflow-hidden">
          {/* Ambient space glow */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px] ${
              isDark ? "bg-[#C5A059]/12" : "bg-[#C5A059]/20"
            }`} />
            <div className={`absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full blur-[100px] ${
              isDark ? "bg-amber-600/10" : "bg-amber-500/15"
            }`} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 w-full max-w-xl rounded-3xl p-8 md:p-12 text-center flex flex-col items-center liquid-glass-gold shadow-2xl ${
              isDark ? "text-white" : "text-stone-900"
            }`}
          >
            {/* Animated Icon Badge */}
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#C5A059] to-amber-600 flex items-center justify-center text-[#080808] mb-8 shadow-[0_10px_30px_rgba(197,160,89,0.35)] relative group"
            >
              <Compass size={48} strokeWidth={1.5} className="group-hover:rotate-45 transition-transform duration-700" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-[#C5A059] shadow-sm">
                <Sparkles size={10} />
              </div>
            </motion.div>

            {/* Badge Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-4 text-[#C5A059] liquid-glass">
              <Rocket size={14} />
              <span>Aura AI Pathfinder</span>
            </div>

            {/* Headline */}
            <h1 className={`font-serif text-3xl md:text-4xl font-bold mb-4 tracking-tight leading-tight ${
              isDark ? "text-white" : "text-stone-900"
            }`}>
              {t("roadmapPage.notStartedTitle", "Hành trình chưa bắt đầu")}
            </h1>

            {/* Subtitle */}
            <p className={`text-base leading-relaxed mb-8 max-w-md font-light ${
              isDark ? "text-stone-300" : "text-stone-600"
            }`}>
              {t("roadmapPage.notStartedDesc", "Hãy hoàn thành bài đánh giá ngắn để hệ thống thiết lập lộ trình học tập tối ưu nhất dành riêng cho bạn.")}
            </p>

            {/* CTA Button */}
            <Link
              href="/onboarding"
              className={`w-full sm:w-auto px-10 py-4 rounded-full text-xs font-bold tracking-[0.18em] uppercase transition-all duration-300 flex items-center justify-center gap-3 ${
                isDark
                  ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176] shadow-[0_0_30px_rgba(197,160,89,0.4)] hover:scale-105"
                  : "bg-stone-900 text-white hover:bg-stone-800 shadow-xl hover:scale-105"
              }`}
            >
              <span>{t("roadmapPage.startSetupBtn", "Bắt đầu thiết lập lộ trình")}</span>
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  // CASE 2: ROADMAP EXISTS (POPULATED STATE)
  return (
    <div className={`min-h-screen transition-colors duration-500 pb-24 font-sans ${
      isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
    }`}>
      <main className="max-w-5xl mx-auto px-6 pt-32 sm:pt-36 space-y-8 relative z-10">
        {/* Top Header bar */}
        <div className="flex items-center justify-between py-4 border-b border-[#C5A059]/20">
          <Link
            href="/onboarding/study-plan"
            className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
              isDark ? "text-stone-400 hover:text-[#C5A059]" : "text-stone-600 hover:text-[#C5A059]"
            }`}
          >
            <ArrowLeft size={18} />
            {t("roadmapPage.backToStudyPlan", "Quay lại kế hoạch học")}
          </Link>

          <h1 className={`font-serif text-2xl md:text-3xl font-bold ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            {t("roadmapPage.pageTitle", "Lộ trình học tập của bạn")}
          </h1>

          <div className="w-16" />
        </div>

        {/* Main Roadmap Tree View */}
        <RoadmapView
          nodes={roadmap.nodes.map((node: any) => ({
            ...node,
            course: {
              ...node.course,
              price: Number(node.course.price)
            }
          }))}
          title={t("roadmapPage.coreJourney", "Hành trình Cốt lõi")}
          description={t("roadmapPage.coreJourneyDesc", "Các khóa học được hệ thống tự động tính toán dựa trên sở thích của bạn.")}
          progressPercentage={roadmap.progressPercentage}
          onSkipNode={skipRoadmapNodeAction}
        />

        {/* Action button */}
        <div className="flex justify-center py-6">
          <Link
            href="/onboarding/study-plan/create"
            className={`px-10 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 text-base shadow-xl hover:scale-105 ${
              isDark
                ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176] shadow-[0_0_30px_rgba(197,160,89,0.35)]"
                : "bg-stone-900 text-white hover:bg-stone-800 shadow-xl"
            }`}
          >
            {t("roadmapPage.createDailySchedule", "Bắt đầu tạo lịch học mỗi ngày")} <ArrowRight size={20} />
          </Link>
        </div>

        {/* Modern Stats Footer */}
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { label: t("roadmapPage.topics", "Chủ đề"), value: roadmap.totalCourses, color: "text-[#C5A059]" },
            { label: t("roadmapPage.progress", "Tiến độ"), value: `${roadmap.progressPercentage}%`, color: "text-[#C5A059]" },
            { label: t("roadmapPage.interests", "Lĩnh vực"), value: profile?.interests?.length || 0, color: "text-[#C5A059]" }
          ].map((stat, i) => (
            <div key={i} className={`p-5 rounded-2xl text-center liquid-glass ${
              isDark ? "text-white" : "text-stone-900 shadow-md"
            }`}>
              <div className={`text-2xl sm:text-3xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
              <div className={`text-[11px] uppercase tracking-widest font-bold ${
                isDark ? "text-stone-400" : "text-stone-500"
              }`}>{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
