"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Link as LinkIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import GroupCard from '@/app/components/community/GroupCard';
import CreateGroupModal from '@/app/components/community/CreateGroupModal';
import CommunityTabs from '@/app/components/community/CommunityTabs';
import LeaderboardView from '@/app/components/community/LeaderboardView';
import StreakDashboardView from '@/app/components/community/StreakDashboardView';
import QAForumView from '@/app/components/community/QAForumView';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';

interface Category {
    id: string;
    name: string;
}

interface CommunityClientProps {
    userId: string | null;
    categoryId?: string;
    initialTab?: 'groups' | 'leaderboard' | 'streaks' | 'qa';
    page: number;
    myPage: number;
    categories: Category[];
    myGroups: any[];
    myTotalPages: number;
    myNextCursor: string | null;
    availableGroups: any[];
    totalPages: number;
    nextCursor: string | null;
    enrolledCourses: { id: string; title: string; thumbnailUrl?: string | null }[];
    leaderboardUsers?: any[];
    userGamiData?: any;
    qaQuestions?: any[];
}

export default function CommunityClient({
    userId,
    categoryId,
    initialTab = 'groups',
    page,
    myPage,
    categories,
    myGroups,
    myTotalPages,
    myNextCursor,
    availableGroups,
    totalPages,
    nextCursor,
    enrolledCourses,
    leaderboardUsers = [],
    userGamiData,
    qaQuestions = []
}: CommunityClientProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [activeTab, setActiveTab] = useState<'groups' | 'leaderboard' | 'streaks' | 'qa'>(initialTab);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const renderPagination = (currentPage: number, total: number, paramName: 'page' | 'mypage', nextCursorStr: string | null) => {
        if (total <= 1) return null;

        const pages: (number | string)[] = [];
        for (let i = 1; i <= total; i++) {
            if (i <= 3 || i > total - 3 || Math.abs(i - currentPage) <= 1) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        const buildUrl = (p: number, isNext: boolean = false) => {
            const params = new URLSearchParams();
            if (categoryId) params.set('category', categoryId);
            params.set('tab', activeTab);
            
            if (paramName === 'page' && myPage > 1) params.set('mypage', myPage.toString());
            if (paramName === 'mypage' && page > 1) params.set('page', page.toString());
            
            params.set(paramName, p.toString());
            
            if (isNext && nextCursorStr) {
                params.set(paramName === 'page' ? 'cursor' : 'mycursor', nextCursorStr);
            }

            return `/community?${params.toString()}`;
        };

        return (
            <div className={`flex justify-end items-center gap-4 mt-8 text-sm font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                <span>{t("communityPage.page", "Trang")} {currentPage} / {total}</span>
                <div className="flex gap-2 items-center">
                    {currentPage > 1 && (
                        <Link href={buildUrl(currentPage - 1)} className={`w-8 h-8 flex items-center justify-center rounded-lg border border-transparent transition-colors ${
                            isDark ? "hover:bg-white/5 text-stone-400" : "hover:bg-white text-stone-600"
                        }`}>
                            <ChevronLeft size={16} />
                        </Link>
                    )}

                    {pages.map((p, idx) => {
                        if (p === '...') {
                            return <span key={`dots-${idx}`} className="px-1 text-stone-400">...</span>;
                        }
                        
                        const isCurrent = p === currentPage;
                        return (
                            <Link
                                key={p}
                                href={buildUrl(p as number)}
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

                    {currentPage < total && (
                        <Link href={buildUrl(currentPage + 1, true)} className={`w-8 h-8 flex items-center justify-center rounded-lg border border-transparent transition-colors ${
                            isDark ? "hover:bg-white/5 text-stone-400" : "hover:bg-white text-stone-600"
                        }`}>
                            <ChevronRight size={16} />
                        </Link>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen py-10 pt-[90px] ${isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"}`}>
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                
                {/* PAGE HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-serif font-bold tracking-tight">Cộng Đồng Aura</h1>
                        <p className={`text-sm mt-1 ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                            Kết nối học viên, thi đua xếp hạng, duy trì streak và trao đổi tri thức
                        </p>
                    </div>

                    {activeTab === 'groups' && userId && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-5 py-3 rounded-2xl bg-[#C5A059] text-[#080808] font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#b59049] transition-all shadow-lg shadow-[#C5A059]/20 cursor-pointer self-start sm:self-auto"
                        >
                            <Plus size={16} /> Tạo Nhóm Mới
                        </button>
                    )}
                </div>

                {/* NAVIGATION TABS */}
                <CommunityTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isDark={isDark}
                />

                {/* TAB CONTENT: GROUPS */}
                {activeTab === 'groups' && (
                    <div className="space-y-12">
                        {/* 1. Nhóm của tôi */}
                        {userId && (
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                                        <Users className="text-[#C5A059]" size={20} />
                                        Nhóm Của Tôi ({myGroups.length})
                                    </h2>
                                </div>

                                {myGroups.length === 0 ? (
                                    <div className={`p-8 rounded-3xl border text-center ${isDark ? "bg-[#0e0e0e] border-white/10 text-stone-400" : "bg-white border-stone-200 text-stone-500"}`}>
                                        <p className="text-sm">Bạn chưa tham gia nhóm học tập nào.</p>
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="mt-3 text-xs font-bold text-[#C5A059] hover:underline"
                                        >
                                            + Tạo nhóm học tập đầu tiên
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {myGroups.map((group) => (
                                            <GroupCard key={group.id} group={group} isMine={true} currentUserId={userId} />
                                        ))}
                                    </div>
                                )}
                                {renderPagination(myPage, myTotalPages, 'mypage', myNextCursor)}
                            </section>
                        )}

                        {/* 2. Nhóm có sẵn */}
                        <section>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                                    <LinkIcon className="text-[#C5A059]" size={20} />
                                    Tất Cả Nhóm Học Tập ({availableGroups.length})
                                </h2>

                                {/* Category Filters */}
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href="/community?tab=groups"
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                            !categoryId
                                                ? "bg-[#C5A059] text-[#080808]"
                                                : isDark ? "bg-white/5 text-stone-400 hover:text-white" : "bg-stone-200 text-stone-700"
                                        }`}
                                    >
                                        Tất cả
                                    </Link>
                                    {categories.map((cat) => (
                                        <Link
                                            key={cat.id}
                                            href={`/community?tab=groups&category=${cat.id}`}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                                categoryId === cat.id
                                                    ? "bg-[#C5A059] text-[#080808]"
                                                    : isDark ? "bg-white/5 text-stone-400 hover:text-white" : "bg-stone-200 text-stone-700"
                                            }`}
                                        >
                                            {cat.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {availableGroups.length === 0 ? (
                                <div className={`p-12 text-center rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-stone-400" : "bg-white border-stone-200 text-stone-500"}`}>
                                    <p className="text-sm">Không tìm thấy nhóm học tập phù hợp.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {availableGroups.map((group) => (
                                        <GroupCard key={group.id} group={group} isMine={false} currentUserId={userId} />
                                    ))}
                                </div>
                            )}
                            {renderPagination(page, totalPages, 'page', nextCursor)}
                        </section>
                    </div>
                )}

                {/* TAB CONTENT: LEADERBOARD */}
                {activeTab === 'leaderboard' && (
                    <LeaderboardView
                        topUsers={leaderboardUsers}
                        currentUserId={userId || undefined}
                        isDark={isDark}
                    />
                )}

                {/* TAB CONTENT: STREAKS */}
                {activeTab === 'streaks' && (
                    <StreakDashboardView
                        currentStreak={userGamiData?.stats?.currentStreak || 0}
                        longestStreak={userGamiData?.stats?.longestStreak || 0}
                        totalXp={userGamiData?.stats?.totalXp || 0}
                        lastStudyDate={userGamiData?.stats?.lastStudyDate}
                        isDark={isDark}
                    />
                )}

                {/* TAB CONTENT: Q&A FORUM */}
                {activeTab === 'qa' && (
                    <QAForumView
                        questions={qaQuestions}
                        currentUserId={userId || undefined}
                        isDark={isDark}
                    />
                )}

            </div>

            {/* CREATE GROUP MODAL */}
            <CreateGroupModal
                isOpen={isCreateModalOpen}
                enrolledCourses={enrolledCourses}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
