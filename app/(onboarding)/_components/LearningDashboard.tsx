"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
    BookOpen, Map, Calendar, PlayCircle, Trophy,
    ArrowRight, CheckCircle, Clock
} from "lucide-react";

interface LearningDashboardProps {
    roadmapTitle: string;
    totalHours: number;
    completedItems: number;
    totalItems: number;
    nextLesson: {
        id: string;
        title: string;
        courseTitle: string;
    } | null;
}

export default function LearningDashboard({
    roadmapTitle,
    totalHours,
    completedItems,
    totalItems,
    nextLesson
}: LearningDashboardProps) {
    const progress = Math.round((completedItems / (totalItems || 1)) * 100);

    return (
        <div className="min-h-screen bg-[#F9F8F4] py-12 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-stone-900">
                            Chào mừng trở lại! 👋
                        </h1>
                        <p className="text-stone-500">
                            Bạn đang theo đuổi lộ trình <span className="font-bold text-[#C5A059]">{roadmapTitle}</span>
                        </p>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COLUMN (2 cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Resume Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#1a1a1a] rounded-2xl p-8 text-white relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-[#C5A059] mb-4">
                                    <PlayCircle size={14} /> TIẾP TỤC HỌC
                                </div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {nextLesson?.title || "Bắt đầu bài học đầu tiên"}
                                </h2>
                                <p className="text-stone-400 mb-6 text-sm">
                                    {nextLesson?.courseTitle || "Chưa có khóa học nào bắt đầu"}
                                </p>
                                <Link
                                    href={nextLesson ? `/lesson/${nextLesson.id}` : "/onboarding/study-plan"}
                                    className="inline-flex items-center gap-2 bg-[#C5A059] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#b08d4b] transition shadow-lg"
                                >
                                    {nextLesson ? "Học ngay" : "Xem kế hoạch"} <ArrowRight size={20} />
                                </Link>
                            </div>

                            {/* Decorative Circles */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#C5A059]/20 rounded-full blur-3xl" />
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
                        </motion.div>

                        {/* Recent Progress / Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl border border-stone-200">
                                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle size={20} />
                                </div>
                                <div className="text-3xl font-bold text-stone-900">{completedItems}</div>
                                <div className="text-sm text-stone-500">Bài học hoàn thành</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-stone-200">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                    <Clock size={20} />
                                </div>
                                <div className="text-3xl font-bold text-stone-900">{Math.round(totalHours * progress / 100)}h</div>
                                <div className="text-sm text-stone-500">Giờ học tích lũy</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (1 col) */}
                    <div className="space-y-6">
                        {/* Roadmap Status */}
                        <div className="bg-white p-6 rounded-2xl border border-stone-200">
                            <h3 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
                                <Map size={18} className="text-[#C5A059]" /> Tiến độ lộ trình
                            </h3>

                            <div className="relative pt-4">
                                <div className="flex justify-between text-xs mb-2 font-medium text-stone-500">
                                    <span>Bắt đầu</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#C5A059] to-purple-500 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <Link
                                    href="/onboarding/roadmap"
                                    className="block w-full text-center py-3 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl font-bold transition text-sm"
                                >
                                    Xem chi tiết Roadmap
                                </Link>
                                <Link
                                    href="/onboarding/study-plan"
                                    className="block w-full text-center py-3 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl font-bold transition text-sm"
                                >
                                    Xem Lịch Học
                                </Link>
                            </div>
                        </div>

                        {/* Motivation */}
                        <div className="bg-gradient-to-br from-[#1a1a1a] to-stone-800 p-6 rounded-2xl text-white text-center">
                            <Trophy size={32} className="mx-auto text-[#C5A059] mb-3" />
                            <p className="font-serif italic text-lg opacity-90">
                                "Không quan trọng bạn đi chậm thế nào, miễn là đừng dừng lại."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
