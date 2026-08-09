"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Crown, Heart, ThumbsUp, Lightbulb, Star, UserPlus, Send, Trophy, Sparkles, Award, ShieldCheck, ChevronRight } from "lucide-react";
import { sendProfileCheer, toggleProfileReaction } from "@/app/actions/user-profile";
import { AVATAR_FRAMES } from "@/lib/gamification";

interface PublicUserProfileProps {
    targetUser: {
        id: string;
        fullName?: string | null;
        email: string;
        avatarUrl?: string | null;
        bio?: string | null;
        learningGoal?: string | null;
        viewsCount: number;
        createdAt: Date;
    };
    gamiData: any;
    reactionsCount: {
        heart: number;
        thumb: number;
        idea: number;
        star: number;
        total: number;
    };
    cheers: any[];
    currentUserId?: string;
    isDark?: boolean;
}

export default function PublicUserProfileView({
    targetUser,
    gamiData,
    reactionsCount: initialReactions,
    cheers: initialCheers,
    currentUserId,
    isDark = true
}: PublicUserProfileProps) {
    const [cheersList, setCheersList] = useState(initialCheers);
    const [reactions, setReactions] = useState(initialReactions);
    const [cheerMsg, setCheerMsg] = useState("");
    const [isCheering, setIsCheering] = useState(false);
    const [showCheerInput, setShowCheerInput] = useState(false);
    const [isFriendAdded, setIsFriendAdded] = useState(false);

    const name = targetUser.fullName || targetUser.email.split('@')[0] || "Học viên Aura";
    const level = gamiData?.levelProgress?.currentLevel || 1;
    const totalXp = gamiData?.stats?.totalXp || 0;
    const equippedFrame = gamiData?.stats?.equippedFrame || "frame_default";

    const getFrameStyle = (frameId: string) => {
        const frame = AVATAR_FRAMES.find(f => f.id === frameId);
        return frame ? frame.previewStyle : "border-4 border-amber-400";
    };

    const handleSendCheer = async (msg: string) => {
        if (!msg.trim()) return;
        setIsCheering(true);
        const res = await sendProfileCheer(targetUser.id, msg);
        if (res.success && res.cheer) {
            setCheersList([res.cheer, ...cheersList]);
            setCheerMsg("");
            setShowCheerInput(false);
        }
        setIsCheering(false);
    };

    const handleReaction = async (type: 'heart' | 'thumb' | 'idea' | 'star') => {
        setReactions(prev => ({
            ...prev,
            [type]: prev[type] + 1,
            total: prev.total + 1
        }));
        await toggleProfileReaction(targetUser.id, type);
    };

    const PRESET_CHEERS = [
        "🎉 Chúc mừng bạn nhé!",
        "🔥 Tiến bộ tuyệt vời!",
        "💪 Anh nỗ lực lên nhé!",
        "🌟 Làm tốt lắm!",
        "🚀 Bạn đang chạy hết tốc lực!"
    ];

    return (
        <div className="space-y-8 text-white font-sans">
            
            {/* PAGE TITLE */}
            <h1 className="text-3xl font-serif font-extrabold text-white">Hồ sơ người dùng</h1>

            {/* 1. MAIN HEADER CARD (DARK BLUE GLASSMORPHISM CONTAINER) */}
            <div className="bg-gradient-to-r from-[#111827]/90 via-[#0f172a] to-[#1e1b4b]/90 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-8">
                
                {/* LEFT: AVATAR WITH GOLDEN AURA, CROWN & LEVEL BADGE */}
                <div className="flex flex-col items-center shrink-0 relative">
                    <div className="relative">
                        {/* Golden Crown */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce z-10">
                            <Crown size={32} fill="currentColor" />
                        </div>

                        {/* Avatar Ring */}
                        <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center relative shadow-[0_0_30px_rgba(245,158,11,0.4)] ${getFrameStyle(equippedFrame)}`}>
                            {targetUser.avatarUrl ? (
                                <Image src={targetUser.avatarUrl} alt={name} fill className="rounded-full object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-amber-900 text-amber-200 flex items-center justify-center font-bold text-3xl font-serif">
                                    {name.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Floating Level Badge */}
                        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#C5A059] text-[#080808] font-extrabold text-xs shadow-xl tracking-wider flex items-center gap-1 shrink-0 whitespace-nowrap z-10">
                            🏆 Cấp độ {level}
                        </span>
                    </div>
                </div>

                {/* RIGHT: USER METADATA, REACTIONS, BIO & GOAL */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                    
                    {/* Name + Verified + Add Friend Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-serif font-extrabold text-white flex items-center justify-center md:justify-start gap-2">
                                {name}
                                <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                                    ✔
                                </span>
                            </h2>
                            <p className="text-xs text-stone-400 mt-1">
                                Thành viên từ {new Date(targetUser.createdAt).toLocaleDateString('vi-VN')} • <strong className="text-stone-300">{targetUser.viewsCount} lượt xem</strong>
                            </p>
                        </div>

                        {/* Add Friend Button */}
                        <button
                            onClick={() => setIsFriendAdded(!isFriendAdded)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-center md:self-start ${
                                isFriendAdded
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                            }`}
                        >
                            <UserPlus size={14} />
                            <span>{isFriendAdded ? "✔ Đã gửi lời mời" : "+ Thêm bạn"}</span>
                        </button>
                    </div>

                    {/* Reactions Bar */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                        <button onClick={() => handleReaction('heart')} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/20 transition-all cursor-pointer">
                            <Heart size={14} fill="currentColor" /> {reactions.heart}
                        </button>
                        <button onClick={() => handleReaction('thumb')} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer">
                            <ThumbsUp size={14} fill="currentColor" /> {reactions.thumb}
                        </button>
                        <button onClick={() => handleReaction('idea')} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs font-bold hover:bg-yellow-500/20 transition-all cursor-pointer">
                            <Lightbulb size={14} fill="currentColor" /> {reactions.idea}
                        </button>
                        <button onClick={() => handleReaction('star')} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all cursor-pointer">
                            <Star size={14} fill="currentColor" /> {reactions.star}
                        </button>
                        <span className="text-xs text-sky-400 font-semibold ml-2">
                            Xem tất cả ({reactions.total})
                        </span>
                    </div>

                    {/* Bio & Goal */}
                    <div className="space-y-1.5 pt-2 text-xs border-t border-white/10 text-stone-300">
                        <p><strong className="text-white">Giới thiệu:</strong> {targetUser.bio || "Sinh viên ĐH Sài Gòn (SGU) • Đam mê Lập trình"}</p>
                        <p className="flex items-center gap-1 text-amber-300 font-medium">
                            🎯 <strong>Mục tiêu học tập:</strong> {targetUser.learningGoal || "Có việc làm Software Engineer trước khi tốt nghiệp..."}
                        </p>
                    </div>

                </div>
            </div>

            {/* 2. CHEER STREAM CAROUSEL (CỔ VŨ TIẾN ĐỘ HỌC TẬP) */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold flex items-center gap-2 text-amber-400">
                        <Star size={18} fill="currentColor" />
                        Cổ vũ cho tiến độ học tập
                    </h3>
                    <button
                        onClick={() => setShowCheerInput(!showCheerInput)}
                        className="px-3 py-1.5 rounded-xl bg-[#C5A059] text-[#080808] font-bold text-xs hover:bg-[#b59049] transition-all cursor-pointer flex items-center gap-1"
                    >
                        <Send size={12} /> Send Cheer
                    </button>
                </div>

                {/* Optional Custom Cheer Input */}
                {showCheerInput && (
                    <div className="flex gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
                        <input
                            type="text"
                            placeholder="Nhập lời cổ vũ (VD: Cố lên nhé!)..."
                            value={cheerMsg}
                            onChange={(e) => setCheerMsg(e.target.value)}
                            className="flex-1 bg-transparent text-xs text-white outline-none px-2"
                        />
                        <button
                            onClick={() => handleSendCheer(cheerMsg)}
                            disabled={isCheering}
                            className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                            Gửi
                        </button>
                    </div>
                )}

                {/* Preset Fast Cheer Pills */}
                <div className="flex flex-wrap gap-2">
                    {PRESET_CHEERS.map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSendCheer(preset)}
                            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-semibold text-stone-200 transition-all cursor-pointer"
                        >
                            {preset}
                        </button>
                    ))}
                </div>

                {/* Cheers Floating Carousel Stream */}
                <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-none">
                    {cheersList.map((cheer, idx) => (
                        <div key={cheer.id || idx} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 shrink-0 text-xs shadow-md">
                            <span className="font-bold text-sky-300">"{cheer.message}"</span>
                            <span className="text-[10px] text-stone-400">— {cheer.sender?.fullName || "Học viên Aura"}</span>
                        </div>
                    ))}
                </div>

                <p className="text-[11px] text-stone-500 text-center">
                    Số lượng cổ vũ nhận được khi hoàn thành bài học
                </p>
            </div>

            {/* 3. ACHIEVEMENTS CARD (THÀNH TÍCH) */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-white">
                        <Trophy className="text-[#C5A059]" size={20} />
                        Thành tích
                    </h3>
                    <Link href="/community?tab=leaderboard" className="text-xs font-semibold text-[#C5A059] hover:underline flex items-center gap-1">
                        Bảng xếp hạng <ChevronRight size={14} />
                    </Link>
                </div>

                {/* Badges Summary Pills */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5">
                        🏆 3 Huyền thoại
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold flex items-center gap-1.5">
                        💎 5 Sử thi
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold flex items-center gap-1.5">
                        ⭐ 13 Hiếm
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
                        🌟 13 Thông thường
                    </span>
                </div>

                {/* XP Banner */}
                <div className="p-3 px-5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs font-bold text-amber-300 text-center">
                    38 thành tích đã đạt được • +{(totalXp * 2.5).toLocaleString()} XP
                </div>

                {/* Achievement Badge Grid Icons */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-4 pt-2">
                    {["Huyền thoại", "Sử thi", "Hiếm", "Thông thường", "Huyền thoại", "Sử thi", "Hiếm", "Thông thường"].map((tier, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1 group">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-all shadow-md">
                                {idx % 4 === 0 && "🏆"}
                                {idx % 4 === 1 && "💎"}
                                {idx % 4 === 2 && "⭐"}
                                {idx % 4 === 3 && "🌟"}
                            </div>
                            <span className="text-[10px] text-stone-400 font-medium group-hover:text-amber-400 transition-all">
                                {tier}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. WEEKLY RANKING CARD (XẾP HẠNG TUẦN) */}
            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-serif font-bold flex items-center gap-2 text-white">
                        <Trophy className="text-amber-400" size={20} />
                        Xếp hạng tuần
                    </h3>
                    <Link href="/community?tab=leaderboard" className="text-xs font-semibold text-[#C5A059] hover:underline flex items-center gap-1">
                        Xem bảng xếp hạng <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs font-bold text-amber-300">
                    <span className="text-lg">🥇</span>
                    <span>#1 — Người dùng này đang trong top 3 tuần này!</span>
                </div>
            </div>

        </div>
    );
}
