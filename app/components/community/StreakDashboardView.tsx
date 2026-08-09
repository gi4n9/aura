"use client";

import React from "react";
import { Flame, Trophy, Calendar, CheckCircle2, Zap, Sparkles, BookOpen } from "lucide-react";

interface StreakDashboardViewProps {
    currentStreak: number;
    longestStreak: number;
    totalXp: number;
    lastStudyDate?: Date | string | null;
    isDark?: boolean;
}

export default function StreakDashboardView({
    currentStreak,
    longestStreak,
    totalXp,
    lastStudyDate,
    isDark = true
}: StreakDashboardViewProps) {
    const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

    // Calculate current day index (0 = Mon, 6 = Sun)
    const today = new Date();
    let currentDayIdx = today.getDay() - 1; // 0 = Mon
    if (currentDayIdx === -1) currentDayIdx = 6; // Sunday = 6

    const isStudiedToday = lastStudyDate ? (
        new Date(lastStudyDate).toDateString() === today.toDateString()
    ) : false;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className={`p-8 rounded-3xl border transition-all relative overflow-hidden ${
                isDark ? "bg-[#0e0e0e] border-white/10 text-white shadow-2xl" : "bg-white border-stone-200 text-stone-900 shadow-md"
            }`}>
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shadow-lg flex-shrink-0 animate-pulse">
                            <Flame size={36} fill="currentColor" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-serif font-bold">Chuỗi Ngày Học (Streak)</h2>
                                {isStudiedToday && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Đã điểm danh hôm nay
                                    </span>
                                )}
                            </div>
                            <p className={`text-xs mt-1 max-w-lg ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                Học ít nhất 1 bài học mỗi ngày để duy trì ngọn lửa tri thức và nhận điểm XP thưởng cực lớn!
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center">
                            <span className="text-2xl font-bold font-serif block">{currentStreak}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Ngày liên tục</span>
                        </div>
                        <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-stone-300 text-center">
                            <span className="text-2xl font-bold font-serif block">{longestStreak}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Kỷ lục dài nhất</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 7-DAY WEEKLY TRACKER */}
            <div className={`p-6 rounded-3xl border transition-all ${
                isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
            }`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                        <Calendar className="text-[#C5A059]" size={20} />
                        Tiến độ Điểm danh Tuần này
                    </h3>
                    <span className="text-xs text-[#C5A059] font-bold flex items-center gap-1">
                        <Zap size={14} /> +50 XP/ngày streak
                    </span>
                </div>

                <div className="grid grid-cols-7 gap-2 sm:gap-4">
                    {daysOfWeek.map((dayName, idx) => {
                        const isPast = idx < currentDayIdx;
                        const isToday = idx === currentDayIdx;

                        // Simplified checkmark logic for demo representation
                        const isCompleted = (isPast && currentStreak >= (currentDayIdx - idx)) || (isToday && isStudiedToday);

                        return (
                            <div
                                key={dayName}
                                className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                                    isCompleted
                                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10"
                                        : isToday
                                        ? "bg-[#C5A059]/10 border-[#C5A059] text-white ring-2 ring-[#C5A059]/40"
                                        : isDark ? "bg-white/5 border-white/10 text-stone-500" : "bg-stone-50 border-stone-200 text-stone-400"
                                }`}
                            >
                                <span className="text-[10px] font-bold uppercase tracking-wider mb-2">{dayName}</span>
                                {isCompleted ? (
                                    <Flame size={24} fill="currentColor" className="text-amber-500 animate-bounce" />
                                ) : isToday ? (
                                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#C5A059] flex items-center justify-center text-[10px] font-bold text-[#C5A059]">
                                        Hôm nay
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border border-stone-700 flex items-center justify-center text-[10px]">
                                        -
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* TIPS & REWARDS INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-6 rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200"}`}>
                    <h4 className="font-bold text-sm text-[#C5A059] flex items-center gap-2 mb-2">
                        <Sparkles size={18} /> Cách duy trì Streak
                    </h4>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                        Chỉ cần hoàn thành xem 90% video bài giảng hoặc nộp bài tập quiz bất kỳ trong ngày, ngọn lửa Streak của bạn sẽ tự động thắp sáng và tính +1 ngày!
                    </p>
                </div>

                <div className={`p-6 rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200"}`}>
                    <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2 mb-2">
                        <BookOpen size={18} /> Thưởng XP & Thăng Cấp
                    </h4>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                        Mỗi bài học hoàn thành đem lại +100 XP. Hãy tích lũy điểm XP để mở khóa Khung Avatar Hoàng Gia và nâng thứ hạng trên Bảng Xếp Hạng Toàn Mạng Lưới!
                    </p>
                </div>
            </div>
        </div>
    );
}
