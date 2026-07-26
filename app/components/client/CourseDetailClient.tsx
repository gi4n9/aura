"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock, Users, PlayCircle, CheckCircle2 } from "lucide-react";
import CourseDescription from "@/app/components/courseComponents/CourseDescription";
import CourseActionButtons from "@/app/components/courseComponents/CourseActionButtons";
import CourseSyllabusList from "@/app/components/courseComponents/CourseSyllabusList";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

interface CourseDetailClientProps {
    course: any;
    isEnrolled: boolean;
    progressPercent: number;
    totalCourseDurationSeconds: number;
    firstLesson: any;
    lessonCompletionObj: { [key: string]: boolean };
    videoProgressObj: { [key: string]: number };
    quizPassObj: { [key: string]: boolean };
}

export default function CourseDetailClient({
    course,
    isEnrolled,
    progressPercent,
    totalCourseDurationSeconds,
    firstLesson,
    lessonCompletionObj,
    videoProgressObj,
    quizPassObj,
}: CourseDetailClientProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen pb-20 transition-colors duration-500 ${
            isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
        }`}>

            {/* Hero Section */}
            <div className={`border-b pb-24 pt-20 ${
                isDark ? "bg-[#0e0e0e]/80 border-white/10" : "bg-white border-stone-200"
            }`}>
                <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <div className="lg:col-span-7">
                        {/* Title & Desc */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 text-[#C5A059] text-xs font-bold tracking-widest uppercase rounded-full mb-6 liquid-glass">
                            {course.organization?.name || t("courseDetail.proCourse", "Khóa học chuyên nghiệp")}
                        </div>
                        <h1 className={`font-serif text-4xl md:text-6xl mb-6 leading-tight ${
                            isDark ? "text-white" : "text-stone-900"
                        }`}>
                            {course.title}
                        </h1>
                        <CourseDescription description={course.description || "Khóa học chuyên sâu giúp bạn làm chủ kiến thức từ cơ bản đến nâng cao."} />

                        {/* Author Metadata */}
                        <div className="flex items-center gap-6 pt-6 border-t border-stone-100">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-stone-200">
                                    <Image
                                        src={course.instructor?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                        alt="Instructor" fill className="object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                        {t("courseDetail.instructor", "Giảng viên")}
                                    </div>
                                    <div className="font-serif text-base font-medium">{course.instructor?.fullName}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Card */}
                    <div className="lg:col-span-5 sticky top-24">
                        <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-xl">
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-stone-900 mb-4 group cursor-pointer">
                                <Image
                                    src={course.thumbnailUrl || "/placeholder-course.jpg"}
                                    alt="Thumbnail" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                                />
                                {firstLesson && (
                                    <Link
                                        href={`/courses/${course.id}/lessons/${firstLesson.id}`}
                                        className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-[#C5A059] rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                            <PlayCircle size={32} className="text-white fill-white" />
                                        </div>
                                    </Link>
                                )}
                            </div>

                            <div className="px-4 pb-4">
                                {isEnrolled ? (
                                    <div className="text-center py-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-stone-500 font-bold text-xs uppercase flex items-center gap-1">
                                                <Clock size={14} />
                                                {totalCourseDurationSeconds > 0 ? Math.floor(totalCourseDurationSeconds / 60) + " phút" : "N/A"}
                                            </span>
                                            <span className="text-stone-800 font-bold text-sm">
                                                {t("courseDetail.studied", "Đã học")} {progressPercent}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-6">
                                            <div
                                                className="h-full bg-[#C5A059]"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>

                                        {firstLesson ? (
                                            <Link
                                                href={`/courses/${course.id}/lessons/${firstLesson.id}`}
                                                className="block w-full py-4 bg-[#1a1a1a] text-white text-center font-bold tracking-widest uppercase text-sm rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg"
                                            >
                                                {t("courseDetail.continueLearning", "Tiếp tục học")}
                                            </Link>
                                        ) : null}
                                    </div>
                                ) : (
                                    <CourseActionButtons
                                        courseId={course.id}
                                        price={Number(course.price)}
                                        isFree={!!course.isFree}
                                        firstLessonId={firstLesson?.id}
                                    />
                                )}
                                <p className="text-center text-xs text-stone-400 mt-3 font-serif italic">
                                    {t("courseDetail.lifetimeAccess", "Truy cập trọn đời • Hoàn tiền trong 30 ngày")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Syllabus */}
            <div className="container mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8">
                    <div className="mb-8 flex items-end gap-4">
                        <h2 className="font-serif text-3xl text-stone-900">
                            {t("courseDetail.courseContent", "Nội dung khóa học")}
                        </h2>
                        <div className="flex-1 h-[1px] bg-stone-200 mb-2"></div>
                    </div>

                    <CourseSyllabusList
                        courseId={course.id}
                        chapters={course.chapters as any}
                        lessonCompletionMap={lessonCompletionObj}
                        videoProgressMap={videoProgressObj}
                        quizPassMap={quizPassObj}
                        isEnrolled={isEnrolled}
                    />
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-6 rounded-xl border border-stone-200">
                        <h3 className="font-serif text-lg font-bold mb-4">
                            {t("courseDetail.includesTitle", "Khóa học này bao gồm:")}
                        </h3>
                        <ul className="space-y-4 text-sm text-stone-600">
                            <li className="flex items-center gap-3">
                                <Clock size={18} className="text-[#C5A059]" />
                                <span>
                                    {t("courseDetail.duration", "Thời lượng")} {totalCourseDurationSeconds > 0 ? Math.floor(totalCourseDurationSeconds / 60) + " phút" : "N/A"}
                                </span>
                            </li>
                            <li className="flex items-center gap-3">
                                <BookOpen size={18} className="text-[#C5A059]" />
                                <span>{course.chapters.length} {t("courseDetail.chaptersCount", "chương chuyên sâu")}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <PlayCircle size={18} className="text-[#C5A059]" />
                                <span>{t("courseDetail.fullHdVideo", "Video chất lượng Full HD")}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-[#C5A059]" />
                                <span>{t("courseDetail.mobileTvAccess", "Truy cập trên Mobile và TV")}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Users size={18} className="text-[#C5A059]" />
                                <span>{t("courseDetail.privateCommunity", "Cộng đồng học tập riêng")}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
