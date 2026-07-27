"use client";

import React from 'react';
import Link from 'next/link';
import { Users, Plus, Link as LinkIcon, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import GroupCard from '@/app/components/community/GroupCard';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';

interface Category {
    id: string;
    name: string;
}

interface CommunityClientProps {
    userId: string | null;
    categoryId?: string;
    page: number;
    myPage: number;
    categories: Category[];
    myGroups: any[];
    myTotalPages: number;
    myNextCursor: string | null;
    availableGroups: any[];
    totalPages: number;
    nextCursor: string | null;
}

export default function CommunityClient({
    userId,
    categoryId,
    page,
    myPage,
    categories,
    myGroups,
    myTotalPages,
    myNextCursor,
    availableGroups,
    totalPages,
    nextCursor
}: CommunityClientProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

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
                                        ? 'border-[#C5A059] bg-[#C5A059] text-white'
                                        : isDark
                                            ? 'border-transparent hover:bg-white/5 text-stone-400'
                                            : 'border-transparent hover:bg-white text-stone-600'
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
        <div className={`min-h-screen pt-24 pb-12 transition-colors duration-500 ${isDark ? "bg-[#080808]" : "bg-[#F9F8F4]"}`}>
            <div className="container mx-auto px-4 max-w-6xl">
                
                {/* Header */}
                <div className="mb-10">
                    <h1 className={`text-3xl font-serif font-bold mb-2 ${isDark ? "text-white" : "text-stone-800"}`}>
                        {t("communityPage.title", "Nhóm học tập")}
                    </h1>
                    <p className={`mb-6 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                        {t("communityPage.subtitle", "Tham gia hoặc tạo nhóm học tập để học cùng các sinh viên khác")}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <button className={`flex items-center gap-2 px-5 py-2.5 border rounded-full font-bold hover:shadow-sm transition-all text-sm ${
                            isDark
                                ? "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
                                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}>
                            <LinkIcon size={16} />
                            {t("communityPage.joinByCode", "Tham gia bằng mã")}
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#C5A059] text-white rounded-full font-bold hover:bg-[#b08d4b] hover:shadow-md transition-all text-sm shadow-sm">
                            <Plus size={16} />
                            {t("communityPage.createGroup", "Tạo nhóm")}
                        </button>
                    </div>
                </div>

                <div className={`flex justify-between items-start mb-4 border-b pb-4 gap-4 ${isDark ? "border-white/10" : "border-stone-200"}`}>
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 flex-1">
                        <Link 
                            href="/community" 
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                                !categoryId
                                    ? isDark ? 'bg-white/10 text-white' : 'bg-stone-800 text-white'
                                    : isDark ? 'bg-white/5 border border-white/10 text-stone-400 hover:bg-white/10' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                        >
                            {t("communityPage.allCategories", "Tất cả lĩnh vực")}
                        </Link>
                        {categories.map(cat => (
                            <Link 
                                key={cat.id}
                                href={`/community?category=${cat.id}`} 
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                                    categoryId === cat.id
                                        ? isDark ? 'bg-white/10 text-white' : 'bg-stone-800 text-white'
                                        : isDark ? 'bg-white/5 border border-white/10 text-stone-400 hover:bg-white/10' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                                }`}
                            >
                                {cat.name}
                            </Link>
                        ))}
                    </div>

                    <div className={`flex items-center gap-1 border rounded-lg p-1 shadow-sm ml-4 h-fit ${
                        isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200"
                    }`}>
                        <button className={`p-1.5 rounded ${isDark ? "bg-white/10 text-white" : "bg-stone-100 text-stone-700"}`}><LayoutGrid size={18} /></button>
                        <button className={`p-1.5 ${isDark ? "text-stone-500 hover:text-white" : "text-stone-400 hover:text-stone-700"}`}><List size={18} /></button>
                    </div>
                </div>

                {/* Nhóm của tôi (Chỉ hiện khi không filter category và có user) */}
                {!categoryId && userId && myGroups.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <Users className="text-[#C5A059]" size={24} />
                            <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-stone-800"}`}>
                                {t("communityPage.myGroups", "Nhóm của tôi")}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myGroups.map(group => (
                                <GroupCard key={group.id} group={group} isMine={true} currentUserId={userId} />
                            ))}
                        </div>

                        {/* Pagination Nhóm của tôi */}
                        {renderPagination(myPage, myTotalPages, 'mypage', myNextCursor)}
                    </div>
                )}

                {/* Nhóm có sẵn */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <Users className={isDark ? "text-stone-500" : "text-stone-400"} size={24} />
                        <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-stone-800"}`}>
                            {categoryId 
                                ? `${t("communityPage.availableGroups", "Nhóm có sẵn")} (${categories.find(c => c.id === categoryId)?.name})` 
                                : t("communityPage.availableGroups", "Nhóm có sẵn (Mới nhất)")}
                        </h2>
                    </div>

                    {availableGroups.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableGroups.map(group => (
                                    <GroupCard key={group.id} group={group} isMine={false} currentUserId={userId} />
                                ))}
                            </div>

                            {/* Pagination Nhóm có sẵn */}
                            {renderPagination(page, totalPages, 'page', nextCursor)}
                        </>
                    ) : (
                        <div className={`text-center py-12 rounded-2xl border ${
                            isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-stone-200"
                        }`}>
                            <p className={isDark ? "text-stone-500" : "text-stone-500"}>
                                {t("communityPage.noGroupsFound", "Không tìm thấy nhóm nào trong lĩnh vực này.")}
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
