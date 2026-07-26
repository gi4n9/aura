"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProgressDetailsList from "@/app/components/courseComponents/ProgressDetailsList";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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

    return (
        <div className="min-h-screen bg-[#F9F8F4] p-6 font-sans pt-[80px]">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* HEADER */}
                <div>
                    <Link href={`/courses/${courseId}`} className="inline-flex items-center text-sm text-stone-500 hover:text-[#C5A059] mb-4 transition-colors">
                        <ArrowLeft size={16} className="mr-2" /> {t("progressPage.backToCourse", "Quay lại khóa học")}
                    </Link>
                    <h1 className="text-3xl font-serif font-bold text-stone-800">{courseTitle}</h1>
                    <p className="text-stone-500 mt-1">{t("progressPage.subtitle", "Kết quả học tập & Tiến độ làm bài")}</p>
                </div>

                {/* OVERALL PROGRESS CARD */}
                <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="#E7E5E4" strokeWidth="12" fill="transparent" />
                            <circle
                                cx="64" cy="64" r="56"
                                stroke="#C5A059" strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={351}
                                strokeDashoffset={351 - (351 * progressPercent) / 100}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-stone-800">{progressPercent}%</span>
                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                {t("progressPage.completedLabel", "Hoàn thành")}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <h3 className="text-xl font-bold text-stone-700">
                            {t("progressPage.overviewTitle", "Tổng quan kết quả")}
                        </h3>
                        <p className="text-stone-500 text-sm">
                            {t("progressPage.overviewDescPrefix", "Bạn đã hoàn thành")}{" "}
                            <strong>{completedLessonsCount}</strong>{" "}
                            {t("progressPage.overviewDescMiddle", "trên tổng số")}{" "}
                            <strong>{totalLessonsCount}</strong>{" "}
                            {t("progressPage.overviewDescSuffix", "bài học của khóa học. Hãy tiếp tục cố gắng!")}
                        </p>
                    </div>
                </div>

                {/* DETAILS LIST */}
                <ProgressDetailsList
                    chapters={chapters}
                    lessonProgress={lessonProgressObj}
                />
            </div>
        </div>
    );
}
