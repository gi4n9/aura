"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Flame, Zap, Award, Crown, Medal, Clock, BookOpen, Star, Info, ShieldCheck, History, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { AVATAR_FRAMES } from "@/lib/gamification";
import UserProfileHoverCard from "@/app/components/community/UserProfileHoverCard";

interface LeaderboardUser {
    rank: number;
    userId: string;
    name: string;
    avatarUrl?: string | null;
    level: number;
    totalXp: number;
    currentStreak: number;
    totalStudyMins: number;
    equippedFrame: string;
    equippedBanner: string;
    equippedTitle: string;
    userSummary?: any;
}

interface LeaderboardViewProps {
    topUsers: LeaderboardUser[];
    top3Users?: LeaderboardUser[];
    currentPage?: number;
    totalPages?: number;
    period?: 'xp' | 'streak' | 'mins';
    currentUserId?: string;
    isDark?: boolean;
}

export default function LeaderboardView({
    topUsers,
    top3Users,
    currentPage = 1,
    totalPages = 1,
    period = 'xp',
    currentUserId,
    isDark = true
}: LeaderboardViewProps) {
    const [subTab, setSubTab] = useState<'weekly' | 'overall' | 'streak' | 'history' | 'honor' | 'cert'>(
        period === 'streak' ? 'streak' : 'weekly'
    );
    
    // Countdown Timer (Mock for week reset)
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 5, minutes: 38, seconds: 44 });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const podiumUsers = top3Users && top3Users.length > 0 ? top3Users : topUsers;
    const top1 = podiumUsers[0];
    const top2 = podiumUsers[1];
    const top3 = podiumUsers[2];

    const currentUserRank = topUsers.find(u => u.userId === currentUserId) || {
        rank: 406,
        totalXp: 118,
        level: 1
    };

    const getFrameStyle = (frameId: string) => {
        const frame = AVATAR_FRAMES.find(f => f.id === frameId);
        return frame ? frame.previewStyle : "border-2 border-stone-400";
    };

    return (
        <div className="space-y-6 text-white font-sans">
            
            {/* 1. HEADER SECTION (TITLE LEFT, COUNTDOWN CARD RIGHT) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-serif font-extrabold flex items-center gap-3 text-white">
                        <Trophy className="text-[#C5A059] shrink-0" size={32} />
                        Bảng xếp hạng
                    </h1>
                    <p className="text-stone-400 text-sm mt-1.5">
                        Cạnh tranh với người học trên khắp Việt Nam và theo dõi tiến độ của bạn
                    </p>
                </div>

                {/* COUNTDOWN TIMER CARD */}
                <div className="bg-[#14120e]/90 border border-[#C5A059]/40 rounded-2xl p-4 sm:px-6 flex flex-col items-center justify-center text-center shadow-xl shadow-[#C5A059]/5 min-w-[320px]">
                    <div className="flex items-center gap-1.5 text-xs text-[#C5A059] font-medium mb-1">
                        <Clock size={14} />
                        <span>Tuần sắp kết thúc!</span>
                    </div>
                    <div className="flex items-center gap-2 text-xl font-mono font-extrabold text-white my-1">
                        <span>{String(timeLeft.days).padStart(2, '0')}</span>
                        <span className="text-[10px] text-stone-400 font-sans uppercase">NGÀY</span>
                        <span className="text-[#C5A059]">:</span>
                        <span>{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="text-[10px] text-stone-400 font-sans uppercase">GIỜ</span>
                        <span className="text-[#C5A059]">:</span>
                        <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="text-[10px] text-stone-400 font-sans uppercase">PHÚT</span>
                        <span className="text-[#C5A059]">:</span>
                        <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
                        <span className="text-[10px] text-stone-400 font-sans uppercase">GIÂY</span>
                    </div>
                    <p className="text-[11px] text-amber-300/80 mt-1 flex items-center gap-1 font-medium">
                        ⚡ Kiếm XP ngay để bảo vệ thứ hạng!
                    </p>
                </div>
            </div>

            {/* 2. STAT SUMMARY CARDS ROW (4 STAT CARDS) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 space-y-1">
                    <span className="text-xs text-stone-400 font-medium">Hạng hiện tại</span>
                    <div className="flex items-center gap-2">
                        <Trophy className="text-[#C5A059]" size={20} />
                        <span className="text-xl font-extrabold text-white">#{currentUserRank.rank}</span>
                    </div>
                </div>

                <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 space-y-1">
                    <span className="text-xs text-stone-400 font-medium">Hạng tốt nhất</span>
                    <div className="flex items-center gap-2">
                        <Star className="text-amber-400" size={20} fill="currentColor" />
                        <span className="text-xl font-extrabold text-white">#49</span>
                    </div>
                </div>

                <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 space-y-1">
                    <span className="text-xs text-stone-400 font-medium">Số tuần tham gia</span>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-emerald-400" size={20} />
                        <span className="text-xl font-extrabold text-white">6</span>
                    </div>
                </div>

                <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 space-y-1">
                    <span className="text-xs text-stone-400 font-medium">Phần thưởng nhận được</span>
                    <div className="flex items-center gap-2">
                        <Gift className="text-purple-400" size={20} />
                        <span className="text-xl font-extrabold text-white">6</span>
                    </div>
                </div>
            </div>

            {/* 3. CURRENT POSITION NOTICE BANNER */}
            <div className="bg-[#0f172a]/90 border border-sky-500/30 rounded-2xl p-3.5 px-5 flex items-center justify-between text-xs text-sky-200">
                <div className="flex items-center gap-2">
                    <Info size={16} className="text-sky-400 shrink-0" />
                    <span>
                        <strong className="text-white">Vị trí hiện tại của bạn:</strong> Hạng: <strong className="text-sky-300">#{currentUserRank.rank}</strong> &nbsp;|&nbsp; XP: <strong className="text-sky-300">{currentUserRank.totalXp}</strong> &nbsp;|&nbsp; Phần trăm: <strong className="text-sky-300">98.5%</strong> &nbsp;—&nbsp; <span className="text-stone-400">Không đổi</span>
                    </span>
                </div>
            </div>

            {/* 4. SUB-TABS NAVIGATION BAR */}
            <div className="bg-[#121212] border border-white/10 rounded-2xl p-1.5 flex flex-wrap gap-1 text-xs font-semibold overflow-x-auto">
                <Link
                    href="/community?tab=leaderboard&lpage=1&period=xp"
                    onClick={() => setSubTab('weekly')}
                    className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTab === 'weekly' ? "bg-[#C5A059] text-[#080808] font-bold" : "text-stone-400 hover:text-white"
                    }`}
                >
                    🔥 Tuần này
                </Link>
                <Link
                    href="/community?tab=leaderboard&lpage=1&period=xp"
                    onClick={() => setSubTab('overall')}
                    className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTab === 'overall' ? "bg-[#C5A059] text-[#080808] font-bold" : "text-stone-400 hover:text-white"
                    }`}
                >
                    ⭐ Tổng thể
                </Link>
                <Link
                    href="/community?tab=leaderboard&lpage=1&period=streak"
                    onClick={() => setSubTab('streak')}
                    className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTab === 'streak' ? "bg-[#C5A059] text-[#080808] font-bold" : "text-stone-400 hover:text-white"
                    }`}
                >
                    🔥 Chuỗi học
                </Link>
                <button
                    onClick={() => setSubTab('history')}
                    className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTab === 'history' ? "bg-[#C5A059] text-[#080808] font-bold" : "text-stone-400 hover:text-white"
                    }`}
                >
                    📜 Lịch sử
                </button>
                <button
                    onClick={() => setSubTab('honor')}
                    className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTab === 'honor' ? "bg-[#C5A059] text-[#080808] font-bold" : "text-stone-400 hover:text-white"
                    }`}
                >
                    🎖️ Vinh Danh
                </button>
                <button
                    onClick={() => setSubTab('cert')}
                    className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        subTab === 'cert' ? "bg-[#C5A059] text-[#080808] font-bold" : "text-stone-400 hover:text-white"
                    }`}
                >
                    📜 Chứng chỉ
                </button>
            </div>

            {/* 5. MAIN CONTAINER: PODIUM TOP 3 & DETAILED TABLE */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 space-y-8 shadow-2xl">
                
                {/* PODIUM TOP 3 SECTION */}
                {topUsers.length > 0 && (
                    <div className="relative pt-8 pb-4 flex flex-col items-center">
                        <div className="grid grid-cols-3 gap-4 sm:gap-8 items-end max-w-2xl w-full">
                            
                            {/* RANK #2 (LEFT - SILVER) */}
                            {top2 && (
                                <UserProfileHoverCard userId={top2.userId} isDark={isDark} initialSummary={top2.userSummary}>
                                    <div className="flex flex-col items-center text-center cursor-pointer group">
                                        <div className="relative mb-2">
                                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center relative border-2 border-slate-300 shadow-xl group-hover:scale-105 transition-all ${getFrameStyle(top2.equippedFrame)}`}>
                                                {top2.avatarUrl ? (
                                                    <Image src={top2.avatarUrl} alt={top2.name} fill className="rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xl">
                                                        {top2.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                                                🥈
                                            </span>
                                        </div>
                                        
                                        <h4 className="font-bold text-sm text-stone-200 group-hover:text-[#C5A059] transition-all flex items-center gap-1">
                                            {top2.name}
                                        </h4>
                                        <span className="text-[11px] text-amber-400 font-semibold mt-0.5">
                                            ⭐ {top2.totalXp.toLocaleString()} XP
                                        </span>

                                        <div className="text-[10px] text-stone-400 space-y-0.5 mt-1">
                                            <div className="flex items-center justify-center gap-1"><Clock size={10} /> {Math.floor(top2.totalStudyMins / 60)}h {top2.totalStudyMins % 60}m</div>
                                            <div className="flex items-center justify-center gap-1"><BookOpen size={10} /> 63 lessons</div>
                                        </div>

                                        {/* PODIUM STEP #2 */}
                                        <div className="w-full h-24 bg-gradient-to-b from-stone-700 to-stone-800 rounded-t-2xl mt-3 flex items-center justify-center font-black text-2xl text-stone-400 shadow-inner">
                                            #2
                                        </div>
                                    </div>
                                </UserProfileHoverCard>
                            )}

                            {/* RANK #1 (CENTER - GOLD WITH CROWN & GLOW AURA) */}
                            {top1 && (
                                <UserProfileHoverCard userId={top1.userId} isDark={isDark} initialSummary={top1.userSummary}>
                                    <div className="flex flex-col items-center text-center cursor-pointer group relative -top-4">
                                        <div className="relative mb-2">
                                            {/* Crown Icon */}
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400 animate-pulse">
                                                <Crown size={28} fill="currentColor" />
                                            </div>
                                            {/* Glowing Aura Ring */}
                                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center relative border-4 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] group-hover:scale-105 transition-all ${getFrameStyle(top1.equippedFrame)}`}>
                                                {top1.avatarUrl ? (
                                                    <Image src={top1.avatarUrl} alt={top1.name} fill className="rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-amber-900 text-amber-200 flex items-center justify-center font-bold text-2xl">
                                                        {top1.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shadow-lg">
                                                🥇
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-base text-white group-hover:text-amber-400 transition-all flex items-center gap-1">
                                            {top1.name} <span className="text-sky-400 text-xs">✔</span>
                                        </h4>
                                        <span className="text-xs text-amber-300 font-extrabold mt-0.5">
                                            ⭐ {top1.totalXp.toLocaleString()} XP
                                        </span>

                                        <div className="text-[10px] text-stone-300 space-y-0.5 mt-1">
                                            <div className="flex items-center justify-center gap-1"><Clock size={10} /> 20h 9m</div>
                                            <div className="flex items-center justify-center gap-1"><BookOpen size={10} /> 60 lessons</div>
                                        </div>

                                        {/* PODIUM STEP #1 */}
                                        <div className="w-full h-32 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 rounded-t-2xl mt-3 flex items-center justify-center font-black text-4xl text-amber-950 shadow-2xl">
                                            #1
                                        </div>
                                    </div>
                                </UserProfileHoverCard>
                            )}

                            {/* RANK #3 (RIGHT - BRONZE) */}
                            {top3 && (
                                <UserProfileHoverCard userId={top3.userId} isDark={isDark} initialSummary={top3.userSummary}>
                                    <div className="flex flex-col items-center text-center cursor-pointer group">
                                        <div className="relative mb-2">
                                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center relative border-2 border-amber-700 shadow-xl group-hover:scale-105 transition-all ${getFrameStyle(top3.equippedFrame)}`}>
                                                {top3.avatarUrl ? (
                                                    <Image src={top3.avatarUrl} alt={top3.name} fill className="rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-amber-950 text-amber-200 flex items-center justify-center font-bold text-xl">
                                                        {top3.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                                                🥉
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-sm text-stone-200 group-hover:text-[#C5A059] transition-all flex items-center gap-1">
                                            {top3.name}
                                        </h4>
                                        <span className="text-[11px] text-amber-400 font-semibold mt-0.5">
                                            ⭐ {top3.totalXp.toLocaleString()} XP
                                        </span>

                                        <div className="text-[10px] text-stone-400 space-y-0.5 mt-1">
                                            <div className="flex items-center justify-center gap-1"><Clock size={10} /> 25h 46m</div>
                                            <div className="flex items-center justify-center gap-1"><BookOpen size={10} /> 59 lessons</div>
                                        </div>

                                        {/* PODIUM STEP #3 */}
                                        <div className="w-full h-20 bg-gradient-to-b from-amber-800 to-amber-900 rounded-t-2xl mt-3 flex items-center justify-center font-black text-2xl text-amber-400 shadow-inner">
                                            #3
                                        </div>
                                    </div>
                                </UserProfileHoverCard>
                            )}

                        </div>
                    </div>
                )}

                {/* DETAILED RANKING TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-stone-300">
                        <thead>
                            <tr className="border-b border-white/10 text-stone-400 uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-3 px-4">Hạng</th>
                                <th className="py-3 px-4">Người dùng</th>
                                <th className="py-3 px-4 text-center">Cấp độ</th>
                                <th className="py-3 px-4 text-right">XP kiếm được</th>
                                <th className="py-3 px-4 text-right">Thời gian học</th>
                                <th className="py-3 px-4 text-right">Bài học</th>
                                <th className="py-3 px-4 text-center">Thay đổi hạng %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-medium">
                            {topUsers.map((user, idx) => {
                                const isSelf = user.userId === currentUserId;

                                return (
                                    <tr key={user.userId} className={`transition-all ${isSelf ? "bg-[#C5A059]/10" : "hover:bg-white/5"}`}>
                                        <td className="py-3.5 px-4 font-bold">
                                            {user.rank === 1 && <span className="text-amber-400 font-extrabold text-sm">🥇 #1</span>}
                                            {user.rank === 2 && <span className="text-slate-300 font-extrabold text-sm">🥈 #2</span>}
                                            {user.rank === 3 && <span className="text-amber-600 font-extrabold text-sm">🥉 #3</span>}
                                            {user.rank > 3 && <span className="text-stone-400">#{user.rank}</span>}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <UserProfileHoverCard userId={user.userId} isDark={isDark} initialSummary={user.userSummary}>
                                                <div className="flex items-center gap-3 cursor-pointer group">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center relative flex-shrink-0 ${getFrameStyle(user.equippedFrame)}`}>
                                                        {user.avatarUrl ? (
                                                            <Image src={user.avatarUrl} alt={user.name} fill className="rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full rounded-full bg-stone-800 text-stone-300 flex items-center justify-center font-bold text-xs">
                                                                {user.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-white group-hover:text-[#C5A059] transition-all">
                                                                {user.name}
                                                            </span>
                                                            {isSelf && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#C5A059] text-[#080808]">
                                                                    BẠN
                                                                </span>
                                                            )}
                                                        </div>
                                                        {user.equippedTitle && (
                                                            <span className="text-[10px] text-stone-400 block">{user.equippedTitle}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </UserProfileHoverCard>
                                        </td>

                                        <td className="py-3.5 px-4 text-center">
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-stone-200 text-[11px] font-bold">
                                                Lv. {user.level}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                                            {user.totalXp.toLocaleString()} XP
                                        </td>

                                        <td className="py-3.5 px-4 text-right text-stone-400">
                                            {Math.floor((user.totalStudyMins || 120) / 60)}h {(user.totalStudyMins || 120) % 60}m
                                        </td>

                                        <td className="py-3.5 px-4 text-right text-stone-300 font-bold">
                                            {60 - idx * 2} bài
                                        </td>

                                        <td className="py-3.5 px-4 text-center">
                                            <span className="text-emerald-400 font-bold text-[11px]">
                                                +{Math.max(1, 10 - idx)}% 🟢
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                        <span>Trang {currentPage} / {totalPages}</span>
                        <div className="flex gap-2 items-center">
                            {currentPage > 1 && (
                                <Link
                                    href={`/community?tab=leaderboard&lpage=${currentPage - 1}&period=${period}`}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                                        isDark ? "border-white/10 hover:bg-white/5 text-stone-300" : "border-stone-200 hover:bg-stone-50 text-stone-700"
                                    }`}
                                >
                                    <ChevronLeft size={16} />
                                </Link>
                            )}

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                                        acc.push('...');
                                    }
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) => {
                                    if (p === '...') {
                                        return <span key={`dots-${idx}`} className="px-1 text-stone-500">...</span>;
                                    }
                                    const isCurrent = p === currentPage;
                                    return (
                                        <Link
                                            key={p}
                                            href={`/community?tab=leaderboard&lpage=${p}&period=${period}`}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                                                isCurrent
                                                    ? "border-[#C5A059] bg-[#C5A059] text-[#080808] font-bold"
                                                    : isDark
                                                    ? "border-white/10 hover:bg-white/5 text-stone-300"
                                                    : "border-stone-200 hover:bg-stone-50 text-stone-700"
                                            }`}
                                        >
                                            {p}
                                        </Link>
                                    );
                                })}

                            {currentPage < totalPages && (
                                <Link
                                    href={`/community?tab=leaderboard&lpage=${currentPage + 1}&period=${period}`}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                                        isDark ? "border-white/10 hover:bg-white/5 text-stone-300" : "border-stone-200 hover:bg-stone-50 text-stone-700"
                                    }`}
                                >
                                    <ChevronRight size={16} />
                                </Link>
                            )}
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
}
