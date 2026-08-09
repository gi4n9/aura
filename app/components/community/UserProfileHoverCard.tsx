"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getUserProfileSummary } from "@/app/actions/gamification-actions";
import { Trophy, Flame, HelpCircle, Users, ExternalLink, Sparkles } from "lucide-react";

interface UserProfileSummaryData {
    user: {
        id: string;
        fullName?: string | null;
        email?: string | null;
        avatarUrl?: string | null;
        createdAt?: Date | string | null;
    };
    stats: {
        level: number;
        totalXp: number;
        currentStreak: number;
        equippedFrame: string;
        equippedBanner: string;
        equippedTitle: string;
    };
    questionsCount: number;
    groupsCount: number;
    bannerStyle: string;
    frameStyle: string;
    titleStyle: string;
    titleName: string;
}

interface UserProfileHoverCardProps {
    userId: string;
    children: React.ReactNode;
    isDark?: boolean;
    initialSummary?: UserProfileSummaryData | null;
}

const summaryCache = new Map<string, UserProfileSummaryData>();

export default function UserProfileHoverCard({
    userId,
    children,
    isDark = true,
    initialSummary = null
}: UserProfileHoverCardProps) {
    if (initialSummary && !summaryCache.has(userId)) {
        summaryCache.set(userId, initialSummary);
    }

    const [isOpen, setIsOpen] = useState(false);
    const [summary, setSummary] = useState<UserProfileSummaryData | null>(
        initialSummary || summaryCache.get(userId) || null
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialSummary) {
            summaryCache.set(userId, initialSummary);
            setSummary(initialSummary);
        }
    }, [initialSummary, userId]);

    const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
    const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (leaveTimerRef.current) {
            clearTimeout(leaveTimerRef.current);
            leaveTimerRef.current = null;
        }

        enterTimerRef.current = setTimeout(async () => {
            setIsOpen(true);
            if (!summary && !summaryCache.has(userId)) {
                setLoading(true);
                const data = await getUserProfileSummary(userId);
                if (data) {
                    const formattedData: UserProfileSummaryData = {
                        user: data.user,
                        stats: data.stats,
                        questionsCount: data.questionsCount,
                        groupsCount: data.groupsCount,
                        bannerStyle: data.bannerStyle,
                        frameStyle: data.frameStyle,
                        titleStyle: data.titleStyle,
                        titleName: data.titleName
                    };
                    summaryCache.set(userId, formattedData);
                    setSummary(formattedData);
                }
                setLoading(false);
            } else if (summaryCache.has(userId) && !summary) {
                setSummary(summaryCache.get(userId)!);
            }
        }, 200);
    };

    const handleMouseLeave = () => {
        if (enterTimerRef.current) {
            clearTimeout(enterTimerRef.current);
            enterTimerRef.current = null;
        }

        leaveTimerRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 250);
    };

    useEffect(() => {
        return () => {
            if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
            if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
        };
    }, []);

    const name = summary?.user.fullName || summary?.user.email?.split('@')[0] || "Học viên Aura";
    const initial = name.charAt(0).toUpperCase();

    const profileUrl = userId ? `/profile?userId=${userId}` : "/profile";

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <Link href={profileUrl} className="inline-block cursor-pointer">
                {children}
            </Link>

            {/* FLOATING HOVER POPOVER CARD */}
            {isOpen && (
                <div
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 rounded-3xl border shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
                    style={{
                        backgroundColor: isDark ? "#121212" : "#ffffff",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "#e7e5e4",
                        color: isDark ? "#ffffff" : "#1c1917"
                    }}
                >
                    {loading && !summary ? (
                        <div className="p-8 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                            <Sparkles size={16} className="animate-spin text-[#C5A059]" />
                            Đang tải hồ sơ...
                        </div>
                    ) : summary ? (
                        <div>
                            {/* Banner Header */}
                            <div className={`h-20 w-full relative transition-all ${summary.bannerStyle}`}>
                                <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-black/50 backdrop-blur-md text-stone-200 border border-white/10">
                                    Thẻ Học Viên
                                </div>
                            </div>

                            {/* Avatar & Basic Info Container */}
                            <div className="p-5 pt-0 relative">
                                {/* Avatar & Level Row */}
                                <div className="flex items-end justify-between -mt-9 mb-3">
                                    {/* Frame & Avatar */}
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center relative shadow-xl shrink-0 ${
                                        isDark ? "bg-[#121212] ring-4 ring-[#121212]" : "bg-white ring-4 ring-white"
                                    } ${summary.frameStyle}`}>
                                        {summary.user.avatarUrl ? (
                                            <Image
                                                src={summary.user.avatarUrl}
                                                alt={name}
                                                fill
                                                className="rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-stone-800 text-[#C5A059] flex items-center justify-center font-bold text-lg font-serif">
                                                {initial}
                                            </div>
                                        )}
                                    </div>

                                    {/* Level badge */}
                                    <div className="mb-1">
                                        <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#C5A059] text-[#080808] shadow-sm">
                                            Cấp {summary.stats.level}
                                        </span>
                                    </div>
                                </div>

                                {/* Name & Title - Placed cleanly on card body background */}
                                <div className="mb-3">
                                    <h4 className={`font-serif font-extrabold text-lg leading-snug truncate ${
                                        isDark ? "text-white" : "text-stone-900"
                                    }`}>
                                        {name}
                                    </h4>
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-stone-700/40 ${summary.titleStyle}`}>
                                            {summary.titleName}
                                        </span>
                                    </div>
                                </div>

                                {/* Community Stats Summary */}
                                <div className="grid grid-cols-2 gap-2 my-4">
                                    <div className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
                                        isDark ? "bg-white/5 border-white/10 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"
                                    }`}>
                                        <HelpCircle size={16} className="text-amber-400 shrink-0" />
                                        <div className="min-w-0">
                                            <span className="block text-[10px] text-stone-400 font-normal">Câu hỏi</span>
                                            <span className="font-bold">{summary.questionsCount} bài đăng</span>
                                        </div>
                                    </div>

                                    <div className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
                                        isDark ? "bg-white/5 border-white/10 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"
                                    }`}>
                                        <Users size={16} className="text-cyan-400 shrink-0" />
                                        <div className="min-w-0">
                                            <span className="block text-[10px] text-stone-400 font-normal">Nhóm học</span>
                                            <span className="font-bold">{summary.groupsCount} tham gia</span>
                                        </div>
                                    </div>

                                    <div className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
                                        isDark ? "bg-white/5 border-white/10 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"
                                    }`}>
                                        <Trophy size={16} className="text-[#C5A059] shrink-0" />
                                        <div className="min-w-0">
                                            <span className="block text-[10px] text-stone-400 font-normal">Điểm kinh nghiệm</span>
                                            <span className="font-bold text-[#C5A059]">{summary.stats.totalXp} XP</span>
                                        </div>
                                    </div>

                                    <div className={`p-2.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
                                        isDark ? "bg-white/5 border-white/10 text-stone-300" : "bg-stone-50 border-stone-200 text-stone-700"
                                    }`}>
                                        <Flame size={16} className="text-orange-500 shrink-0" />
                                        <div className="min-w-0">
                                            <span className="block text-[10px] text-stone-400 font-normal">Chuỗi học tập</span>
                                            <span className="font-bold text-orange-400">{summary.stats.currentStreak} ngày 🔥</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Click to Profile Link */}
                                <Link
                                    href={profileUrl}
                                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-[#C5A059] text-[#080808] font-bold text-xs hover:bg-[#b59049] transition-all shadow-md"
                                >
                                    <span>Xem Trang Cá Nhân</span>
                                    <ExternalLink size={13} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-xs text-stone-400">
                            Không thể tải dữ liệu hồ sơ
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
