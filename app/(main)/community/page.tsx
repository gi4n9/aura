import React from 'react';
import Link from 'next/link';
import { Users, Plus, Link as LinkIcon, LayoutGrid, List, Search, ArrowRight, ShieldCheck, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { getCategories, getMyGroups, getAvailableGroups } from '@/app/actions/community';
import { createClient } from '@/utils/supabase/server';
import GroupCard from '@/app/components/community/GroupCard';

export const dynamic = 'force-dynamic';

export default async function CommunityPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    
    // 1. Check User Login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // 2. Parse Search Params
    const categoryId = typeof searchParams.category === 'string' ? searchParams.category : undefined;
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
    const myPage = typeof searchParams.mypage === 'string' ? parseInt(searchParams.mypage) : 1;
    
    // Cursors
    const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined;
    const mycursor = typeof searchParams.mycursor === 'string' ? searchParams.mycursor : undefined;

    // 3. Fetch Data
    const categories = await getCategories();
    const { groups: myGroups, totalPages: myTotalPages, nextCursor: myNextCursor } = userId ? await getMyGroups(userId, myPage, 10, mycursor) : { groups: [], totalPages: 0, nextCursor: null };
    const { groups: availableGroups, totalPages, nextCursor } = await getAvailableGroups(userId, categoryId, page, 10, cursor);

    // 4. Helper function để render các nút phân trang (hiển thị 3 đầu, 3 cuối)
    const renderPagination = (currentPage: number, total: number, paramName: 'page' | 'mypage', nextCursorStr: string | null) => {
        if (total <= 1) return null;

        // Xây dựng mảng hiển thị trang (3 đầu, 3 cuối)
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
            
            // Giữ lại các param không liên quan
            if (paramName === 'page' && myPage > 1) params.set('mypage', myPage.toString());
            if (paramName === 'mypage' && page > 1) params.set('page', page.toString());
            
            params.set(paramName, p.toString());
            
            // Thêm cursor nếu là nút Next
            if (isNext && nextCursorStr) {
                params.set(paramName === 'page' ? 'cursor' : 'mycursor', nextCursorStr);
            }

            return `/community?${params.toString()}`;
        };

        return (
            <div className="flex justify-end items-center gap-4 mt-8 text-sm font-medium text-stone-500">
                <span>Trang {currentPage} / {total}</span>
                <div className="flex gap-2 items-center">
                    {/* Nút Prev */}
                    {currentPage > 1 && (
                        <Link href={buildUrl(currentPage - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:bg-white text-stone-600 transition-colors">
                            <ChevronLeft size={16} />
                        </Link>
                    )}

                    {/* Các số trang */}
                    {pages.map((p, idx) => {
                        if (p === '...') {
                            return <span key={`dots-${idx}`} className="px-1 text-stone-400">...</span>;
                        }
                        
                        const isCurrent = p === currentPage;
                        return (
                            <Link
                                key={p}
                                href={buildUrl(p as number)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border ${isCurrent ? 'border-[#C5A059] bg-[#C5A059] text-white' : 'border-transparent hover:bg-white text-stone-600'} transition-colors`}
                            >
                                {p}
                            </Link>
                        );
                    })}

                    {/* Nút Next */}
                    {currentPage < total && (
                        <Link href={buildUrl(currentPage + 1, true)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:bg-white text-stone-600 transition-colors">
                            <ChevronRight size={16} />
                        </Link>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-6xl">
                
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">Nhóm học tập</h1>
                    <p className="text-stone-500 mb-6">Tham gia hoặc tạo nhóm học tập để học cùng các sinh viên khác</p>
                    
                    <div className="flex flex-wrap items-center gap-4">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 rounded-full font-bold text-stone-700 hover:bg-stone-50 hover:shadow-sm transition-all text-sm">
                            <LinkIcon size={16} />
                            Tham gia bằng mã
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#C5A059] text-white rounded-full font-bold hover:bg-[#b08d4b] hover:shadow-md transition-all text-sm shadow-sm">
                            <Plus size={16} />
                            Tạo nhóm
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-start mb-4 border-b border-stone-200 pb-4 gap-4">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 flex-1">
                        <Link 
                            href="/community" 
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${!categoryId ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                        >
                            Tất cả lĩnh vực
                        </Link>
                        {categories.map(cat => (
                            <Link 
                                key={cat.id}
                                href={`/community?category=${cat.id}`} 
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${categoryId === cat.id ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                            >
                                {cat.name}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1 shadow-sm ml-4 h-fit">
                        <button className="p-1.5 bg-stone-100 rounded text-stone-700"><LayoutGrid size={18} /></button>
                        <button className="p-1.5 text-stone-400 hover:text-stone-700"><List size={18} /></button>
                    </div>
                </div>

                {/* Nhóm của tôi (Chỉ hiện khi không filter category và có user) */}
                {!categoryId && userId && myGroups.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <Users className="text-[#C5A059]" size={24} />
                            <h2 className="text-xl font-bold text-stone-800">Nhóm của tôi</h2>
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
                        <Users className="text-stone-400" size={24} />
                        <h2 className="text-xl font-bold text-stone-800">
                            {categoryId ? `Nhóm có sẵn (${categories.find(c => c.id === categoryId)?.name})` : 'Nhóm có sẵn (Mới nhất)'}
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
                        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200">
                            <p className="text-stone-500">Không tìm thấy nhóm nào trong lĩnh vực này.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
