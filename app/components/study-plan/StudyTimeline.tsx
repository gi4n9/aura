"use client";

import { useState } from "react";
import { format, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { LayoutGrid, Calendar as CalendarIcon, Trophy, CheckCircle2, Star, PlusCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// --- TYPES ---
interface LessonItem {
    id: string;
    title: string;
    type: string;
    courseTitle?: string;
    courseId?: string;
    chapterId?: string;
    isCompleted?: boolean;
    hasQuiz?: boolean;
    quizCompleted?: boolean;
}

interface StudySession {
    id: string;
    index: number;
    date: Date;
    isCompleted: boolean;
    completedAt?: Date;
    score?: string;
    topics: LessonItem[];
}

const getTopicCups = (topic: LessonItem) => {
    if (!topic.isCompleted) return 0;
    if (!topic.hasQuiz) return 2;
    return topic.quizCompleted ? 2 : 1;
};

const getSessionCups = (session: StudySession) => {
    return session.topics.reduce((sum, topic) => sum + getTopicCups(topic), 0);
};

// --- COMPONENTS ---

const SessionCard = ({ session, isDark }: { session: StudySession; isDark: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useLanguage();
    const topics = session.topics;
    const hasManyTopics = topics.length > 2;

    const renderTopic = (topic: LessonItem, idx: number) => (
        <div key={topic.id + idx} className="group/topic">
            {/* CLICKABLE ROW */}
            <Link
                href={topic.courseId && topic.chapterId
                    ? `/courses/${topic.courseId}/lessons/${topic.id}`
                    : "#"}
                className={`flex items-start gap-2 mb-1.5 p-2 rounded-xl transition-all ${
                    isDark ? "hover:bg-white/10" : "hover:bg-stone-100"
                }`}
            >
                <Star size={10} className={`mt-1 shrink-0 ${topic.isCompleted ? "text-emerald-400 fill-emerald-400" : "text-[#C5A059] fill-[#C5A059]"}`} />
                <div className="flex-1">
                    <p className={`text-sm font-medium leading-snug line-clamp-2 transition-colors ${
                        topic.isCompleted
                            ? (isDark ? "text-stone-500 line-through" : "text-stone-400 line-through")
                            : (isDark ? "text-white group-hover/topic:text-[#C5A059]" : "text-stone-800 group-hover/topic:text-[#C5A059]")
                    }`}>
                        {topic.title}
                    </p>
                </div>
                <ExternalLink size={14} className="mt-1 text-stone-400 opacity-0 group-hover/topic:opacity-100 transition-opacity" />
            </Link>

            {/* Tags */}
            <div className="flex gap-2 ml-5">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                    isDark ? "bg-white/10 text-stone-300 border-white/10" : "bg-stone-100 text-stone-600 border-stone-200"
                }`}>
                    {topic.type}
                </span>
                {topic.courseTitle && (
                    <Link
                        href={`/courses/${topic.courseId}`}
                        className="inline-block px-2 py-0.5 bg-[#C5A059]/15 text-[#C5A059] text-[10px] font-bold rounded-md border border-[#C5A059]/30 max-w-[140px] truncate hover:underline"
                    >
                        {topic.courseTitle}
                    </Link>
                )}
            </div>
        </div>
    );

    const sessionCups = getSessionCups(session);

    return (
        <div className={`
            rounded-3xl p-5 transition-all duration-300 flex flex-col h-full overflow-hidden group relative border
            ${isToday(session.date) ? "border-2 border-[#C5A059] shadow-lg shadow-[#C5A059]/20 bg-[#C5A059]/5" : isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-sm"}
        `}>
            {/* Floating Cup Tag */}
            {sessionCups > 0 && (
                <div className="absolute top-4 right-4 w-12 h-12 rounded-2xl bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#C5A059] flex flex-col items-center justify-center shadow-sm z-10 select-none backdrop-blur-md">
                    <div className="flex items-center justify-center gap-0.5 font-black text-xs leading-none">
                        <Trophy size={11} className="fill-[#C5A059]/30" />
                        <span>+{sessionCups}</span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-widest leading-none mt-1 opacity-80">
                        cups
                    </span>
                </div>
            )}

            {/* Header */}
            <div className={`mb-3 flex justify-between items-start ${sessionCups > 0 ? "pr-20" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 ${
                        session.isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-[#C5A059] text-[#080808]"
                    }`}>
                        Buổi {session.index}
                        {session.isCompleted && <CheckCircle2 size={12} fill="white" />}
                    </span>
                    <span className={`text-xs font-bold ${isDark ? "text-stone-300" : "text-stone-700"}`}>
                        {format(session.date, "EEEE, d 'Thg' M", { locale: vi })}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="py-2 flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                    {hasManyTopics && !isExpanded ? (
                        <>
                            {(() => {
                                const firstIncompleteIdx = topics.findIndex(t => !t.isCompleted);
                                const currentIdx = firstIncompleteIdx !== -1 ? firstIncompleteIdx : topics.length - 1;
                                const completedCount = topics.filter(t => t.isCompleted).length;
                                const remainingCount = topics.length - currentIdx - 1;

                                return (
                                    <>
                                        {completedCount > 0 && (
                                            <button
                                                onClick={() => setIsExpanded(true)}
                                                className={`w-full text-left text-[11px] font-bold px-3 py-2 rounded-xl flex items-center justify-between transition-colors mb-1 ${
                                                    isDark ? "bg-white/10 text-stone-300 hover:bg-white/15" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                                                }`}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                    Đã hoàn thành {completedCount}/{topics.length} bài
                                                </span>
                                                <span className="text-[10px] underline text-[#C5A059]">Mở rộng</span>
                                            </button>
                                        )}

                                        {renderTopic(topics[currentIdx], currentIdx)}

                                        {remainingCount > 0 && (
                                            <div className="flex items-center gap-2 pl-4 py-1">
                                                <button
                                                    onClick={() => setIsExpanded(true)}
                                                    className="text-[11px] font-semibold text-stone-400 hover:text-[#C5A059] transition-colors"
                                                >
                                                    + {remainingCount} bài tiếp theo (nhấp để xem)
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </>
                    ) : (
                        <>
                            {topics.map((topic, idx) => renderTopic(topic, idx))}
                        </>
                    )}
                </div>

                {hasManyTopics && isExpanded && (
                    <div className="mt-3 pt-2 border-t border-stone-500/20 flex justify-end">
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-xs font-bold text-[#C5A059] hover:underline"
                        >
                            Thu gọn
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="pt-3 mt-auto border-t border-stone-500/20">
                {session.isCompleted ? (
                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Đã hoàn thành
                    </p>
                ) : (
                    <p className={`text-xs font-medium italic ${
                        isToday(session.date) ? "text-[#C5A059] font-bold" : "text-stone-400"
                    }`}>
                        {isToday(session.date) ? "Đến giờ học rồi! 🚀" : "Chưa hoàn thành"}
                    </p>
                )}
            </div>
        </div>
    );
};

export default function StudyTimeline({ initialSchedule }: { initialSchedule: any }) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // --- TRANSFORM DATA ---
    let sessions: StudySession[] = [];

    if (initialSchedule && initialSchedule.items) {
        const itemsByDate: { [key: string]: any[] } = {};

        initialSchedule.items.forEach((item: any) => {
            const dateKey = format(new Date(item.scheduledAt), "yyyy-MM-dd");
            if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
            itemsByDate[dateKey].push(item);
        });

        const sortedDates = Object.keys(itemsByDate).sort();

        sessions = sortedDates.map((dateStr, idx) => {
            const dateItems = itemsByDate[dateStr];
            const dateObj = new Date(dateStr);
            const isAllCompleted = dateItems.every((i: any) => i.isCompleted);

            return {
                id: `session-${dateStr}`,
                index: idx + 1,
                date: dateObj,
                isCompleted: isAllCompleted,
                topics: dateItems.map((i: any) => ({
                    id: i.lessonId,
                    title: i.lesson.title,
                    type: "Lesson",
                    courseTitle: i.lesson.chapter?.course?.title,
                    courseId: i.lesson.chapter?.course?.id,
                    chapterId: i.lesson.chapter?.id,
                    isCompleted: i.isCompleted,
                    hasQuiz: i.hasQuiz,
                    quizCompleted: i.quizCompleted
                }))
            };
        });
    }

    // EMPTY STATE
    if (!initialSchedule || sessions.length === 0) {
        return (
            <div className={`p-12 text-center rounded-3xl border border-dashed ${
                isDark ? "border-white/10 bg-[#0e0e0e] text-white" : "border-stone-300 bg-white text-stone-900"
            }`}>
                <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold mb-2">Chưa có kế hoạch học tập</h3>
                <p className="text-stone-400 mb-6 max-w-sm mx-auto">
                    Hãy tạo một lộ trình cá nhân hóa để Aura giúp bạn sắp xếp thời gian học tập hiệu quả nhất nhé!
                </p>
                <Link
                    href="/onboarding/study-plan/create"
                    className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold uppercase tracking-wider text-xs shadow-xl transition-all hover:scale-105 ${
                        isDark ? "bg-[#C5A059] text-[#080808]" : "bg-stone-900 text-white"
                    }`}
                >
                    <PlusCircle size={18} /> Tạo Lộ Trình Mới
                </Link>
            </div>
        );
    }

    // Grouping Logic
    const groupedSessions: { [key: string]: StudySession[] } = {};
    sessions.forEach(session => {
        const monthKey = format(session.date, "M-yyyy");
        if (!groupedSessions[monthKey]) {
            groupedSessions[monthKey] = [];
        }
        groupedSessions[monthKey].push(session);
    });

    const sortedMonthKeys = Object.keys(groupedSessions).sort((a, b) => {
        const [ma, ya] = a.split('-').map(Number);
        const [mb, yb] = b.split('-').map(Number);
        return new Date(ya, ma - 1).getTime() - new Date(yb, mb - 1).getTime();
    });

    return (
        <div className="space-y-8">
            {/* TOOLBAR */}
            <div className={`p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 border ${
                isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-sm"
            }`}>
                <div className="flex gap-2">
                    <button className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                        isDark ? "bg-white/10 text-white" : "bg-stone-900 text-white"
                    }`}>
                        Hôm nay
                    </button>
                    <button className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                        isDark ? "text-stone-400 hover:text-white" : "text-stone-600 hover:text-stone-900"
                    }`}>
                        Tổng quan
                    </button>
                </div>

                {/* Cup Counter */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#C5A059]/20 text-[#C5A059] px-4 py-2 rounded-2xl text-xs font-bold border border-[#C5A059]/30">
                        <Trophy size={16} />
                        <span>{sessions.reduce((acc, s) => acc + getSessionCups(s), 0)} cups</span>
                    </div>
                </div>
            </div>

            {/* CONTENT - GRID VIEW */}
            <div className="space-y-10">
                {sortedMonthKeys.map((monthKey) => {
                    const monthSessions = groupedSessions[monthKey];
                    const [month, year] = monthKey.split('-');

                    return (
                        <div key={monthKey} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Month Separator */}
                            <div className="flex items-center justify-center mb-6">
                                <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-stone-200"}`} />
                                <h3 className="px-6 text-xs font-bold text-[#C5A059] uppercase tracking-widest font-serif">
                                    Tháng {month} Năm {year}
                                </h3>
                                <div className={`h-px flex-1 ${isDark ? "bg-white/10" : "bg-stone-200"}`} />
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {monthSessions.map((session) => (
                                    <SessionCard key={session.id} session={session} isDark={isDark} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center pt-8">
                <Link
                    href="/onboarding/study-plan/create"
                    className="text-xs font-bold uppercase tracking-wider text-[#C5A059] hover:underline"
                >
                    Tạo lại hoặc chỉnh sửa lộ trình
                </Link>
            </div>
        </div>
    );
}
