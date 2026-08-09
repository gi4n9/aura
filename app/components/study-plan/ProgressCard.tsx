"use client";

import { Crown, AlertCircle, CalendarDays } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Lazy load Mascot để không load Three.js ngay lập tức
const Mascot = dynamic(() => import("./Mascot"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[350px] flex items-center justify-center">
            <div className="animate-pulse text-stone-400 font-medium">Đang tải...</div>
        </div>
    ),
});

interface ProgressCardProps {
    totalSessions: number;
    completedSessions: number;
    expectedSessions: number;
    daysLeft: number;
    totalDays: number;
}

export default function ProgressCard({
    totalSessions,
    completedSessions,
    expectedSessions,
    daysLeft,
    totalDays
}: ProgressCardProps) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    // Calculation logic
    const safeTotal = totalSessions > 0 ? totalSessions : 1;
    const progressPercent = Math.min(100, Math.max(0, (completedSessions / safeTotal) * 100));
    const expectedPercent = Math.min(100, Math.max(0, (expectedSessions / safeTotal) * 100));

    // Status logic: Allow a small buffer
    const isBehind = completedSessions < (expectedSessions - 1);
    const status = isBehind ? "behind" : "ahead";

    return (
        <div className={`rounded-3xl overflow-hidden sticky top-24 transition-all duration-300 border ${
            isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-md"
        }`}>
            {/* Header Stats */}
            <div className={`p-6 border-b ${isDark ? "border-white/10" : "border-stone-200"}`}>
                <h3 className="font-serif font-bold text-xl mb-4 flex items-center justify-between">
                    {t("studyPlan.progressTitle", "Tiến độ học tập")}
                    <span className="text-[11px] font-bold tracking-wider uppercase text-[#C5A059] bg-[#C5A059]/15 px-3 py-1 rounded-full border border-[#C5A059]/30">
                        {t("studyPlan.reschedule", "Xếp lại lịch")}
                    </span>
                </h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className={`font-medium flex items-center gap-2 ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                            <CalendarDays size={16} className="text-[#C5A059]" /> {t("studyPlan.daysLeft", "Số ngày còn lại")}
                        </span>
                        <span className="font-bold text-current">
                            {daysLeft}/{totalDays} {t("studyPlan.days", "ngày")}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className={`font-medium flex items-center gap-2 ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                            <Crown size={16} className="text-[#C5A059]" /> {t("studyPlan.actualProgress", "Tiến độ thực tế")}
                        </span>
                        <div className="text-right">
                            <span className="font-bold text-[#C5A059]">
                                {completedSessions}/{totalSessions} {t("studyPlan.lessons", "bài")}
                            </span>
                            <div className={`text-[10px] ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                ({t("studyPlan.expected", "Dự kiến")}: {expectedSessions} {t("studyPlan.lessons", "bài")})
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 relative">
                        <div className={`flex justify-between text-xs mb-1 font-semibold ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            <span>{t("roadmapPage.progress", "Hoàn thành")}: {Math.round(progressPercent)}%</span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden relative ${isDark ? "bg-white/10" : "bg-stone-200"}`}>
                            {/* Expected Marker (Ghost Bar) */}
                            <div
                                className={`absolute h-full z-0 ${isDark ? "bg-white/20 border-r-2 border-white/40" : "bg-stone-300/60 border-r-2 border-stone-400"}`}
                                style={{ width: `${expectedPercent}%` }}
                                title={`Tiến độ dự kiến: ${Math.round(expectedPercent)}%`}
                            />

                            {/* Actual Progress */}
                            <div
                                className={`absolute h-full rounded-full transition-all duration-1000 z-10 ${
                                    isBehind ? "bg-amber-500" : "bg-[#C5A059]"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className={`flex justify-between text-[10px] mt-1 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            <span>0%</span>
                            <span>Mục tiêu: 100%</span>
                        </div>
                    </div>

                    {/* Status Message */}
                    <div className={`p-3.5 rounded-2xl text-xs font-medium flex gap-2.5 items-start border ${
                        isBehind
                            ? isDark ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
                            : isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}>
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                            {isBehind ? (
                                <p>{t("studyPlan.behindMsg", "Bạn đang học chậm hơn kế hoạch. Phải cố gắng hơn nữa để đạt mục tiêu nhé!")}</p>
                            ) : (
                                <p>{t("studyPlan.aheadMsg", "Bạn đang theo kịp tiến độ rất tốt! Giữ vững phong độ nhé.")}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mascot Area */}
            <div className="min-h-[320px] relative">
                <Mascot status={status} />
            </div>

            <div className={`p-4 text-center font-bold text-xs uppercase tracking-widest ${
                 isBehind
                     ? "bg-amber-600 text-white"
                     : "bg-[#C5A059] text-[#080808]"
            }`}>
                {isBehind ? "Hôm nay bạn cần bứt phá! 🏃" : "Hôm nay là một ngày tuyệt vời! 🌟"}
            </div>
        </div>
    );
}
