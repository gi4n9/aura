"use client";

import { useState } from "react";
import { CheckCircle2, Circle, FileQuestion, PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface LessonItem {
    id: string;
    title: string;
    position: number;
}

interface ChapterItem {
    id: string;
    title: string;
    lessons: LessonItem[];
}

interface LessonStats {
    totalQuestions: number;
    correctCount: number;
    submittedCount: number;
    isCompleted: boolean;
    videoCompleted: boolean;
    videoPercentage: number;
}

interface ProgressDetailsListProps {
    chapters: ChapterItem[];
    lessonProgress: { [key: string]: LessonStats };
}

const ITEMS_PER_PAGE = 5;

export default function ProgressDetailsList({ chapters, lessonProgress }: ProgressDetailsListProps) {
    const getInitialPageForLessons = (chapterLessons: LessonItem[]) => {
        const firstIncompleteIdx = chapterLessons.findIndex(
            (l) => !lessonProgress[l.id]?.isCompleted
        );
        if (firstIncompleteIdx === -1) return 1;
        return Math.floor(firstIncompleteIdx / ITEMS_PER_PAGE) + 1;
    };

    const [selectedChapterId, setSelectedChapterId] = useState<string>(
        chapters.length > 0 ? chapters[0].id : ""
    );
    const [currentPage, setCurrentPage] = useState<number>(() => {
        if (chapters.length === 0) return 1;
        return getInitialPageForLessons(chapters[0].lessons);
    });

    if (chapters.length === 0) {
        return (
            <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400 italic">
                Chưa có chương học nào trong khóa học này.
            </div>
        );
    }

    const selectedChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
    const lessons = selectedChapter.lessons || [];

    // Pagination calculations
    const totalPages = Math.ceil(lessons.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedLessons = lessons.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleChapterChange = (chapterId: string) => {
        setSelectedChapterId(chapterId);
        const nextChapter = chapters.find((c) => c.id === chapterId);
        if (nextChapter) {
            setCurrentPage(getInitialPageForLessons(nextChapter.lessons));
        } else {
            setCurrentPage(1);
        }
    };

    return (
        <div className="space-y-6">
            {/* CHAPTER SELECTOR (If more than 1 chapter) */}
            {chapters.length > 1 && (
                <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-3">
                    <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">Chọn chương học</span>
                    <div className="flex flex-wrap gap-2">
                        {chapters.map((chapter) => {
                            const isActive = chapter.id === selectedChapterId;
                            return (
                                <button
                                    key={chapter.id}
                                    onClick={() => handleChapterChange(chapter.id)}
                                    className={`px-4 py-2 text-sm font-bold rounded-lg border transition-all duration-200 ${
                                        isActive
                                            ? "bg-[#C5A059] border-[#C5A059] text-white shadow-sm"
                                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100/70"
                                    }`}
                                >
                                    {chapter.title}
                                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                                        isActive ? "bg-white/20 text-white" : "bg-stone-200 text-stone-500"
                                    }`}>
                                        {chapter.lessons.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* LESSONS LIST */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                {/* Header info */}
                <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                    <h2 className="font-bold text-stone-700 text-lg">
                        {selectedChapter.title}
                    </h2>
                    <span className="text-xs font-bold bg-white border border-stone-200 px-3 py-1 rounded-full text-stone-500">
                        Hiển thị {Math.min(lessons.length, startIndex + 1)}-{Math.min(lessons.length, startIndex + ITEMS_PER_PAGE)} / {lessons.length} bài
                    </span>
                </div>

                <div className="divide-y divide-stone-100">
                    {paginatedLessons.length === 0 ? (
                        <div className="p-6 text-center text-stone-400 italic text-sm">Chưa có bài học trong chương này.</div>
                    ) : (
                        paginatedLessons.map((lesson) => {
                            const stats = lessonProgress[lesson.id] || {
                                totalQuestions: 0,
                                correctCount: 0,
                                submittedCount: 0,
                                isCompleted: false,
                                videoCompleted: false,
                                videoPercentage: 0
                            };
                            const hasQuiz = stats.totalQuestions > 0;

                            return (
                                <div key={lesson.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                                    {/* Lesson Info */}
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 ${stats.isCompleted ? "text-green-500" : "text-stone-300"}`}>
                                            {stats.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-stone-800 mb-1">{lesson.title}</h4>
                                            <div className="flex items-center gap-3 text-xs text-stone-500">
                                                {hasQuiz ? (
                                                    <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                                                        <FileQuestion size={12} /> {stats.totalQuestions} Câu hỏi
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-stone-400 bg-stone-100 px-2 py-0.5 rounded font-medium">
                                                        <PlayCircle size={12} /> Bài giảng video
                                                    </span>
                                                )}
                                                
                                                {stats.videoPercentage > 0 && (
                                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium ${stats.videoCompleted ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"}`}>
                                                        <PlayCircle size={12} /> {stats.videoCompleted ? "Đã xem" : `Xem ${Math.round(stats.videoPercentage)}%`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Result */}
                                    {hasQuiz && (
                                        <div className="flex bg-stone-100 rounded-lg p-3 min-w-[140px] justify-between items-center sm:flex-col sm:items-end md:flex-row md:items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Điểm số</span>
                                                <span className={`font-bold text-lg ${stats.correctCount === stats.totalQuestions ? "text-green-600" : "text-stone-700"}`}>
                                                    {stats.correctCount}/{stats.totalQuestions}
                                                </span>
                                            </div>

                                            <div className="h-8 w-[1px] bg-stone-200 hidden md:block mx-3"></div>

                                            <div className="text-right">
                                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Trạng thái</span>
                                                {stats.isCompleted ? (
                                                    <span className="text-xs font-bold text-green-600">Đã làm xong</span>
                                                ) : stats.submittedCount > 0 ? (
                                                    <span className="text-xs font-bold text-amber-600">Đang học</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-stone-400">Chưa làm</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {!hasQuiz && (
                                        <div className="text-xs text-stone-400 italic pr-4">
                                            (Không có bài tập)
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-2 mt-4 select-none">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-30 disabled:hover:text-stone-400 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <span className="text-sm font-bold text-stone-500 min-w-[60px] text-center">
                        {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-30 disabled:hover:text-stone-400 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}
