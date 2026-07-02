"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, PlayCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import LessonProgressBar from "@/app/components/courseComponents/LessonProgressBar";

interface LessonItem {
    id: string;
    title: string;
    duration: number | null;
    _count: {
        questions: number;
    };
}

interface ChapterItem {
    id: string;
    title: string;
    lessons: LessonItem[];
}

interface CourseSyllabusListProps {
    courseId: string;
    chapters: ChapterItem[];
    lessonCompletionMap: { [key: string]: boolean };
    videoProgressMap: { [key: string]: number };
    quizPassMap: { [key: string]: boolean };
    isEnrolled: boolean;
}

const ITEMS_PER_PAGE = 5;

export default function CourseSyllabusList({
    courseId,
    chapters,
    lessonCompletionMap,
    videoProgressMap,
    quizPassMap,
    isEnrolled,
}: CourseSyllabusListProps) {
    const getInitialPageForLessons = (chapterLessons: LessonItem[]) => {
        const firstIncompleteIdx = chapterLessons.findIndex(
            (l) => !lessonCompletionMap[l.id]
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
                <div className="px-6 py-4 bg-[#F9F8F4] border-b border-stone-200 flex justify-between items-center">
                    <h3 className="font-serif text-lg font-bold text-stone-800">{selectedChapter.title}</h3>
                    <span className="text-xs font-bold bg-white border border-stone-200 px-3 py-1 rounded-full text-stone-500">
                        Hiển thị {Math.min(lessons.length, startIndex + 1)}-{Math.min(lessons.length, startIndex + ITEMS_PER_PAGE)} / {lessons.length} bài
                    </span>
                </div>

                <div className="divide-y divide-stone-100">
                    {paginatedLessons.length === 0 ? (
                        <div className="p-6 text-center text-stone-400 italic text-sm">Chưa có bài học trong chương này.</div>
                    ) : (
                        paginatedLessons.map((lesson) => {
                            const isCompleted = lessonCompletionMap[lesson.id] || false;

                            return (
                                <Link
                                    key={lesson.id}
                                    href={`/courses/${courseId}/lessons/${lesson.id}`}
                                    className="px-6 py-4 flex flex-col group hover:bg-stone-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                                                isCompleted
                                                    ? "bg-green-100 text-green-600 border-green-200"
                                                    : "bg-stone-100 text-[#C5A059] border-stone-200 group-hover:border-[#C5A059]"
                                            }`}>
                                                {isCompleted ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
                                            </div>
                                            <span className={`font-medium transition-colors ${isCompleted ? "text-stone-400 line-through decoration-stone-300" : "text-stone-600 group-hover:text-stone-900"}`}>
                                                {lesson.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                                                <Clock size={12} />
                                                {lesson.duration ? Math.floor(lesson.duration / 60) + "p" : "--"}
                                            </span>
                                            <span className="text-xs font-bold text-[#C5A059] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                                {isCompleted ? "Ôn tập" : "Học ngay"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {isEnrolled && (
                                        <div className="mt-4 pl-12 pr-2">
                                            <LessonProgressBar
                                                videoPercentage={videoProgressMap[lesson.id] || 0}
                                                hasQuiz={lesson._count.questions > 0}
                                                isQuizPassed={quizPassMap[lesson.id] || false}
                                            />
                                        </div>
                                    )}
                                </Link>
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
