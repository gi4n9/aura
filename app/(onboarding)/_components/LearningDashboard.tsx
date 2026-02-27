"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
    BookOpen, Map, Calendar, PlayCircle, Trophy,
    ArrowRight, CheckCircle, Clock, User, FileText,
    Sparkles, TrendingUp, Target, Flame
} from "lucide-react";

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
    const progress = Math.round((completedItems / (totalItems || 1)) * 100);
    const weeklyHours = Math.round(weeklyCompletedLessons * 0.25 * 10) / 10; // estimate ~15min per lesson

    return (
        <div className="pt-[80px] pb-12 space-y-8">
            {/* WELCOME HEADER */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-1">
                        Welcome back, <span className="text-[#C5A059]">{userName}</span> 👋
                    </h1>
                    <p className="text-stone-500 text-lg">
                        Lộ trình: <span className="font-bold text-stone-700">{roadmapTitle}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                        <Trophy size={18} className="text-[#C5A059]" />
                        <span className="text-lg font-bold text-stone-800">{totalCups}</span>
                        <span className="text-xs text-stone-500 font-medium">Cups</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-sm">
                        <Flame size={18} className="text-orange-500" />
                        <span className="text-lg font-bold text-stone-800">{weeklyCompletedLessons}</span>
                        <span className="text-xs text-stone-500 font-medium">tuần này</span>
                    </div>
                </div>
            </motion.div>

            {/* FIRST ROW: Resume Card + Weekly Stats + Study Plan Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Resume Learning Card (Main CTA) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2 bg-gradient-to-br from-[#1a1a1a] to-stone-800 rounded-2xl p-8 text-white relative overflow-hidden"
                >
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-bold text-[#C5A059] mb-4 backdrop-blur-sm">
                            <PlayCircle size={14} /> TIẾP TỤC HỌC
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">
                            {nextLesson?.title || "Bắt đầu bài học đầu tiên"}
                        </h2>
                        <p className="text-stone-400 mb-6 text-sm">
                            {nextLesson?.courseTitle || "Chưa có khóa học nào bắt đầu"}
                        </p>
                        <Link
                            href={nextLesson ? `/courses/${nextLesson.courseId}/lessons/${nextLesson.id}` : "/onboarding/study-plan"}
                            className="inline-flex items-center gap-2 bg-[#C5A059] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#b08d4b] transition shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {nextLesson ? "Học ngay" : "Xem kế hoạch"} <ArrowRight size={20} />
                        </Link>
                    </div>
                    {/* Decorative */}
                    <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#C5A059]/15 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
                </motion.div>

                {/* Weekly Stats Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between shadow-sm"
                >
                    <div>
                        <h3 className="font-bold text-stone-800 mb-1 flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#C5A059]" />
                            Thời gian học tuần này
                        </h3>
                        <p className="text-xs text-stone-400 mb-6">Tổng hợp từ thứ 2 đến nay</p>
                    </div>
                    <div className="text-center py-4">
                        <div className="text-5xl font-bold text-stone-900 mb-1">{weeklyHours}<span className="text-lg font-medium text-stone-400">h</span></div>
                        <p className="text-sm text-stone-500">{weeklyCompletedLessons} bài học hoàn thành</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-auto">
                        {["T2", "T4", "T6"].map((d, i) => (
                            <div key={d} className={`text-center py-2 rounded-lg text-xs font-bold ${i < weeklyCompletedLessons ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'bg-stone-50 text-stone-300'}`}>
                                {d}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* SECOND ROW: Study Plan Progress + Cups + Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Study Plan Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <Target size={18} className="text-[#C5A059]" />
                            Tiến độ Study Plan
                        </h3>
                        <Link href="/onboarding/study-plan" className="text-xs font-bold text-[#C5A059] hover:underline">
                            Tiếp tục học →
                        </Link>
                    </div>

                    <div className="flex items-end gap-6 mb-4">
                        <div>
                            <div className="text-4xl font-bold text-stone-900">{progress}<span className="text-lg text-stone-400">%</span></div>
                            <p className="text-xs text-stone-500 mt-1">{completedItems}/{totalItems} bài hoàn thành</p>
                        </div>
                        <div className="flex-1">
                            <div className="w-full h-4 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#C5A059] to-[#E6C985] rounded-full transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cup milestones */}
                    <div className="flex items-center gap-2 text-sm">
                        <Trophy size={16} className="text-[#C5A059]" />
                        <span className="font-bold text-stone-700">{totalCups} cups</span>
                        <span className="text-stone-400">tích lũy (mỗi bài = 3 cups)</span>
                    </div>
                </motion.div>

                {/* Quick Nav: Roadmap */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Link href="/onboarding/roadmap" className="block bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-[#C5A059] hover:shadow-md transition-all h-full group">
                        <div className="w-12 h-12 bg-amber-50 text-[#C5A059] rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Map size={24} />
                        </div>
                        <h4 className="font-bold text-stone-800 mb-1">Roadmap</h4>
                        <p className="text-xs text-stone-500">Lộ trình {roadmapTitle}</p>
                        <p className="text-xs text-stone-400 mt-2">~{totalHours}h tổng thời gian</p>
                    </Link>
                </motion.div>

                {/* Quick Nav: Calendar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Link href="/onboarding/study-plan" className="block bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-[#C5A059] hover:shadow-md transition-all h-full group">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Calendar size={24} />
                        </div>
                        <h4 className="font-bold text-stone-800 mb-1">Lịch học</h4>
                        <p className="text-xs text-stone-500">Kế hoạch hàng tuần</p>
                        <p className="text-xs text-stone-400 mt-2">{totalItems} buổi tổng</p>
                    </Link>
                </motion.div>
            </div>

            {/* THIRD ROW: My Courses + Learning Profile + Practice */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* My Courses Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <BookOpen size={18} className="text-[#C5A059]" />
                            Khóa học của tôi
                        </h3>
                        <Link href="/onboarding/my-courses" className="text-xs font-bold text-[#C5A059] hover:underline flex items-center gap-1">
                            Xem tất cả ({totalCoursesCount}) <ArrowRight size={14} />
                        </Link>
                    </div>

                    {courses.length === 0 ? (
                        <div className="text-center py-8 text-stone-400">
                            <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Chưa có khóa học nào</p>
                            <Link href="/categories" className="text-sm text-[#C5A059] font-bold mt-2 inline-block hover:underline">
                                Khám phá ngay →
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {courses.map(course => (
                                <Link key={course.id} href={`/courses/${course.id}`} className="flex gap-4 p-3 rounded-xl hover:bg-stone-50 transition-colors group">
                                    {/* Thumbnail */}
                                    <div className="w-20 h-14 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 relative">
                                        {course.thumbnailUrl ? (
                                            <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-300"><BookOpen size={20} /></div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-stone-800 line-clamp-1 group-hover:text-[#C5A059] transition-colors">{course.title}</h4>
                                        <p className="text-xs text-stone-400 mb-2">{course.instructorName}</p>
                                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#C5A059] rounded-full" style={{ width: `${course.progress}%` }} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Right Column: Learning Profile + Test Practice */}
                <div className="space-y-6">
                    {/* Learning Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Link href="/onboarding/profile" className="block bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-[#C5A059] hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-800">Learning Profile</h4>
                                    <p className="text-xs text-stone-400">Hồ sơ học tập của bạn</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {interests.slice(0, 3).map(interest => (
                                    <span key={interest} className="px-2 py-1 bg-stone-50 text-stone-600 text-xs font-medium rounded-lg border border-stone-100">
                                        {interest}
                                    </span>
                                ))}
                                {interests.length > 3 && (
                                    <span className="px-2 py-1 text-stone-400 text-xs font-medium">+{interests.length - 3} khác</span>
                                )}
                            </div>
                        </Link>
                    </motion.div>

                    {/* Test Practice Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <Link href="/onboarding/practice" className="block bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-[#C5A059] hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-800">Test Practice</h4>
                                    <p className="text-xs text-stone-400">Luyện tập kiểm tra</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-stone-500">0 bài kiểm tra đã làm</span>
                                <span className="text-xs font-bold text-[#C5A059] group-hover:translate-x-1 transition-transform inline-block">
                                    Xem tất cả →
                                </span>
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
