"use client";

import React from "react";
import { Sparkles, Flame, Trophy, Award, Zap } from "lucide-react";

interface LevelProgressCardProps {
    level: number;
    currentXp: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progressPercentage: number;
    currentStreak: number;
    longestStreak: number;
    equippedTitle: string;
    isDark?: boolean;
}

export default function LevelProgressCard({
    level,
    currentXp,
    currentLevelXp,
    nextLevelXp,
    progressPercentage,
    currentStreak,
    longestStreak,
    equippedTitle,
    isDark = true
}: LevelProgressCardProps) {
    const xpRemaining = Math.max(0, nextLevelXp - currentXp);

    return (
        <div className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${
            isDark
                ? "bg-[#0e0e0e] border-white/10 text-white shadow-2xl"
                : "bg-white border-stone-200 text-stone-900 shadow-md"
        }`}>
            {/* Background Glow Accent */}
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#C5A059]/10 blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10">
                {/* Level Badge */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#9E7B3B] text-[#080808] flex flex-col items-center justify-center font-bold shadow-lg shadow-[#C5A059]/30 flex-shrink-0">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80 leading-none">Cấp</span>
                        <span className="text-2xl font-serif leading-none mt-0.5">{level}</span>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-lg">Học viên Aura</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30">
                                {equippedTitle || "Tân binh Aura"}
                            </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            Tích lũy XP từ các bài học để nâng cấp & mở khóa phần thưởng
                        </p>
                    </div>
                </div>

                {/* Streak Badge */}
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border ${
                        currentStreak > 0
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                            : isDark ? "bg-white/5 border-white/10 text-stone-400" : "bg-stone-100 border-stone-200 text-stone-500"
                    }`}>
                        <Flame size={20} className={currentStreak > 0 ? "fill-amber-500 animate-bounce" : ""} />
                        <div>
                            <div className="text-xs font-bold leading-tight">{currentStreak} Ngày</div>
                            <div className="text-[9px] uppercase tracking-wider opacity-75">Chuỗi Streak</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-[#C5A059]">
                        <Zap size={14} />
                        <span>{currentXp} XP</span>
                    </span>
                    <span className={isDark ? "text-stone-400" : "text-stone-500"}>
                        Còn {xpRemaining} XP để lên Cấp {level + 1}
                    </span>
                </div>

                <div className={`w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
                    isDark ? "bg-white/5 border-white/10" : "bg-stone-100 border-stone-200"
                }`}>
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#C5A059] via-amber-400 to-amber-500 transition-all duration-1000 shadow-[0_0_12px_rgba(197,160,89,0.5)]"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            </div>

            {/* Stats Footer Grid */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t ${
                isDark ? "border-white/10 text-stone-300" : "border-stone-200 text-stone-700"
            }`}>
                <div className="flex items-center gap-2.5">
                    <Trophy size={16} className="text-[#C5A059]" />
                    <span className="text-xs">Streak kỷ lục: <strong>{longestStreak} ngày</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                    <Award size={16} className="text-emerald-400" />
                    <span className="text-xs">Tiến trình level: <strong>{progressPercentage}%</strong></span>
                </div>
                <div className="flex items-center gap-2.5 col-span-2 sm:col-span-1">
                    <Sparkles size={16} className="text-indigo-400" />
                    <span className="text-xs">Mốc tiếp theo: <strong>Cấp {level + 1}</strong></span>
                </div>
            </div>
        </div>
    );
}
