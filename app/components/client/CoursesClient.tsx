"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

interface CourseItem {
    id: string;
    title: string;
    price: any;
    thumbnailUrl: string | null;
    instructor: {
        fullName: string | null;
        avatarUrl: string | null;
    } | null;
    organization: {
        name: string;
    } | null;
    _count: {
        chapters: number;
    };
}

export default function CoursesClient({ courses }: { courses: CourseItem[] }) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen font-sans selection:bg-[#C5A059] selection:text-white pb-20 transition-colors duration-500 ${
            isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
        }`}>
            {/* Header Section */}
            <div className={`pt-24 pb-12 border-b ${isDark ? "border-white/10" : "border-stone-200"}`}>
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl">
                        <div className="inline-block mb-3 text-xs font-bold tracking-widest text-[#C5A059] uppercase">
                            {t("courses.academicBadge", "Thư viện bài giảng")}
                        </div>
                        <h1 className={`font-serif text-5xl md:text-6xl mb-6 ${isDark ? "text-white" : "text-stone-900"}`}>
                            {t("courses.pageTitle", "Kho Khóa học Aura")}
                        </h1>
                        <div className="w-20 h-1 bg-[#C5A059] mb-6"></div>
                        <p className={`text-xl font-light leading-relaxed ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                            {t("courses.pageSubtitle", "Truy cập toàn bộ danh mục bài giảng, bài tập mô phỏng và lộ trình đào tạo chuyên sâu.")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="container mx-auto px-6 mt-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {courses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className={`group flex flex-col rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 liquid-glass ${
                                isDark ? "text-white hover:shadow-[0_20px_50px_rgba(197,160,89,0.15)]" : "text-stone-900 shadow-md hover:shadow-xl"
                            }`}
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
                                <Image
                                    src={course.thumbnailUrl || "/placeholder-course.jpg"}
                                    alt={course.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105 saturate-75 group-hover:saturate-100"
                                />
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 shadow-sm">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-stone-300">
                                        {course.organization?.name || t("courses.openCourse", "Khóa học mở")}
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex flex-col flex-grow p-6">
                                <h3 className={`font-serif text-xl leading-tight mb-3 group-hover:text-[#C5A059] transition-colors line-clamp-2 ${
                                    isDark ? "text-white" : "text-stone-900"
                                }`}>
                                    {course.title}
                                </h3>

                                <div className="w-8 h-0.5 bg-[#C5A059]/40 mb-4 group-hover:bg-[#C5A059] transition-colors"></div>

                                <div className="mt-auto space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#C5A059]/30">
                                            <Image
                                                src={course.instructor?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                                alt="Avatar"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                                                {t("courses.lecturer", "Giảng viên")}
                                            </span>
                                            <span className={`text-sm font-medium font-serif italic ${isDark ? "text-stone-300" : "text-stone-700"}`}>
                                                {course.instructor?.fullName}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`flex items-center justify-between pt-4 border-t text-xs font-mono ${
                                        isDark ? "border-white/10 text-stone-400" : "border-stone-200 text-stone-500"
                                    }`}>
                                        <div className="flex items-center gap-1.5">
                                            <BookOpen size={14} className="text-[#C5A059]" />
                                            <span>{course._count.chapters} {t("courses.chapters", "chương")}</span>
                                        </div>
                                        <span className={`font-bold ${isDark ? "text-white" : "text-stone-900"}`}>
                                            {Number(course.price) === 0 ? t("courses.free", "Miễn phí") : new Intl.NumberFormat("vi-VN").format(Number(course.price)) + " đ"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
