"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MessageSquare, ThumbsUp, CheckCircle, PlusCircle, Filter, Send, X, HelpCircle, Sparkles } from "lucide-react";
import { createQuestion, answerQuestion, toggleVoteQuestion, markAnswerAccepted } from "@/app/actions/qa-actions";
import { AVATAR_FRAMES } from "@/lib/gamification";
import UserProfileHoverCard from "@/app/components/community/UserProfileHoverCard";

interface QuestionItem {
    id: string;
    title: string;
    content: string;
    isResolved: boolean;
    upvotesCount: number;
    createdAt: Date | string;
    authorId: string;
    author: {
        id: string;
        fullName?: string | null;
        avatarUrl?: string | null;
        userStats?: {
            level: number;
            equippedFrame: string;
            equippedTitle: string;
        } | null;
    };
    answers: {
        id: string;
        content: string;
        isAccepted: boolean;
        createdAt: Date | string;
        authorId: string;
        author: {
            id: string;
            fullName?: string | null;
            avatarUrl?: string | null;
            userStats?: {
                level: number;
                equippedFrame: string;
                equippedTitle: string;
            } | null;
        };
    }[];
    upvotes: { userId: string }[];
}

interface QAForumViewProps {
    questions: QuestionItem[];
    currentUserId?: string;
    isDark?: boolean;
}

