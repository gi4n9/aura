'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Users, ShieldCheck, BookOpen, Loader2 } from 'lucide-react';
import { joinGroup, leaveGroup } from '@/app/actions/community-actions';
import LoginModal from '../auth/LoginModal';
import RegisterModal from '../auth/RegisterModal';
import { useTheme } from '@/lib/theme/ThemeContext';

export default function GroupCard({ group, isMine, currentUserId }: { group: any, isMine: boolean, currentUserId: string | null }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [loading, setLoading] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

    const handleJoinGroup = async () => {
        if (!currentUserId) {
            setIsLoginModalOpen(true);
            return;
        }

        setLoading(true);
        const result = await joinGroup(group.id);
        setLoading(false);

        if (result.success) {
            router.push(`/community/${group.id}`);
        } else {
            alert(result.error);
        }
    };

    const handleLeaveGroup = () => {
        if (!currentUserId) return;
        setIsLeaveModalOpen(true);
    };

    const handleConfirmLeave = async () => {
        if (!currentUserId) return;
        setLoading(true);
        const result = await leaveGroup(group.id);
        setLoading(false);

        if (result.success) {
            setIsLeaveModalOpen(false);
            router.refresh();
        } else {
            alert(result.error);
        }
    };

    return (
        <>
            <div className={`border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full relative group/card ${
                isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-stone-200"
            }`}>
                {/* Header */}
                <div className="flex gap-4 mb-4">
                    <div className="relative w-12 h-12 flex-shrink-0">
                        <Image 
                            src={group.avatar} 
                            alt={group.name} 
                            fill 
                            className={`rounded-full object-cover shadow-sm border ${isDark ? "border-white/10" : "border-stone-100"}`}
                        />
                    </div>
                    <div>
                        <h3 className={`font-bold leading-tight mb-1 line-clamp-2 group-hover/card:text-[#C5A059] transition-colors ${
                            isDark ? "text-white" : "text-stone-800"
                        }`}>
                            {group.name}
                        </h3>
                        <p className={`text-xs flex items-center gap-1 ${isDark ? "text-stone-500" : "text-stone-500"}`}>
                            <Users size={12} /> {group.membersCount} / {group.maxMembers} thành viên
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="mb-4 flex gap-2">
                    {isMine ? (
                        <>
                            <Link href={`/community/${group.id}`} className={`flex-1 text-center px-4 py-1.5 text-white text-xs font-bold rounded hover:opacity-90 transition-colors flex items-center justify-center ${
                                isDark ? "bg-white/10" : "bg-stone-800 hover:bg-stone-700"
                            }`}>
                                Mở trò chuyện
                            </Link>
                            <button 
                                onClick={handleLeaveGroup}
                                disabled={loading}
                                className={`px-4 py-1.5 border text-red-500 text-xs font-bold rounded transition-colors flex items-center justify-center gap-2 ${
                                    isDark
                                        ? loading ? 'opacity-50 cursor-not-allowed bg-red-500/10 border-red-500/20' : 'border-red-500/20 hover:bg-red-500/10'
                                        : loading ? 'opacity-50 cursor-not-allowed bg-red-50 border-red-200' : 'border-red-200 hover:bg-red-50'
                                }`}
                            >
                                {loading && <Loader2 size={12} className="animate-spin" />}
                                Rời nhóm
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleJoinGroup}
                            disabled={loading || group.membersCount >= group.maxMembers}
                            className={`flex-1 px-4 py-1.5 text-white text-xs font-bold rounded transition-colors shadow-sm flex items-center justify-center gap-2 ${loading || group.membersCount >= group.maxMembers ? 'bg-stone-300' : 'bg-[#C5A059] hover:bg-[#b08d4b]'}`}
                        >
                            {loading && <Loader2 size={12} className="animate-spin" />}
                            {group.membersCount >= group.maxMembers ? 'Nhóm đã đầy' : 'Tham gia nhóm'}
                        </button>
                    )}
                </div>

                {/* Description */}
                <div className={`text-sm mb-6 flex-1 line-clamp-4 whitespace-pre-wrap ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                    {group.description}
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between mt-auto pt-4 border-t ${isDark ? "border-white/10" : "border-stone-100"}`}>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-wider max-w-[70%] truncate ${
                        isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-700"
                    }`}>
                        <BookOpen size={12} className="flex-shrink-0" />
                        <span className="truncate">{group.courseName}</span>
                    </div>
                    {group.isPublic && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                            isDark ? "text-green-400" : "text-green-600"
                        }`}>
                            <ShieldCheck size={12} /> Công khai
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            
            {/* Leave Group Modal */}
            {isLeaveModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`rounded-2xl w-full max-w-sm p-6 shadow-xl relative animate-in zoom-in-95 duration-200 ${
                        isDark ? "bg-[#0e0e0e] border border-white/10" : "bg-white"
                    }`}>
                        <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-stone-800"}`}>Xác nhận rời nhóm</h3>
                        <p className={`text-sm mb-6 ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                            Bạn có chắc chắn muốn rời nhóm <b className={isDark ? "text-white" : "text-stone-800"}>{group.name}</b> không? Bạn sẽ không thể gửi tin nhắn hay tham gia các hoạt động trong nhóm này nữa.
                        </p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsLeaveModalOpen(false)}
                                disabled={loading}
                                className={`flex-1 py-2 font-bold text-sm rounded-xl transition-colors ${
                                    isDark ? "bg-white/5 text-stone-300 hover:bg-white/10" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                                }`}
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleConfirmLeave}
                                disabled={loading}
                                className={`flex-1 py-2 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors ${loading ? 'bg-red-300' : 'bg-red-500 hover:bg-red-600'}`}
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Rời nhóm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)}
                onSwitchToRegister={() => {
                    setIsLoginModalOpen(false);
                    setIsRegisterModalOpen(true);
                }}
            />
            <RegisterModal 
                isOpen={isRegisterModalOpen} 
                onClose={() => setIsRegisterModalOpen(false)}
                onSwitchToLogin={() => {
                    setIsRegisterModalOpen(false);
                    setIsLoginModalOpen(true);
                }}
            />
        </>
    );
}
