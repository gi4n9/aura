"use client";

import { useState } from "react";
import { Mail, Check, X, Loader2, Users, BookOpen, Plus, MessageSquare } from "lucide-react";
import Image from "next/image";
import { respondToInvitation } from "@/app/actions/community-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import InstructorMessagesInterface from "@/app/components/chat/InstructorMessagesInterface";
import CreateGroupModal from "@/app/components/community/CreateGroupModal";
import { format } from "date-fns";

interface InstructorMessagesClientProps {
    conversations: any[];
    currentUserId: string;
    invitations: any[];
    instructorCourses: { id: string; title: string; thumbnailUrl: string | null }[];
}

export default function InstructorMessagesClient({
    conversations,
    currentUserId,
    invitations: initialInvitations,
    instructorCourses
}: InstructorMessagesClientProps) {
    const router = useRouter();
    const [invitations, setInvitations] = useState(initialInvitations);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"chat" | "invitations">("chat");

    const handleRespond = async (invitationId: string, accept: boolean) => {
        setProcessingId(invitationId);
        const result = await respondToInvitation(invitationId, accept);
        setProcessingId(null);

        if (result.success) {
            toast.success(accept ? "Đã chấp nhận lời mời!" : "Đã từ chối lời mời.");
            setInvitations(prev => prev.filter(i => i.id !== invitationId));
            if (accept) {
                router.refresh();
            }
        } else {
            toast.error(result.error || "Có lỗi xảy ra");
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-serif text-stone-800">Tin nhắn & Hỗ trợ</h1>
                <div className="flex items-center gap-3">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                activeTab === "chat"
                                    ? "bg-white text-stone-900 shadow-sm"
                                    : "text-stone-500 hover:text-stone-700"
                            }`}
                        >
                            <MessageSquare size={14} />
                            Tin nhắn
                        </button>
                        <button
                            onClick={() => setActiveTab("invitations")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors relative ${
                                activeTab === "invitations"
                                    ? "bg-white text-stone-900 shadow-sm"
                                    : "text-stone-500 hover:text-stone-700"
                            }`}
                        >
                            <Mail size={14} />
                            Lời mời
                            {invitations.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                                    {invitations.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Nút Tạo nhóm */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-[#C5A059] rounded-lg font-bold text-xs hover:bg-stone-800 transition-colors shadow-sm"
                    >
                        <Plus size={14} />
                        Tạo nhóm
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === "chat" ? (
                <div className="w-full">
                    <InstructorMessagesInterface
                        initialConversations={conversations}
                        currentUserId={currentUserId}
                    />
                </div>
            ) : (
                /* Invitations Tab */
                <div className="w-full">
                    {invitations.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                                <Mail size={28} />
                            </div>
                            <h3 className="font-serif font-bold text-lg text-stone-800 mb-1">Không có lời mời nào</h3>
                            <p className="text-sm text-stone-500">Khi học viên mời bạn vào nhóm chat, lời mời sẽ hiển thị ở đây.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {invitations.map(inv => (
                                <div key={inv.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4">
                                        {/* Group Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center flex-shrink-0 border border-[#C5A059]/20">
                                            {inv.groupAvatar ? (
                                                <Image src={inv.groupAvatar} alt={inv.groupName} width={48} height={48} className="rounded-full object-cover" />
                                            ) : (
                                                <Users size={20} className="text-[#C5A059]" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-stone-900 mb-0.5">{inv.groupName}</h4>
                                            <p className="text-xs text-stone-500 mb-2 line-clamp-2">{inv.groupDescription || "Không có mô tả"}</p>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mb-3">
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} /> {inv.membersCount} thành viên
                                                </span>
                                                {inv.courses.length > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <BookOpen size={12} /> {inv.courses.join(", ")}
                                                    </span>
                                                )}
                                                <span>Mời bởi: <b className="text-stone-700">{inv.inviter.name}</b></span>
                                                <span className="font-mono">{format(new Date(inv.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRespond(inv.id, true)}
                                                    disabled={processingId === inv.id}
                                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                >
                                                    {processingId === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                                    Chấp nhận
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(inv.id, false)}
                                                    disabled={processingId === inv.id}
                                                    className="flex items-center gap-1.5 px-4 py-1.5 border border-stone-300 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
                                                >
                                                    <X size={14} />
                                                    Từ chối
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create Group Modal (dùng chung CreateGroupModal nhưng ở chế độ Instructor) */}
            <CreateGroupModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                enrolledCourses={instructorCourses}
                isInstructor={true}
            />
        </div>
    );
}
