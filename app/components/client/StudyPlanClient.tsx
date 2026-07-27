"use client";

import StudyTimeline from "@/app/components/study-plan/StudyTimelineClient";
import ProgressCard from "@/app/components/study-plan/ProgressCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

interface StudyPlanClientProps {
    schedule: any;
    totalSessions: number;
    completedSessions: number;
    expectedSessions: number;
    daysLeft: number;
    totalDays: number;
}

export default function StudyPlanClient({
    schedule,
    totalSessions,
    completedSessions,
    expectedSessions,
    daysLeft,
    totalDays,
}: StudyPlanClientProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={`w-full transition-colors duration-500 bg-transparent ${
            isDark ? "text-white" : "text-stone-900"
        }`}>
            {/* Page Header */}
            <div className="mb-6 max-w-7xl mx-auto">
                <h1 className={`text-3xl font-serif font-bold mb-1 ${isDark ? "text-white" : "text-stone-800"}`}>
                    {t("studyPlan.title", "Kế hoạch học tập")}
                </h1>
                <p className={`text-sm ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                    {t("studyPlan.subtitle", "Theo dõi lộ trình và bám sát mục tiêu của bạn từng ngày.")}
                </p>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: TIMELINE WITH INDEPENDENT INTERNAL SCROLLBAR (8 cols) */}
                <div className="lg:col-span-8 h-[calc(100vh-210px)] overflow-y-auto overflow-x-hidden pr-3 custom-scrollbar space-y-4">
                    <StudyTimeline initialSchedule={schedule} />
                </div>

                {/* RIGHT COLUMN: PROGRESS & MASCOT (4 cols) */}
                <div className="lg:col-span-4 space-y-6 sticky top-0">
                    <ProgressCard
                        totalSessions={totalSessions}
                        completedSessions={completedSessions}
                        expectedSessions={expectedSessions}
                        daysLeft={daysLeft}
                        totalDays={totalDays}
                    />
                </div>
            </div>
        </div>
    );
}
