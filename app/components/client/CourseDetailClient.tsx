"use client";

import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock, Users, PlayCircle, CheckCircle2, Award, Signal, Globe } from "lucide-react";
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
        <div className={`min-h-screen pt-16 md:pt-20 pb-16 transition-colors duration-500 font-sans ${isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
            }`}>
            <div className="container mx-auto px-6 max-w-7xl space-y-6">

                {/* HERO BANNER SECTION WITH REDUCED COMPACT PADDING */}
                <div className={`relative rounded-3xl overflow-hidden p-8 md:p-12 mb-6 border transition-all shadow-lg backdrop-blur-2xl ${isDark ? "bg-[#0e0e0e]/85 border-white/10 text-white" : "bg-white/90 border-stone-200 text-stone-900"
                    }`}>
                    {/* Background Ambient Radial Glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#C5A059]/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 max-w-3xl space-y-3">
                        <span className="inline-block px-3 py-1 rounded-full border border-[#C5A059]/40 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest bg-[#C5A059]/10 backdrop-blur-md shadow-sm">
                            {course.organization?.name || t("courseDetail.proCourse", "Trí tuệ nhân tạo & AI")}
                        </span>
                        <h1 className={`font-serif text-2xl md:text-4xl font-bold leading-tight ${isDark ? "text-white" : "text-stone-900"
                            }`}>
                            {course.title}
                        </h1>

                        {/* Instructor Badge */}
                        <div className={`inline-flex items-center gap-3 p-2.5 pr-5 rounded-2xl border backdrop-blur-md ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/80 border-stone-200/70"
                            }`}>
                            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[#C5A059] shadow-md shrink-0">
                                <Image
                                    src={course.instructor?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                    alt="Instructor" fill className="object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-[#C5A059] uppercase tracking-wider">
                                    {t("courseDetail.instructor", "Giảng viên")}
                                </p>
                                <p className="font-serif text-xs md:text-sm font-semibold">{course.instructor?.fullName || "TS. Alex Nguyễn"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TWO-COLUMN LAYOUT WITH COMPACT SPACING */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* LEFT COLUMN: OVERVIEW, WHAT YOU LEARN & SYLLABUS */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Course Overview Card */}
                        <div className={`p-6 rounded-3xl border transition-all shadow-sm ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                            }`}>
                            <h2 className={`font-serif text-xl font-bold mb-4 pb-2.5 border-b ${isDark ? "border-white/10 text-white" : "border-stone-200/80 text-stone-900"
                                }`}>
                                {t("courseDetail.overviewTitle", "Tổng quan khóa học")}
                            </h2>
                            <CourseDescription description={course.description || "Khóa học chuyên sâu giúp bạn làm chủ kiến thức từ cơ bản đến nâng cao."} />
                        </div>

                        {/* What You Will Learn Card */}
                        <div className={`p-6 rounded-3xl border transition-all shadow-sm ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                            }`}>
                            <h2 className="font-serif text-xl font-bold mb-4">
                                {t("courseDetail.whatYouLearn", "Bạn sẽ học được gì?")}
                            </h2>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                                {course.whatYouWillLearn && course.whatYouWillLearn.trim() ? (
                                    course.whatYouWillLearn
                                        .split("\n")
                                        .map((item: string) => item.trim())
                                        .filter(Boolean)
                                        .map((item: string, idx: number) => (
                                            <li key={idx} className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${isDark ? "bg-white/5 border-white/10 text-stone-200" : "bg-stone-50/60 border-stone-200/70 text-stone-800"
                                                }`}>
                                                <CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
                                                <span>{item}</span>
                                            </li>
                                        ))
                                ) : (
                                    <>
                                        <li className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                            }`}>
                                            <CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
                                            <span>Hiểu rõ kiến thức chuyên sâu và mô hình thực thi thực tế.</span>
                                        </li>
                                        <li className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                            }`}>
                                            <CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
                                            <span>Kỹ năng thực hành ứng dụng trực tiếp vào dự án.</span>
                                        </li>
                                        <li className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                            }`}>
                                            <CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
                                            <span>Tự động hóa quy trình làm việc và tối ưu hiệu suất.</span>
                                        </li>
                                        <li className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                            }`}>
                                            <CheckCircle2 size={16} className="text-[#C5A059] shrink-0 mt-0.5" />
                                            <span>Làm chủ các công cụ hỗ trợ và tư duy nâng cao.</span>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>

                        {/* Syllabus / Curriculum Card */}
                        <div className={`p-6 rounded-3xl border transition-all shadow-sm ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                            }`}>
                            <h2 className="font-serif text-xl font-bold mb-4">
                                {t("courseDetail.courseContent", "Lộ trình học tập")}
                            </h2>
                            <CourseSyllabusList
                                courseId={course.id}
                                chapters={course.chapters as any}
                                lessonCompletionMap={lessonCompletionObj}
                                videoProgressMap={videoProgressObj}
                                quizPassMap={quizPassObj}
                                isEnrolled={isEnrolled}
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: STICKY SIDEBAR PREVIEW CARD */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                        <div className={`p-5 rounded-3xl border shadow-xl transition-all ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                            }`}>
                            {/* Video Thumbnail Preview */}
                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-stone-900 mb-5 group cursor-pointer border border-white/10 shadow-md">
                                <Image
                                    src={course.thumbnailUrl || "/placeholder-course.jpg"}
                                    alt="Thumbnail" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                                />
                                {firstLesson && (
                                    <Link
                                        href={`/courses/${course.id}/lessons/${firstLesson.id}`}
                                        className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors"
                                    >
                                        <div className="w-13 h-13 bg-[#C5A059] rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                            <PlayCircle size={28} className="text-[#080808] fill-[#080808]" />
                                        </div>
                                    </Link>
                                )}
                                <div className="absolute bottom-2.5 left-2.5 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-white font-mono text-[9px] uppercase tracking-wider font-bold">
                                    Xem trước
                                </div>
                            </div>

                            {/* Sidebar Action Content */}
                            <div className="space-y-4">
                                {isEnrolled ? (
                                    <div className="text-center py-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-stone-400 font-bold text-xs uppercase flex items-center gap-1">
                                                <Clock size={14} />
                                                {totalCourseDurationSeconds > 0 ? Math.floor(totalCourseDurationSeconds / 60) + " phút" : "N/A"}
                                            </span>
                                            <span className="text-[#C5A059] font-bold text-xs uppercase tracking-wider">
                                                {t("courseDetail.studied", "Đã học")} {progressPercent}%
                                            </span>
                                        </div>
                                        <div className={`w-full h-2 rounded-full overflow-hidden mb-4 ${isDark ? "bg-white/10" : "bg-stone-100"
                                            }`}>
                                            <div
                                                className="h-full bg-[#C5A059] rounded-full"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>

                                        {firstLesson && (
                                            <Link
                                                href={`/courses/${course.id}/lessons/${firstLesson.id}`}
                                                className="block w-full py-3.5 bg-[#C5A059] text-[#080808] text-center font-bold tracking-widest uppercase text-xs rounded-2xl hover:bg-[#e9c176] transition-all shadow-lg hover:scale-[1.02]"
                                            >
                                                {t("courseDetail.continueLearning", "Tiếp tục học ngay")}
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <CourseActionButtons
                                        courseId={course.id}
                                        price={Number(course.price)}
                                        isFree={!!course.isFree}
                                        firstLessonId={firstLesson?.id}
                                    />
                                )}

                                {/* Stitch Rounded Metadata Cards List */}
                                <div className={`space-y-2 text-xs pt-4 border-t ${isDark ? "border-white/10 text-stone-300" : "border-stone-200/80 text-stone-600"
                                    }`}>
                                    <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                        }`}>
                                        <span className="flex items-center gap-2">
                                            <Clock size={15} className="text-[#C5A059]" /> Thời lượng:
                                        </span>
                                        <span className={`font-semibold ${isDark ? "text-white" : "text-stone-900"}`}>
                                            {totalCourseDurationSeconds > 0 ? Math.floor(totalCourseDurationSeconds / 60) + " phút" : "N/A"}
                                        </span>
                                    </div>
                                    <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                        }`}>
                                        <span className="flex items-center gap-2">
                                            <Signal size={15} className="text-[#C5A059]" /> Cấp độ:
                                        </span>
                                        <span className={`font-semibold ${isDark ? "text-white" : "text-stone-900"}`}>Mọi cấp độ</span>
                                    </div>
                                    <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                        }`}>
                                        <span className="flex items-center gap-2">
                                            <Globe size={15} className="text-[#C5A059]" /> Ngôn ngữ:
                                        </span>
                                        <span className={`font-semibold ${isDark ? "text-white" : "text-stone-900"}`}>Tiếng Việt</span>
                                    </div>
                                    <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50/60 border-stone-200/70"
                                        }`}>
                                        <span className="flex items-center gap-2">
                                            <Award size={15} className="text-[#C5A059]" /> Chứng chỉ:
                                        </span>
                                        <span className={`font-semibold ${isDark ? "text-white" : "text-stone-900"}`}>Cấp khi hoàn thành</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
