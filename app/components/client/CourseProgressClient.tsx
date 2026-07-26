"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProgressDetailsList from "@/app/components/courseComponents/ProgressDetailsList";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

interface CourseProgressClientProps {
    courseId: string;
    courseTitle: string;
    chapters: any[];
    progressPercent: number;
    completedLessonsCount: number;
    totalLessonsCount: number;
    lessonProgressObj: any;
}

export default function CourseProgressClient({
    courseId,
    courseTitle,
    chapters,
    progressPercent,
    completedLessonsCount,
    totalLessonsCount,
    lessonProgressObj,
}: CourseProgressClientProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen p-6 font-sans pt-[80px] transition-colors duration-500 ${
            isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
        }`}>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* HEADER */}
                <div>
                    <Link href={`/courses/${courseId}`} className={`inline-flex items-center text-sm mb-4 transition-colors ${
                        isDark ? "text-stone-400 hover:text-[#C5A059]" : "text-stone-500 hover:text-[#C5A059]"
                    }`}>
                        <ArrowLeft size={16} className="mr-2" /> {t("progressPage.backToCourse", "Quay lại khóa học")}
                    </Link>
                    <h1 className={`text-3xl font-serif font-bold ${isDark ? "text-white" : "text-stone-800"}`}>{courseTitle}</h1>
                    <p className={`mt-1 ${isDark ? "text-stone-400" : "text-stone-500"}`}>{t("progressPage.subtitle", "Kết quả học tập & Tiến độ làm bài")}</p>
                </div>

                {/* OVERALL PROGRESS CARD */}
                <div className={`rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 liquid-glass ${
                    isDark ? "text-white" : "text-stone-900 shadow-md"
                }`}>
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke={isDark ? "rgba(255,255,255,0.1)" : "#E7E5E4"} strokeWidth="12" fill="transparent" />
                            <circle
                                cx="64" cy="64" r="56"
                                stroke="#C5A059" strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={351.8}
                                strokeDashoffset={351.8 - (351.8 * progressPercent) / 100}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <span className={`absolute text-2xl font-bold font-mono ${isDark ? "text-white" : "text-stone-900"}`}>{progressPercent}%</span>
                    </div>

                    <div className="space-y-2 text-center md:text-left">
                        <h3 className={`text-xl font-serif font-bold ${isDark ? "text-white" : "text-stone-900"}`}>{t("progressPage.overallProgress", "Tiến độ tổng quan")}</h3>
                        <p className={`text-sm ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            {t("progressPage.completedLessons", "Đã hoàn thành")} <span className="font-bold text-[#C5A059]">{completedLessonsCount}</span> / {totalLessonsCount} {t("progressPage.lessons", "bài học")}
                        </p>
                    </div>
                </div>

                {/* DETAILS BY CHAPTER */}
                <ProgressDetailsList
                    chapters={chapters}
                    lessonProgress={lessonProgressObj}
                />

            </div>
        </div>
    );
}
