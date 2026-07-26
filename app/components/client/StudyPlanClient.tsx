"use client";

import StudyTimeline from "@/app/components/study-plan/StudyTimelineClient";
import ProgressCard from "@/app/components/study-plan/ProgressCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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

    return (
        <div className="min-h-screen pt-[80px]">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">
                    {t("studyPlan.title", "Kế hoạch học tập")}
                </h1>
                <p className="text-stone-500">
                    {t("studyPlan.subtitle", "Theo dõi lộ trình và bám sát mục tiêu của bạn từng ngày.")}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: TIMELINE (8 cols) */}
                <div className="lg:col-span-8">
                    <StudyTimeline initialSchedule={schedule} />
                </div>

                {/* RIGHT COLUMN: PROGRESS & MASCOT (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <ProgressCard
                        totalSessions={totalSessions}
                        completedSessions={completedSessions}
                        expectedSessions={expectedSessions}
                        daysLeft={daysLeft}
                        totalDays={totalDays || 30}
                    />
                </div>
            </div>
        </div>
    );
}
