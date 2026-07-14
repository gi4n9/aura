import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, ShieldCheck, Search, HelpCircle, Flame, Trophy, Clock, Target, Calendar, ChevronDown, Plus } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db } from '@/lib/prisma';

import GroupChatBox from '@/app/components/chat/GroupChatBox';

const mockLeaderboard = [
    { id: 1, name: 'Đoàn Quang Hưng', pomodoros: 0, minutes: 0, xp: 0, rank: 1, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hung' },
    { id: 2, name: 'Lan Anh', pomodoros: 0, minutes: 0, xp: 0, rank: 2, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lananh' },
    { id: 3, name: 'Huu Nghia Pham', pomodoros: 0, minutes: 0, xp: 0, rank: 3, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nghia' },
    { id: 4, name: 'huynhhainguyen0706_f...', pomodoros: 0, minutes: 0, xp: 0, rank: 4, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nguyen' },
];

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    
    const group = await db.conversation.findUnique({
        where: { id: groupId },
        include: {
            _count: {
                select: { participants: true }
            }
        }
    });

    if (!group) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-7xl">
                
                {/* Header Navigation */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/community" className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-stone-200">
                        {group.avatarUrl ? (
                            <Image src={group.avatarUrl} alt={group.name || ''} width={32} height={32} className="rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#C5A059] flex items-center justify-center text-white">
                                <span className="font-serif font-bold text-sm">
                                    {(group.name || 'G').charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-stone-800 text-sm leading-tight">{group.name || 'Group không tên'}</h1>
                            <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                                <span className="flex items-center gap-1"><Users size={12} /> {group._count.participants} / {group.maxMembers} thành viên</span>
                            </div>
                        </div>
                        <div className="ml-2 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-1 rounded-md">
                            {group.isPublic ? (
                                <><ShieldCheck size={12} /> Công khai</>
                            ) : (
                                <><ShieldCheck size={12} className="text-stone-500" /> Riêng tư</>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    
                    {/* Left Column (Chat & Q&A) */}
                    <div className="flex-1 flex flex-col gap-6">
                        
                        <GroupChatBox groupId={groupId} />

                        {/* Q&A Box */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
                            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                                <div className="font-bold text-stone-800 flex items-center gap-2">
                                    <HelpCircle size={18} className="text-[#C5A059]" /> Hỏi & Đáp 
                                    <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full text-xs">0</span>
                                </div>
                                <button className="px-4 py-1.5 bg-[#C5A059] text-white text-xs font-bold rounded-lg hover:bg-[#b08d4b] transition-colors shadow-sm flex items-center gap-1">
                                    <Plus size={14} /> Đặt câu hỏi
                                </button>
                            </div>
                            
                            <div className="p-4 border-b border-stone-100">
                                <div className="relative mb-4">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input type="text" placeholder="Tìm kiếm câu hỏi..." className="w-full pl-9 pr-4 py-2 bg-stone-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#C5A059] outline-none" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs text-stone-500 font-medium mb-1 block">Trạng thái:</label>
                                        <div className="relative">
                                            <select className="w-full appearance-none bg-stone-100 border-none rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[#C5A059] cursor-pointer">
                                                <option>Tất cả</option>
                                                <option>Chưa trả lời</option>
                                                <option>Đã trả lời</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-stone-500 font-medium mb-1 block">Sắp xếp theo:</label>
                                        <div className="relative">
                                            <select className="w-full appearance-none bg-stone-100 border-none rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[#C5A059] cursor-pointer">
                                                <option>Mới nhất</option>
                                                <option>Cũ nhất</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400">
                                <HelpCircle size={48} className="mb-4 text-stone-200" strokeWidth={1} />
                                <p className="text-sm">Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!</p>
                                <button className="mt-4 px-5 py-2 bg-stone-100 text-stone-700 text-sm font-bold rounded-lg hover:bg-stone-200 transition-colors">
                                    Đặt câu hỏi
                                </button>
                            </div>
                        </div>

                    </div>
                    
                    {/* Right Column (Sidebar) */}
                    <div className="w-full lg:w-80 flex flex-col gap-6">
                        
                        {/* Streak Box */}
                        <div className="bg-gradient-to-br from-[#1a1a1a] to-stone-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                            {/* Decorative blur */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
                            
                            <div className="flex flex-col items-center mb-6 relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-b from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
                                    <Flame size={32} className="text-white fill-white" />
                                </div>
                                <h2 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-yellow-200">
                                    5 Ngày
                                </h2>
                                <p className="text-sm text-stone-400 font-medium">🔥 Bắt đầu</p>
                            </div>
                            
                            <button className="w-full py-2.5 bg-[#C5A059] hover:bg-[#b08d4b] text-white rounded-xl text-sm font-bold transition-all shadow-sm mb-6 relative z-10">
                                📅 Học hôm nay để giữ chuỗi của bạn
                            </button>
                            
                            <div className="flex justify-between text-xs text-stone-400 font-medium mb-2 relative z-10">
                                <span>Cột mốc tiếp theo</span>
                                <span>5 / 7 ngày</span>
                            </div>
                            <div className="w-full h-2 bg-stone-800 rounded-full mb-6 overflow-hidden relative z-10">
                                <div className="h-full bg-gradient-to-r from-orange-400 to-[#C5A059] rounded-full" style={{ width: '71%' }}></div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 border-t border-stone-800 pt-4 relative z-10">
                                <div>
                                    <p className="text-xs text-stone-400 mb-1 flex items-center gap-1"><Trophy size={12}/> Dài nhất</p>
                                    <p className="text-lg font-bold text-[#C5A059]">5 ngày</p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 mb-1 flex items-center gap-1"><Target size={12}/> Tổng XP</p>
                                    <p className="text-lg font-bold text-blue-400">2,461</p>
                                </div>
                            </div>
                            
                            <div className="mt-4 p-3 bg-stone-800/50 rounded-lg text-xs text-center text-stone-300 border border-stone-700/50 relative z-10 italic">
                                Khởi đầu tuyệt vời! Tiếp tục học để xây dựng chuỗi của bạn!
                            </div>
                        </div>

                        {/* Activity Goal */}
                        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                            <h3 className="font-bold text-stone-800 flex items-center gap-2 mb-4">
                                <Trophy size={18} className="text-[#C5A059]" /> Mục tiêu đang hoạt động
                            </h3>
                            <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                                <Calendar size={32} className="text-stone-300 mb-2" />
                                <p className="text-sm font-bold text-stone-600 mb-1">Chưa có mục tiêu đang hoạt động</p>
                                <p className="text-xs text-stone-500">Quản trị viên nhóm có thể tạo mục tiêu để thúc đẩy nhóm!</p>
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                                <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                    <Trophy size={18} className="text-[#C5A059]" /> Bảng xếp hạng tuần
                                </h3>
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase">Tuần này</span>
                            </div>
                            
                            <div className="p-4 bg-stone-50/50 border-b border-stone-100 grid grid-cols-3 gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
                                <div>Thành viên</div>
                                <div className="text-center">Thời gian</div>
                                <div className="text-right">Tổng XP</div>
                            </div>
                            
                            <div className="divide-y divide-stone-100">
                                {mockLeaderboard.map((user, idx) => (
                                    <div key={user.id} className={`p-4 flex items-center gap-3 ${idx === 0 ? 'bg-yellow-50/30' : 'hover:bg-stone-50'} transition-colors`}>
                                        <div className="w-5 font-bold text-sm text-center text-stone-400">
                                            {idx === 0 ? <Trophy size={16} className="text-[#C5A059] mx-auto" /> : `#${user.rank}`}
                                        </div>
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            <Image src={user.avatar} alt={user.name} fill className="rounded-full bg-white border border-stone-200" />
                                            {idx === 0 && <div className="absolute -top-1 -right-1 bg-[#C5A059] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">1</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-stone-800 text-sm truncate flex items-center gap-1">
                                                {user.name}
                                                {idx === 0 && <span className="bg-[#C5A059] text-white text-[8px] uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"><Flame size={8}/> Dẫn đầu</span>}
                                            </p>
                                            <p className="text-xs text-stone-500 flex items-center gap-3 mt-0.5">
                                                <span className="flex items-center gap-1"><Target size={10}/> {user.pomodoros} pomo</span>
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                                            <span className="text-sm font-bold text-[#C5A059]">{user.xp} XP</span>
                                            <span className="text-xs text-stone-400 flex items-center gap-1"><Clock size={10}/> {user.minutes}p</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
