"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Lock, Check, Sparkles, Shield, Palette, Tag } from "lucide-react";
import { CosmeticItem } from "@/lib/gamification";
import { equipProfileItem } from "@/app/actions/gamification-actions";

interface ProfileCustomizerProps {
    user: {
        name: string;
        email: string;
        avatarUrl?: string | null;
    };
    level: number;
    unlockedItems: string[];
    equippedFrame: string;
    equippedBanner: string;
    equippedTitle: string;
    catalog: {
        frames: CosmeticItem[];
        banners: CosmeticItem[];
        titles: CosmeticItem[];
    };
    isDark?: boolean;
}

export default function ProfileCustomizer({
    user,
    level,
    unlockedItems,
    equippedFrame: initialFrame,
    equippedBanner: initialBanner,
    equippedTitle: initialTitle,
    catalog,
    isDark = true
}: ProfileCustomizerProps) {
    const [activeTab, setActiveTab] = useState<'frames' | 'banners' | 'titles'>('frames');
    const [equippedFrame, setEquippedFrame] = useState(initialFrame);
    const [equippedBanner, setEquippedBanner] = useState(initialBanner);
    const [equippedTitle, setEquippedTitle] = useState(initialTitle);
    const [loadingItem, setLoadingItem] = useState<string | null>(null);

    const currentFrameObj = catalog.frames.find(f => f.id === equippedFrame) || catalog.frames[0];
    const currentBannerObj = catalog.banners.find(b => b.id === equippedBanner) || catalog.banners[0];
    const currentTitleObj = catalog.titles.find(t => t.name === equippedTitle || t.id === equippedTitle) || catalog.titles[0];

    const handleEquip = async (item: CosmeticItem) => {
        if (item.requiredLevel > level || !unlockedItems.includes(item.id)) return;

        setLoadingItem(item.id);

        const result = await equipProfileItem(item.type, item.id);

        if (result.success) {
            if (item.type === 'frame') setEquippedFrame(item.id);
            if (item.type === 'banner') setEquippedBanner(item.id);
            if (item.type === 'title') setEquippedTitle(item.name);
        } else {
            alert(result.error || "Không thể trang bị vật phẩm");
        }
        setLoadingItem(null);
    };

    const userInitial = user.name?.trim().charAt(0).toUpperCase() || user.email?.trim().charAt(0).toUpperCase() || "U";

    return (
        <div className={`p-6 rounded-3xl border transition-all ${
            isDark ? "bg-[#0e0e0e] border-white/10 text-white shadow-2xl" : "bg-white border-stone-200 text-stone-900 shadow-md"
        }`}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                        <Sparkles className="text-[#C5A059]" size={22} />
                        Trang trí Hồ sơ & Mở khóa Giao diện
                    </h2>
                    <p className={`text-xs mt-1 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                        Thăng cấp để mở khóa Khung Avatar, Nền Banner và Danh hiệu độc quyền
                    </p>
                </div>
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className={`mb-8 rounded-2xl overflow-hidden border shadow-xl relative ${
                isDark ? "border-white/10 bg-[#141414]" : "border-stone-200 bg-white"
            }`}>
                {/* Banner Header */}
                <div className={`h-32 w-full p-4 flex items-end justify-between transition-all duration-500 relative ${currentBannerObj.previewStyle}`}>
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md text-stone-200 border border-white/10">
                        Xem trước Hồ sơ
                    </div>
                </div>

                {/* Profile Details Container */}
                <div className="p-6 pt-3 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div className="flex items-center gap-6">
                        {/* Avatar with Frame */}
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center relative shadow-2xl transition-all duration-300 -mt-12 shrink-0 ${
                            isDark ? "bg-[#141414]" : "bg-white"
                        } ${currentFrameObj.previewStyle}`}>
                            {user.avatarUrl ? (
                                <Image src={user.avatarUrl} alt="Avatar" fill className="rounded-full object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-full bg-[#1a1a1a] text-[#C5A059] flex items-center justify-center font-bold text-2xl font-serif">
                                    {userInitial}
                                </div>
                            )}
                        </div>

                        {/* Name & Title */}
                        <div className="pb-1 pl-1">
                            <h3 className={`text-lg font-bold font-serif leading-tight ${isDark ? "text-white" : "text-stone-900"}`}>{user.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C5A059] text-[#080808]">
                                    Cấp {level}
                                </span>
                                <span className={`text-xs ${currentTitleObj.previewStyle}`}>
                                    {currentTitleObj.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className={`flex border-b mb-6 gap-2 ${isDark ? "border-white/10" : "border-stone-200"}`}>
                <button
                    onClick={() => setActiveTab('frames')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeTab === 'frames'
                            ? "border-[#C5A059] text-[#C5A059]"
                            : isDark ? "border-transparent text-stone-400 hover:text-white" : "border-transparent text-stone-600 hover:text-stone-900"
                    }`}
                >
                    <Shield size={16} />
                    Khung Avatar ({catalog.frames.length})
                </button>

                <button
                    onClick={() => setActiveTab('banners')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeTab === 'banners'
                            ? "border-[#C5A059] text-[#C5A059]"
                            : isDark ? "border-transparent text-stone-400 hover:text-white" : "border-transparent text-stone-600 hover:text-stone-900"
                    }`}
                >
                    <Palette size={16} />
                    Nền Profile ({catalog.banners.length})
                </button>

                <button
                    onClick={() => setActiveTab('titles')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        activeTab === 'titles'
                            ? "border-[#C5A059] text-[#C5A059]"
                            : isDark ? "border-transparent text-stone-400 hover:text-white" : "border-transparent text-stone-600 hover:text-stone-900"
                    }`}
                >
                    <Tag size={16} />
                    Danh hiệu ({catalog.titles.length})
                </button>
            </div>

            {/* ITEMS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {activeTab === 'frames' && catalog.frames.map((frame) => {
                    const isUnlocked = unlockedItems.includes(frame.id) && level >= frame.requiredLevel;
                    const isEquipped = equippedFrame === frame.id;

                    return (
                        <div
                            key={frame.id}
                            onClick={() => isUnlocked && handleEquip(frame)}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                isEquipped
                                    ? "border-[#C5A059] bg-[#C5A059]/10 shadow-lg shadow-[#C5A059]/20 ring-1 ring-[#C5A059]"
                                    : isUnlocked
                                    ? isDark ? "border-white/10 bg-white/5 hover:border-white/30 cursor-pointer" : "border-stone-200 bg-stone-50 hover:border-stone-300 cursor-pointer"
                                    : isDark ? "border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed" : "border-stone-200 bg-stone-100 opacity-60 cursor-not-allowed"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${frame.previewStyle}`}>
                                    <div className="w-8 h-8 rounded-full bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center font-bold text-xs">
                                        α
                                    </div>
                                </div>
                                {isEquipped ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#C5A059] text-[#080808] flex items-center gap-1">
                                        <Check size={12} strokeWidth={3} /> Đang dùng
                                    </span>
                                ) : !isUnlocked ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-800 text-stone-400 flex items-center gap-1">
                                        <Lock size={12} /> Cấp {frame.requiredLevel}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-[#C5A059]">Bấm để chọn</span>
                                )}
                            </div>

                            <div>
                                <h4 className="font-bold text-sm">{frame.name}</h4>
                                <p className={`text-xs mt-0.5 ${isDark ? "text-stone-400" : "text-stone-500"}`}>{frame.description}</p>
                            </div>
                        </div>
                    );
                })}

                {activeTab === 'banners' && catalog.banners.map((banner) => {
                    const isUnlocked = unlockedItems.includes(banner.id) && level >= banner.requiredLevel;
                    const isEquipped = equippedBanner === banner.id;

                    return (
                        <div
                            key={banner.id}
                            onClick={() => isUnlocked && handleEquip(banner)}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                isEquipped
                                    ? "border-[#C5A059] bg-[#C5A059]/10 shadow-lg ring-1 ring-[#C5A059]"
                                    : isUnlocked
                                    ? isDark ? "border-white/10 bg-white/5 hover:border-white/30 cursor-pointer" : "border-stone-200 bg-stone-50 hover:border-stone-300 cursor-pointer"
                                    : isDark ? "border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed" : "border-stone-200 bg-stone-100 opacity-60 cursor-not-allowed"
                            }`}
                        >
                            <div className="mb-3">
                                <div className={`h-16 w-full rounded-xl p-2 flex items-center justify-end ${banner.previewStyle}`}>
                                    {isEquipped ? (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#C5A059] text-[#080808] flex items-center gap-1 shadow-md">
                                            <Check size={10} strokeWidth={3} /> Đang dùng
                                        </span>
                                    ) : !isUnlocked ? (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-stone-300 flex items-center gap-1">
                                            <Lock size={10} /> Cấp {banner.requiredLevel}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-sm">{banner.name}</h4>
                                <p className={`text-xs mt-0.5 ${isDark ? "text-stone-400" : "text-stone-500"}`}>{banner.description}</p>
                            </div>
                        </div>
                    );
                })}

                {activeTab === 'titles' && catalog.titles.map((title) => {
                    const isUnlocked = unlockedItems.includes(title.id) && level >= title.requiredLevel;
                    const isEquipped = equippedTitle === title.name;

                    return (
                        <div
                            key={title.id}
                            onClick={() => isUnlocked && handleEquip(title)}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                isEquipped
                                    ? "border-[#C5A059] bg-[#C5A059]/10 shadow-lg ring-1 ring-[#C5A059]"
                                    : isUnlocked
                                    ? isDark ? "border-white/10 bg-white/5 hover:border-white/30 cursor-pointer" : "border-stone-200 bg-stone-50 hover:border-stone-300 cursor-pointer"
                                    : isDark ? "border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed" : "border-stone-200 bg-stone-100 opacity-60 cursor-not-allowed"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-sm font-bold ${title.previewStyle}`}>
                                    {title.name}
                                </span>
                                {isEquipped ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#C5A059] text-[#080808] flex items-center gap-1">
                                        <Check size={12} strokeWidth={3} /> Đang dùng
                                    </span>
                                ) : !isUnlocked ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-800 text-stone-400 flex items-center gap-1">
                                        <Lock size={12} /> Cấp {title.requiredLevel}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-[#C5A059]">Chọn danh hiệu</span>
                                )}
                            </div>

                            <p className={`text-xs ${isDark ? "text-stone-400" : "text-stone-500"}`}>{title.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
