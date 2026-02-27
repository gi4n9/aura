"use client";

import { useState } from "react";
import { format, isSameMonth, parseISO, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { LayoutGrid, List, Calendar as CalendarIcon, Trophy, CheckCircle2, BookOpen, Circle, PlusCircle, ExternalLink, Award } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- TYPES ---
interface LessonItem {
    id: string;
    title: string;
    type: "Grammar" | "Vocabulary" | "Listening" | "Reading" | "Speaking" | string;
    courseTitle?: string;
    courseId?: string; // Added courseId
    chapterId?: string; // Added chapterId
    isCompleted?: boolean;
}

interface StudySession {
    id: string;
    index: number; // Buổi 1, 2...
    date: Date;
    isCompleted: boolean;
    completedAt?: Date;
    score?: string; // e.g., "3/3"
    topics: LessonItem[];
}

// --- COMPONENTS ---

const SessionCard = ({ session }: { session: StudySession }) => {
    return (
        <div className={`
             rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full overflow-hidden group
             ${isToday(session.date) ? "border-[#C5A059] ring-1 ring-[#C5A059]/30 bg-amber-50/20" : "bg-white border-stone-100 hover:border-green-200"}
        `}>
            {/* Header */}
            <div className="p-4 pb-2 flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1
                         ${session.isCompleted ? "bg-[#22c55e]" : "bg-[#C5A059]"}
                    `}>
                        Buổi {session.index}
                        {session.isCompleted && <CheckCircle2 size={12} fill="white" />}
                    </span>
                    <span className="text-sm font-bold text-stone-700">
                        {format(session.date, "EEEE, d 'Thg' M", { locale: vi })}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-[#F59E0B] font-bold text-sm">
                    {session.isCompleted && (
                        <>
                            <Trophy size={16} />
                            <span>+{session.topics.length * 3} cups</span>
                        </>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-4 py-2 flex-1 space-y-3">
                {session.topics.map((topic, idx) => (
                    <div key={topic.id + idx} className="group/topic">
                        {/* CLICKABLE ROW */}
                        <Link
                            href={topic.courseId && topic.chapterId
                                ? `/courses/${topic.courseId}/lessons/${topic.id}`
                                : "#"}
                            className="flex items-start gap-2 mb-1.5 hover:bg-stone-50 p-1.5 -mx-1.5 rounded-lg transition-colors"
                        >
                            <Circle size={8} className={`mt-1.5 shrink-0 ${session.isCompleted ? "text-green-500 fill-green-500" : "text-[#C5A059] fill-[#C5A059]"}`} />
                            <div className="flex-1">
                                <p className={`text-sm font-medium leading-tight line-clamp-2 transition-colors
                                    ${topic.isCompleted ? "text-stone-500 line-through decoration-stone-300" : "text-stone-700 group-hover/topic:text-[#C5A059]"}
                                `}>
                                    {topic.title}
                                </p>
                            </div>
                            {/* Hover Icon */}
                            <ExternalLink size={14} className="mt-1 text-stone-300 opacity-0 group-hover/topic:opacity-100 transition-opacity" />
                        </Link>

                        {/* Tags */}
                        <div className="flex gap-2 ml-4">
                            <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold rounded border border-stone-200">
                                {topic.type}
                            </span>
                            {topic.courseTitle && (
                                <Link href={`/courses/${topic.courseId}`} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-bold rounded border border-blue-100 max-w-[120px] truncate hover:underline">
                                    {topic.courseTitle}
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 mt-auto">
                {session.isCompleted ? (
                    <p className="text-xs text-green-600 font-medium">
                        Đã hoàn thành
                    </p>
                ) : (
                    <p className="text-xs text-stone-400 font-medium italic group-hover:text-stone-500 transition-colors">
                        {isToday(session.date) ? "Đến giờ học rồi! 🚀" : "Chưa hoàn thành"}
                    </p>
                )}
            </div>
        </div>
    );
};

export default function StudyTimeline({ initialSchedule }: { initialSchedule: any }) {
    const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");

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
                    courseId: i.lesson.chapter?.course?.id, // Ensure these are queried
                    chapterId: i.lesson.chapter?.id,
                    isCompleted: i.isCompleted
                }))
            };
        });
    }

    // EMPTY STATE
    if (!initialSchedule || sessions.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                    <CalendarIcon size={32} />
                </div>
                <h3 className="text-xl font-bold text-stone-800 mb-2">Chưa có kế hoạch học tập</h3>
                <p className="text-stone-500 mb-6 max-w-sm mx-auto">
                    Hãy tạo một lộ trình cá nhân hóa để Aura giúp bạn sắp xếp thời gian học tập hiệu quả nhất nhé!
                </p>
                <Link
                    href="/onboarding/study-plan/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold hover:bg-stone-800 transition shadow-lg"
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
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex gap-2">
                    <button className="px-4 py-1.5 rounded-lg text-sm font-bold text-stone-600 hover:bg-stone-50 transition">
                        Hôm nay
                    </button>
                    <button className="px-4 py-1.5 rounded-lg text-sm font-bold text-stone-800 bg-stone-100 shadow-sm">
                        Tổng quan
                    </button>
                </div>

                {/* Cup Counter */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-amber-50 text-[#C5A059] px-4 py-1.5 rounded-lg text-sm font-bold border border-amber-100">
                        <Trophy size={16} />
                        <span>{sessions.filter(s => s.isCompleted).reduce((acc, s) => acc + s.topics.length * 3, 0)} cups</span>
                    </div>
                    <div className="flex gap-1 pr-2">
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`p-2 rounded-lg transition ${viewMode === "calendar" ? "bg-blue-50 text-blue-600" : "text-stone-400 hover:bg-stone-100"}`}
                        >
                            <CalendarIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "text-stone-400 hover:bg-stone-100"}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
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
                                <div className="h-px bg-stone-200 flex-1"></div>
                                <h3 className="px-4 text-sm font-bold text-stone-500 uppercase tracking-wider">
                                    Tháng {month} Năm {year}
                                </h3>
                                <div className="h-px bg-stone-200 flex-1"></div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {monthSessions.map((session) => (
                                    <SessionCard key={session.id} session={session} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center pt-8">
                <Link href="/onboarding/study-plan/create" className="text-sm text-stone-400 hover:text-stone-600 underline">
                    Tạo lại hoặc chỉnh sửa lộ trình
                </Link>
            </div>
        </div>
    );
}
