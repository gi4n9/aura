"use client";

import { useState } from "react";
import { format, isSameMonth, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { LayoutGrid, List, Calendar as CalendarIcon, Trophy, CheckCircle2, BookOpen, Circle } from "lucide-react";

// --- TYPES ---
interface LessonItem {
    id: string;
    title: string;
    type: "Grammar" | "Vocabulary" | "Listening" | "Reading" | "Speaking";
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

// --- MOCK DATA ---
const generateMockData = (): StudySession[] => {
    const sessions: StudySession[] = [];

    // Helper to create date
    const d = (month: number, day: number) => new Date(2025, month - 1, day);

    // OCT 2025
    sessions.push({
        id: "s1", index: 1, date: d(10, 27), isCompleted: true, completedAt: d(10, 27), score: "3/3",
        topics: [
            { id: "l1", title: "Giới thiệu về khóa học - Nghe & Đọc", type: "Grammar" }
        ]
    });
    sessions.push({
        id: "s2", index: 2, date: d(10, 28), isCompleted: true, completedAt: d(10, 27), score: "3/3",
        topics: [
            { id: "l2", title: "Bài giới thiệu khoá học - Từ vựng", type: "Vocabulary" }
        ]
    });
    sessions.push({
        id: "s3", index: 3, date: d(10, 29), isCompleted: true, completedAt: d(10, 27), score: "3/3",
        topics: [
            { id: "l3", title: "Listening: Tranh tả người", type: "Listening" }
        ]
    });
    sessions.push({
        id: "s4", index: 4, date: d(10, 30), isCompleted: true, completedAt: d(10, 28), score: "3/3",
        topics: [
            { id: "l4", title: "Reading: Giới thiệu chung về Part 5", type: "Vocabulary" }
        ]
    });
    sessions.push({
        id: "s5", index: 5, date: d(10, 31), isCompleted: true, completedAt: d(10, 28), score: "3/3",
        topics: [
            { id: "l5", title: "Chủ đề về Hợp đồng và Tiếp thị (Section 1)", type: "Vocabulary" }
        ]
    });

    // NOV 2025
    sessions.push({
        id: "s6", index: 6, date: d(11, 1), isCompleted: true, completedAt: d(10, 30), score: "3/3",
        topics: [
            { id: "l6", title: "Listening: Giới thiệu chung về câu hỏi WH", type: "Listening" }
        ]
    });
    sessions.push({
        id: "s7", index: 7, date: d(11, 2), isCompleted: true, completedAt: d(10, 31), score: "3/3",
        topics: [
            { id: "l7", title: "Reading: Danh từ (Phần 1)", type: "Reading" }
        ]
    });
    sessions.push({
        id: "s8", index: 8, date: d(11, 3), isCompleted: true, completedAt: d(10, 31), score: "3/3",
        topics: [
            { id: "l8", title: "Reading: Danh từ (Phần 2)", type: "Reading" }
        ]
    });
    sessions.push({
        id: "s9", index: 9, date: d(11, 4), isCompleted: false, score: "0/3",
        topics: [
            { id: "l9", title: "Mind map 1", type: "Grammar" }
        ]
    });
    sessions.push({
        id: "s10", index: 10, date: d(11, 5), isCompleted: false, score: "1/3",
        topics: [
            { id: "l10", title: "Chủ đề về Hợp đồng và Tiếp thị (Section 2)", type: "Vocabulary" }
        ]
    });
    sessions.push({
        id: "s11", index: 11, date: d(11, 6), isCompleted: false, score: "0/3",
        topics: [
            { id: "l11", title: "Listening: Tranh tả vật", type: "Listening" }
        ]
    });

    return sessions;
};

// --- COMPONENTS ---

const SessionCard = ({ session }: { session: StudySession }) => {
    return (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-200 flex flex-col h-full overflow-hidden">
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

                <div className="flex items-center gap-1 text-[#F59E0B] font-bold text-sm">
                    <Trophy size={16} />
                    <span>{session.score}</span>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 py-2 flex-1 space-y-3">
                {session.topics.map((topic) => (
                    <div key={topic.id}>
                        <div className="flex items-start gap-2 mb-1.5">
                            <Circle size={8} className={`mt-1.5 shrink-0 ${session.isCompleted ? "text-green-500 fill-green-500" : "text-[#C5A059] fill-[#C5A059]"}`} />
                            <p className="text-sm text-stone-600 font-medium leading-tight">
                                {topic.title}
                            </p>
                        </div>
                        {/* Tag */}
                        <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold rounded border border-stone-200 ml-4">
                            {topic.type}
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 mt-auto">
                {session.isCompleted && session.completedAt ? (
                    <p className="text-xs text-green-600 font-medium">
                        Đã Hoàn Thành: {format(session.completedAt, "EEEE, d 'Tháng' M", { locale: vi })}
                    </p>
                ) : (
                    <p className="text-xs text-stone-400 font-medium">
                        Chưa hoàn thành
                    </p>
                )}
            </div>
        </div>
    );
};

export default function StudyTimeline() {
    const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");
    const sessions = generateMockData();

    // Group sessions by MonthYear
    const groupedSessions: { [key: string]: StudySession[] } = {};
    sessions.forEach(session => {
        const monthKey = format(session.date, "M-yyyy");
        if (!groupedSessions[monthKey]) {
            groupedSessions[monthKey] = [];
        }
        groupedSessions[monthKey].push(session);
    });

    // Sort keys to ensure chronological order
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
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-stone-400 hover:bg-stone-100"}`}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* CONTENT - GRID VIEW */}
            <div className="space-y-10">
                {sortedMonthKeys.map((monthKey) => {
                    const monthSessions = groupedSessions[monthKey];
                    const [month, year] = monthKey.split('-');

                    return (
                        <div key={monthKey}>
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
        </div>
    );
}