export default function QAForumView({
    questions: initialQuestions,
    currentUserId,
    isDark = true
}: QAForumViewProps) {
    const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
    const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
    const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});

    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) return;

        setSubmitting(true);
        const res = await createQuestion(newTitle, newContent);
        if (res.success) {
            setNewTitle("");
            setNewContent("");
            setShowCreateModal(false);
            window.location.reload();
        } else {
            alert(res.error || "Không thể tạo câu hỏi");
        }
        setSubmitting(false);
    };

    const handleVote = async (questionId: string) => {
        if (!currentUserId) return alert("Vui lòng đăng nhập");

        setQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                const hasVoted = q.upvotes?.some(v => v.userId === currentUserId);
                const newUpvotes = hasVoted
                    ? q.upvotes.filter(v => v.userId !== currentUserId)
                    : [...(q.upvotes || []), { userId: currentUserId }];
                return {
                    ...q,
                    upvotesCount: hasVoted ? q.upvotesCount - 1 : q.upvotesCount + 1,
                    upvotes: newUpvotes
                };
            }
            return q;
        }));

        await toggleVoteQuestion(questionId);
    };

    const handleAnswerSubmit = async (questionId: string) => {
        const content = answerText[questionId];
        if (!content || !content.trim()) return;

        const res = await answerQuestion(questionId, content);
        if (res.success) {
            setAnswerText(prev => ({ ...prev, [questionId]: "" }));
            window.location.reload();
        } else {
            alert(res.error || "Không thể gửi câu trả lời");
        }
    };

    const handleAcceptAnswer = async (answerId: string, questionId: string) => {
        const res = await markAnswerAccepted(answerId, questionId);
        if (res.success) {
            window.location.reload();
        } else {
            alert(res.error || "Không thể đánh dấu câu trả lời đúng");
        }
    };

    const getFrameStyle = (frameId?: string) => {
        const frame = AVATAR_FRAMES.find(f => f.id === frameId);
        return frame ? frame.previewStyle : "border-2 border-stone-400";
    };

    const filteredQuestions = questions.filter(q => {
        if (filter === 'resolved') return q.isResolved;
        if (filter === 'unresolved') return !q.isResolved;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header & New Question Trigger */}
            <div className={`p-6 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDark ? "bg-[#0e0e0e] border-white/10 text-white shadow-2xl" : "bg-white border-stone-200 text-stone-900 shadow-md"
            }`}>
                <div>
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
                        <HelpCircle className="text-[#C5A059]" size={26} />
                        Diễn Đàn Hỏi Đáp Cộng Đồng
                    </h2>
                    <p className={`text-xs mt-1 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                        Đặt câu hỏi kiến thức, thảo luận và nhận phản hồi từ các bạn học viên & giảng viên
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-5 py-3 rounded-2xl bg-[#C5A059] text-[#080808] font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#b59049] transition-all shadow-lg shadow-[#C5A059]/20 cursor-pointer"
                >
                    <PlusCircle size={16} /> Đặt Câu Hỏi Mới
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <Filter size={16} className="text-[#C5A059] mr-2" />
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        filter === 'all'
                            ? "bg-[#C5A059] text-[#080808]"
                            : isDark ? "text-stone-400 hover:text-white" : "text-stone-600 hover:text-stone-900"
                    }`}
                >
                    Tất cả ({questions.length})
                </button>
                <button
                    onClick={() => setFilter('unresolved')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        filter === 'unresolved'
                            ? "bg-amber-500 text-slate-950"
                            : isDark ? "text-stone-400 hover:text-white" : "text-stone-600 hover:text-stone-900"
                    }`}
                >
                    Chưa giải quyết ({questions.filter(q => !q.isResolved).length})
                </button>
                <button
                    onClick={() => setFilter('resolved')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        filter === 'resolved'
                            ? "bg-emerald-500 text-slate-950"
                            : isDark ? "text-stone-400 hover:text-white" : "text-stone-600 hover:text-stone-900"
                    }`}
                >
                    Đã giải quyết ({questions.filter(q => q.isResolved).length})
                </button>
            </div>

            {/* QUESTION LIST */}
            <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                    <div className={`p-12 text-center rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-stone-400" : "bg-white border-stone-200 text-stone-500"}`}>
                        <HelpCircle size={48} className="mx-auto mb-3 text-stone-600 opacity-40" />
                        <p className="text-sm font-medium">Chưa có câu hỏi nào trong mục này.</p>
                        <p className="text-xs text-stone-500 mt-1">Hãy là người đầu tiên đặt câu hỏi cho cộng đồng!</p>
                    </div>
                ) : (
                    filteredQuestions.map((q) => {
                        const hasVoted = q.upvotes?.some(v => v.userId === currentUserId);
                        const isExpanded = expandedQuestionId === q.id;
                        const authorName = q.author?.fullName || "Học viên Aura";
                        const authorStats = q.author?.userStats;

                        return (
                            <div
                                key={q.id}
                                className={`p-6 rounded-3xl border transition-all ${
                                    isDark ? "bg-[#0e0e0e] border-white/10 text-white shadow-xl" : "bg-white border-stone-200 text-stone-900 shadow-sm"
                                }`}
                            >
                                {/* Header (Author & Status) */}
                                <div className="flex items-center justify-between mb-4">
                                    <UserProfileHoverCard userId={q.authorId} isDark={isDark} initialSummary={(q as any).authorSummary}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center relative ${getFrameStyle(authorStats?.equippedFrame)}`}>
                                                {q.author?.avatarUrl ? (
                                                    <Image src={q.author.avatarUrl} alt={authorName} fill className="rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-stone-800 text-stone-300 flex items-center justify-center font-bold text-xs">
                                                        {authorName.charAt(0)}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm hover:text-[#C5A059] transition-all">{authorName}</span>
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/5 border border-white/10 text-stone-300">
                                                        Cấp {authorStats?.level || 1}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-[#C5A059] font-medium block">
                                                    {authorStats?.equippedTitle || "Tân binh Aura"}
                                                </span>
                                            </div>
                                        </div>
                                    </UserProfileHoverCard>

                                    {q.isResolved ? (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                            <CheckCircle size={12} /> Đã giải quyết
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            Đang thảo luận
                                        </span>
                                    )}
                                </div>

                                {/* Question Title & Content */}
                                <h3 className="font-serif font-bold text-lg mb-2">{q.title}</h3>
                                <p className={`text-xs leading-relaxed mb-4 ${isDark ? "text-stone-300" : "text-stone-700"}`}>
                                    {q.content}
                                </p>

                                {/* Action Toolbar */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleVote(q.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                                                hasVoted
                                                    ? "bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059] font-bold"
                                                    : isDark ? "bg-white/5 border-white/10 text-stone-400 hover:text-white" : "bg-stone-100 border-stone-200 text-stone-600"
                                            }`}
                                        >
                                            <ThumbsUp size={14} fill={hasVoted ? "currentColor" : "none"} />
                                            <span>{q.upvotesCount} Hữu ích</span>
                                        </button>

                                        <button
                                            onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                                                isExpanded
                                                    ? "bg-white/10 border-white/20 text-white font-bold"
                                                    : isDark ? "bg-white/5 border-white/10 text-stone-400 hover:text-white" : "bg-stone-100 border-stone-200 text-stone-600"
                                            }`}
                                        >
                                            <MessageSquare size={14} />
                                            <span>{q.answers?.length || 0} Câu trả lời</span>
                                        </button>
                                    </div>

                                    <span className="text-[10px] text-stone-500">
                                        {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>

                                {/* EXPANDED ANSWERS THREAD */}
                                {isExpanded && (
                                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                                        <h4 className="font-bold text-xs uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
                                            <MessageSquare size={14} /> Danh sách Câu trả lời ({q.answers?.length || 0})
                                        </h4>

                                        {/* Answer list */}
                                        <div className="space-y-3">
                                            {q.answers?.map((ans) => {
                                                const ansAuthorName = ans.author?.fullName || "Học viên Aura";
                                                const isQuestionAuthor = currentUserId === q.authorId;

                                                return (
                                                    <div
                                                        key={ans.id}
                                                        className={`p-4 rounded-2xl border transition-all ${
                                                            ans.isAccepted
                                                                ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                                                                : isDark ? "bg-white/5 border-white/5" : "bg-stone-50 border-stone-200"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <UserProfileHoverCard userId={ans.authorId} isDark={isDark} initialSummary={(ans as any).authorSummary}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center relative ${getFrameStyle(ans.author?.userStats?.equippedFrame)}`}>
                                                                        {ans.author?.avatarUrl ? (
                                                                            <Image src={ans.author.avatarUrl} alt={ansAuthorName} fill className="rounded-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full rounded-full bg-stone-800 text-stone-300 flex items-center justify-center font-bold text-[10px]">
                                                                                {ansAuthorName.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-bold text-xs hover:text-[#C5A059] transition-all">{ansAuthorName}</span>
                                                                    <span className="text-[10px] text-[#C5A059]">({ans.author?.userStats?.equippedTitle || "Tân binh"})</span>
                                                                </div>
                                                            </UserProfileHoverCard>

                                                            {ans.isAccepted ? (
                                                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500 text-slate-950 flex items-center gap-1">
                                                                    <CheckCircle size={10} /> Câu trả lời đúng chuẩn (+20 XP)
                                                                </span>
                                                            ) : isQuestionAuthor ? (
                                                                <button
                                                                    onClick={() => handleAcceptAnswer(ans.id, q.id)}
                                                                    className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-[#080808] transition-all cursor-pointer"
                                                                >
                                                                    Đánh dấu câu trả lời đúng
                                                                </button>
                                                            ) : null}
                                                        </div>

                                                        <p className="text-xs text-stone-300 leading-relaxed pl-9">
                                                            {ans.content}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Reply Box */}
                                        <div className="flex gap-2 pt-2">
                                            <input
                                                type="text"
                                                placeholder="Viết câu trả lời của bạn..."
                                                value={answerText[q.id] || ""}
                                                onChange={(e) => setAnswerText({ ...answerText, [q.id]: e.target.value })}
                                                className={`flex-1 px-4 py-2.5 rounded-2xl text-xs border outline-none ${
                                                    isDark ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]" : "bg-stone-50 border-stone-200 text-stone-900"
                                                }`}
                                            />
                                            <button
                                                onClick={() => handleAnswerSubmit(q.id)}
                                                className="px-4 py-2.5 rounded-2xl bg-[#C5A059] text-[#080808] font-bold text-xs flex items-center gap-1 hover:bg-[#b59049] transition-all cursor-pointer"
                                            >
                                                <Send size={14} /> Gửi
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* CREATE QUESTION MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl relative ${
                        isDark ? "bg-[#121212] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                    }`}>
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-5 right-5 text-stone-400 hover:text-white transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-serif font-bold flex items-center gap-2 mb-4">
                            <Sparkles className="text-[#C5A059]" size={22} />
                            Tạo Câu Hỏi Mới
                        </h3>

                        <form onSubmit={handleCreateQuestion} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                                    Tiêu đề câu hỏi
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: Làm sao để tối ưu truy vấn Prisma trong Next.js?"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    required
                                    className={`w-full px-4 py-3 rounded-2xl text-xs border outline-none ${
                                        isDark ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]" : "bg-stone-50 border-stone-200 text-stone-900"
                                    }`}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                                    Chi tiết nội dung
                                </label>
                                <textarea
                                    rows={5}
                                    placeholder="Mô tả chi tiết vướng mắc của bạn..."
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    required
                                    className={`w-full px-4 py-3 rounded-2xl text-xs border outline-none ${
                                        isDark ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]" : "bg-stone-50 border-stone-200 text-stone-900"
                                    }`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 rounded-2xl bg-[#C5A059] text-[#080808] font-bold text-xs uppercase tracking-wider hover:bg-[#b59049] transition-all cursor-pointer shadow-lg shadow-[#C5A059]/20"
                            >
                                {submitting ? "Đang gửi..." : "Đăng Câu Hỏi"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
