"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, ShieldCheck, Search, HelpCircle, Flame, Trophy, Clock, Target, Calendar, ChevronDown, Plus, Lock, Loader2, UserCheck } from 'lucide-react';
import Image from 'next/image';
import GroupChatBox from '@/app/components/chat/GroupChatBox';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { joinGroup } from '@/app/actions/community-actions';

interface GroupDetailClientProps {
    group: {
        id: string;
        name: string | null;
        avatarUrl: string | null;
        isPublic: boolean;
        maxMembers: number;
        _count: {
            participants: number;
        };
    };
    currentUserId?: string | null;
    isParticipant?: boolean;
    userRole?: string | null;
}

const mockLeaderboard = [
    { id: 1, name: 'Đoàn Quang Hưng', pomodoros: 0, minutes: 0, xp: 0, rank: 1, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hung' },
    { id: 2, name: 'Lan Anh', pomodoros: 0, minutes: 0, xp: 0, rank: 2, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lananh' },
    { id: 3, name: 'Huu Nghia Pham', pomodoros: 0, minutes: 0, xp: 0, rank: 3, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nghia' },
    { id: 4, name: 'huynhhainguyen0706_f...', pomodoros: 0, minutes: 0, xp: 0, rank: 4, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nguyen' },
];

export default function GroupDetailClient({ group, currentUserId, isParticipant = false, userRole }: GroupDetailClientProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [isJoined, setIsJoined] = useState(isParticipant);
    const [joining, setJoining] = useState(false);

    const handleJoinGroup = async () => {
        if (!currentUserId) {
            router.push(`/login?redirectTo=/community/${group.id}`);
            return;
        }

        setJoining(true);
        const res = await joinGroup(group.id);
        setJoining(false);

        if (res.success) {
            setIsJoined(true);
            router.refresh();
        } else {
            alert(res.error || "Không thể tham gia nhóm");
        }
    };

    return (
        <div className={`min-h-screen pt-24 pb-12 transition-colors duration-500 ${isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"}`}>
            <div className="container mx-auto px-4 max-w-7xl">

                {/* Header Navigation */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/community"
                            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-colors shadow-sm ${
                                isDark ? "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10 hover:text-white" : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                            }`}
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-sm border ${
                            isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200"
                        }`}>
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
                                <h1 className={`font-bold text-sm leading-tight ${isDark ? "text-white" : "text-stone-800"}`}>
                                    {group.name || t("community.unnamedGroup", "Group không tên")}
                                </h1>
                                <div className={`flex items-center gap-2 text-xs mt-0.5 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                    <span className="flex items-center gap-1">
                                        <Users size={12} /> {group._count.participants} / {group.maxMembers} {t("community.members", "thành viên")}
                                    </span>
                                </div>
                            </div>
                            <div className={`ml-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                                group.isPublic
                                    ? isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600"
                                    : isDark ? "bg-stone-800 text-stone-400" : "bg-stone-100 text-stone-500"
                            }`}>
                                {group.isPublic ? (
                                    <><ShieldCheck size={12} /> {t("community.public", "Công khai")}</>
                                ) : (
                                    <><ShieldCheck size={12} className="text-stone-500" /> {t("community.private", "Riêng tư")}</>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Role & Join Status Button */}
                    <div className="flex items-center gap-3">
                        {isJoined ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 rounded-full text-xs font-bold shadow-sm">
                                <UserCheck size={14} />
                                <span>Đã tham gia ({userRole || 'MEMBER'})</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleJoinGroup}
                                disabled={joining}
                                className="flex items-center gap-2 px-5 py-2 bg-[#C5A059] hover:bg-[#b08d4b] text-white rounded-full text-xs font-bold transition-all shadow-md disabled:opacity-50"
                            >
                                {joining ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                <span>Tham gia nhóm ngay</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left Column (Chat & Q&A) */}
                    <div className="flex-1 flex flex-col gap-6">

                        {!isJoined && !group.isPublic ? (
                            <div className={`rounded-2xl border p-10 flex flex-col items-center justify-center text-center shadow-sm ${
                                isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-stone-200"
                            }`}>
                                <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-400 mb-4">
                                    <Lock size={32} />
                                </div>
                                <h3 className="text-lg font-bold mb-2">Nhóm này là Nhóm riêng tư</h3>
                                <p className="text-sm text-stone-500 max-w-md mb-6">
                                    Bạn chưa phải là thành viên của nhóm này. Vui lòng bấm vào nút "Tham gia nhóm" bên dưới để đăng ký thành viên và bắt đầu tham gia thảo luận.
                                </p>
                                <button
                                    onClick={handleJoinGroup}
                                    disabled={joining}
                                    className="px-6 py-2.5 bg-[#C5A059] hover:bg-[#b08d4b] text-white font-bold rounded-full text-sm transition-all shadow-md flex items-center gap-2"
                                >
                                    {joining && <Loader2 size={16} className="animate-spin" />}
                                    <span>Tham gia nhóm</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                {!isJoined && (
                                    <div className="p-3 px-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center justify-between">
                                        <span>💡 Bạn chưa là thành viên chính thức. Hãy tham gia nhóm để gửi tin nhắn và theo dõi tiến độ học tập cùng nhóm.</span>
                                        <button
                                            onClick={handleJoinGroup}
                                            className="px-3 py-1 bg-[#C5A059] text-white rounded-lg font-bold hover:bg-[#b08d4b] transition-colors ml-3 shrink-0"
                                        >
                                            Tham gia ngay
                                        </button>
                                    </div>
                                )}
                                <GroupChatBox groupId={group.id} />
                            </>
                        )}

                        {/* Q&A Box */}
                        <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[400px] ${
                            isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-stone-200"
                        }`}>
                            <div className={`p-4 border-b flex items-center justify-between ${
                                isDark ? "border-white/10 bg-white/[0.02]" : "border-stone-100 bg-stone-50/50"
                            }`}>
                                <div className={`font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-stone-800"}`}>
                                    <HelpCircle size={18} className="text-[#C5A059]" /> {t("community.qna", "Hỏi & Đáp")}
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? "bg-white/10 text-stone-300" : "bg-stone-200 text-stone-600"}`}>0</span>
                                </div>
                                <button className="px-4 py-1.5 bg-[#C5A059] text-white text-xs font-bold rounded-lg hover:bg-[#b08d4b] transition-colors shadow-sm flex items-center gap-1">
                                    <Plus size={14} /> {t("community.askQuestion", "Đặt câu hỏi")}
                                </button>
                            </div>

                            <div className={`p-4 border-b ${isDark ? "border-white/10" : "border-stone-100"}`}>
                                <div className="relative mb-4">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="text"
                                        placeholder={t("community.searchQuestions", "Tìm kiếm câu hỏi...")}
                                        className={`w-full pl-9 pr-4 py-2 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#C5A059] outline-none ${
                                            isDark ? "bg-white/5 text-white placeholder-stone-500" : "bg-stone-100 text-stone-900 placeholder-stone-400"
                                        }`}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className={`text-xs font-medium mb-1 block ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                            {t("community.status", "Trạng thái:")}
                                        </label>
                                        <div className="relative">
                                            <select className={`w-full appearance-none border-none rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[#C5A059] cursor-pointer ${
                                                isDark ? "bg-white/5 text-white" : "bg-stone-100 text-stone-900"
                                            }`}>
                                                <option className={isDark ? "bg-stone-900 text-white" : ""}>{t("common.all", "Tất cả")}</option>
                                                <option className={isDark ? "bg-stone-900 text-white" : ""}>{t("community.unanswered", "Chưa trả lời")}</option>
                                                <option className={isDark ? "bg-stone-900 text-white" : ""}>{t("community.answered", "Đã trả lời")}</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className={`text-xs font-medium mb-1 block ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                            {t("community.sortBy", "Sắp xếp theo:")}
                                        </label>
                                        <div className="relative">
                                            <select className={`w-full appearance-none border-none rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[#C5A059] cursor-pointer ${
                                                isDark ? "bg-white/5 text-white" : "bg-stone-100 text-stone-900"
                                            }`}>
                                                <option className={isDark ? "bg-stone-900 text-white" : ""}>{t("community.newest", "Mới nhất")}</option>
                                                <option className={isDark ? "bg-stone-900 text-white" : ""}>{t("community.oldest", "Cũ nhất")}</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400">
                                <HelpCircle size={48} className={`mb-4 ${isDark ? "text-stone-700" : "text-stone-200"}`} strokeWidth={1} />
                                <p className={`text-sm ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                    {t("community.noQuestionsYet", "Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!")}
                                </p>
                                <button className={`mt-4 px-5 py-2 text-sm font-bold rounded-lg transition-colors ${
                                    isDark ? "bg-white/10 text-stone-200 hover:bg-white/20" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                                }`}>
                                    {t("community.askQuestion", "Đặt câu hỏi")}
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Sidebar) */}
                    <div className="w-full lg:w-80 flex flex-col gap-6">

                        {/* Streak Box */}
                        <div className="bg-gradient-to-br from-[#1a1a1a] to-stone-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-stone-800">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none"></div>

                            <div className="flex flex-col items-center mb-6 relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-b from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
                                    <Flame size={32} className="text-white fill-white" />
                                </div>
                                <h2 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-yellow-200">
                                    5 {t("community.days", "Ngày")}
                                </h2>
                                <p className="text-sm text-stone-400 font-medium">🔥 {t("community.streakStart", "Bắt đầu")}</p>
                            </div>

                            <button className="w-full py-2.5 bg-[#C5A059] hover:bg-[#b08d4b] text-white rounded-xl text-sm font-bold transition-all shadow-sm mb-6 relative z-10">
                                📅 {t("community.learnToday", "Học hôm nay để giữ chuỗi của bạn")}
                            </button>

                            <div className="flex justify-between text-xs text-stone-400 font-medium mb-2 relative z-10">
                                <span>{t("community.nextMilestone", "Cột mốc tiếp theo")}</span>
                                <span>5 / 7 {t("community.days", "ngày")}</span>
                            </div>
                            <div className="w-full h-2 bg-stone-800 rounded-full mb-6 overflow-hidden relative z-10">
                                <div className="h-full bg-gradient-to-r from-orange-400 to-[#C5A059] rounded-full" style={{ width: '71%' }}></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-stone-800 pt-4 relative z-10">
                                <div>
                                    <p className="text-xs text-stone-400 mb-1 flex items-center gap-1"><Trophy size={12}/> {t("community.longest", "Dài nhất")}</p>
                                    <p className="text-lg font-bold text-[#C5A059]">5 {t("community.days", "ngày")}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-400 mb-1 flex items-center gap-1"><Target size={12}/> {t("community.totalXp", "Tổng XP")}</p>
                                    <p className="text-lg font-bold text-blue-400">2,461</p>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-stone-800/50 rounded-lg text-xs text-center text-stone-300 border border-stone-700/50 relative z-10 italic">
                                {t("community.streakTip", "Khởi đầu tuyệt vời! Tiếp tục học để xây dựng chuỗi của bạn!")}
                            </div>
                        </div>

                        {/* Activity Goal */}
                        <div className={`rounded-2xl border p-6 shadow-sm ${
                            isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-stone-200"
                        }`}>
                            <h3 className={`font-bold flex items-center gap-2 mb-4 ${isDark ? "text-white" : "text-stone-800"}`}>
                                <Trophy size={18} className="text-[#C5A059]" /> {t("community.activeGoals", "Mục tiêu đang hoạt động")}
                            </h3>
                            <div className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center ${
                                isDark ? "bg-white/[0.02] border-white/10 text-stone-400" : "bg-stone-50 border-stone-300 text-stone-600"
                            }`}>
                                <Calendar size={32} className={`mb-2 ${isDark ? "text-stone-600" : "text-stone-300"}`} />
                                <p className="text-sm font-bold mb-1">{t("community.noActiveGoal", "Chưa có mục tiêu đang hoạt động")}</p>
                                <p className="text-xs text-stone-500">{t("community.goalTip", "Quản trị viên nhóm có thể tạo mục tiêu để thúc đẩy nhóm!")}</p>
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div className={`rounded-2xl border shadow-sm overflow-hidden ${
                            isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-stone-200"
                        }`}>
                            <div className={`p-4 border-b flex items-center justify-between ${
                                isDark ? "border-white/10" : "border-stone-100"
                            }`}>
                                <h3 className={`font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-stone-800"}`}>
                                    <Trophy size={18} className="text-[#C5A059]" /> {t("community.leaderboard", "Bảng xếp hạng tuần")}
                                </h3>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                                    isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                                }`}>{t("community.thisWeek", "Tuần này")}</span>
                            </div>

                            <div className={`p-4 border-b grid grid-cols-3 gap-2 text-xs font-bold uppercase tracking-wider ${
                                isDark ? "bg-white/[0.02] border-white/10 text-stone-400" : "bg-stone-50/50 border-stone-100 text-stone-500"
                            }`}>
                                <div>{t("community.member", "Thành viên")}</div>
                                <div className="text-center">{t("community.time", "Thời gian")}</div>
                                <div className="text-right">{t("community.totalXp", "Tổng XP")}</div>
                            </div>

                            <div className={`divide-y ${isDark ? "divide-white/10" : "divide-stone-100"}`}>
                                {mockLeaderboard.map((user, idx) => (
                                    <div key={user.id} className={`p-4 flex items-center gap-3 transition-colors ${
                                        idx === 0
                                            ? isDark ? 'bg-amber-500/10' : 'bg-yellow-50/30'
                                            : isDark ? 'hover:bg-white/5' : 'hover:bg-stone-50'
                                    }`}>
                                        <div className="w-5 font-bold text-sm text-center text-stone-400">
                                            {idx === 0 ? <Trophy size={16} className="text-[#C5A059] mx-auto" /> : `#${user.rank}`}
                                        </div>
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            <Image src={user.avatar} alt={user.name} fill className={`rounded-full border object-cover ${isDark ? "border-white/10" : "border-stone-200"}`} />
                                            {idx === 0 && <div className="absolute -top-1 -right-1 bg-[#C5A059] w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">1</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm truncate flex items-center gap-1 ${isDark ? "text-white" : "text-stone-800"}`}>
                                                {user.name}
                                                {idx === 0 && <span className="bg-[#C5A059] text-white text-[8px] uppercase px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"><Flame size={8}/> {t("community.leader", "Dẫn đầu")}</span>}
                                            </p>
                                            <p className={`text-xs flex items-center gap-3 mt-0.5 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
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
