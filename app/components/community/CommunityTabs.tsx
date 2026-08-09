"use client";

import React from "react";
import { Users, Trophy, Flame, HelpCircle } from "lucide-react";

interface CommunityTabsProps {
    activeTab: 'groups' | 'leaderboard' | 'streaks' | 'qa';
    onTabChange: (tab: 'groups' | 'leaderboard' | 'streaks' | 'qa') => void;
    isDark?: boolean;
}

export default function CommunityTabs({
    activeTab,
    onTabChange,
    isDark = true
}: CommunityTabsProps) {
    const tabs = [
        { id: 'groups', label: 'Nhóm Học Tập', icon: Users },
        { id: 'leaderboard', label: 'Bảng Xếp Hạng', icon: Trophy },
        { id: 'streaks', label: 'Chuỗi Ngày Học', icon: Flame },
        { id: 'qa', label: 'Hỏi Đáp Cộng Đồng', icon: HelpCircle },
    ] as const;

    return (
        <div className={`p-1.5 rounded-2xl border flex flex-wrap gap-1 mb-8 ${
            isDark ? "bg-[#0e0e0e] border-white/10" : "bg-stone-100 border-stone-200"
        }`}>
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id as any)}
                        className={`flex-1 min-w-[140px] px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isActive
                                ? "bg-[#C5A059] text-[#080808] shadow-lg shadow-[#C5A059]/20"
                                : isDark
                                ? "text-stone-400 hover:text-white hover:bg-white/5"
                                : "text-stone-600 hover:text-stone-900 hover:bg-white"
                        }`}
                    >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
