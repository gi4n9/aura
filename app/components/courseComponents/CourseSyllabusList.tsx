"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import LessonProgressBar from "@/app/components/courseComponents/LessonProgressBar";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/app/components/AuthProvider";
import LoginModal from "@/app/components/auth/LoginModal";
import RegisterModal from "@/app/components/auth/RegisterModal";
import { toast } from "sonner";

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
    const router = useRouter();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { user } = useAuth();
    const isDark = theme === "dark";

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

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
            <div className={`border rounded-2xl p-6 text-center italic text-sm ${isDark ? "bg-white/5 border-white/10 text-stone-400" : "bg-white border-stone-200 text-stone-500"
                }`}>
                {t("courseSyllabus.noChapters", "Chưa có chương học nào trong khóa học này.")}
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

    const handleLessonClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!user) {
            e.preventDefault();
            setIsLoginModalOpen(true);
            toast.error("Bạn cần đăng nhập để học bài học này")
        }
    };

    return (
        <>
            <div className="space-y-4 flex flex-col h-full">
                {/* CHAPTER SELECTOR TABS (Horizontal Scrollable Rounded Pills) */}
                {chapters.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {chapters.map((chapter, idx) => {
                            const isActive = chapter.id === selectedChapterId;
                            return (
                                <button
                                    key={chapter.id}
                                    onClick={() => handleChapterChange(chapter.id)}
                                    className={`px-4 py-2 text-xs font-bold rounded-2xl border transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${isActive
                                        ? "bg-[#C5A059] border-[#C5A059] text-[#080808] shadow-md"
                                        : isDark
                                            ? "bg-white/5 border-white/10 text-stone-300 hover:bg-white/10"
                                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-100"
                                        }`}
                                >
                                    <span>Chương {idx + 1}: {chapter.title}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isActive ? "bg-[#080808]/20 text-[#080808]" : isDark ? "bg-white/10 text-stone-400" : "bg-stone-200 text-stone-600"
                                        }`}>
                                        {chapter.lessons.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* LESSONS CONTAINER WITH ROUNDED CORNERS */}
                <div className={`border rounded-[24px] overflow-hidden shadow-sm flex flex-col ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200/80 text-stone-900"
                    }`}>
                    <div className={`px-5 py-3.5 border-b flex justify-between items-center ${isDark ? "bg-white/5 border-white/10" : "bg-[#F9F8F4] border-stone-200/60"
                        }`}>
                        <h3 className="font-serif text-sm font-bold truncate pr-2">{selectedChapter.title}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border bg-[#C5A059]/15 border-[#C5A059]/30 text-[#C5A059] shrink-0 font-mono">
                            {lessons.length > 0 ? `${Math.min(lessons.length, startIndex + 1)}-${Math.min(lessons.length, startIndex + ITEMS_PER_PAGE)} / ${lessons.length}` : "0"} {t("courseSidebar.lessons", "Bài")}
                        </span>
                    </div>

                    {/* PAGINATED LESSONS LIST WITH ULTRA-THIN SOFT DIVIDERS */}
                    <div className={`divide-y min-h-[180px] ${isDark ? "divide-white/[0.04]" : "divide-stone-200/40"
                        }`}>
                        {paginatedLessons.length === 0 ? (
                            <div className="p-6 text-center text-stone-400 italic text-xs">
                                {t("courseSyllabus.noLessons", "Chưa có bài học trong chương này.")}
                            </div>
                        ) : (
                            paginatedLessons.map((lesson) => {
                                const isCompleted = lessonCompletionMap[lesson.id] || false;

                                return (
                                    <Link
                                        key={lesson.id}
                                        href={`/courses/${courseId}/lessons/${lesson.id}`}
                                        onClick={handleLessonClick}
                                        className={`px-5 py-3.5 flex flex-col group transition-all cursor-pointer ${isDark ? "hover:bg-white/5" : "hover:bg-amber-50/40"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center border transition-colors ${isCompleted
                                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                    : "bg-[#C5A059]/15 text-[#C5A059] border-[#C5A059]/30 group-hover:bg-[#C5A059] group-hover:text-[#080808]"
                                                    }`}>
                                                    {isCompleted ? <CheckCircle2 size={15} /> : <PlayCircle size={15} />}
                                                </div>
                                                <span className={`text-xs md:text-sm font-medium truncate ${isCompleted
                                                    ? isDark ? "text-stone-500 line-through" : "text-stone-400 line-through"
                                                    : isDark ? "text-stone-200 group-hover:text-white" : "text-stone-700 group-hover:text-stone-900"
                                                    }`}>
                                                    {lesson.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                                                    <Clock size={11} />
                                                    {lesson.duration ? Math.floor(lesson.duration / 60) + "m" : "--"}
                                                </span>
                                                <span className="text-[10px] font-bold text-[#C5A059] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                                    {isCompleted ? t("courseSyllabus.review", "Ôn tập") : t("courseSyllabus.learnNow", "Học ngay")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {isEnrolled && (
                                            <div className="mt-2.5 pl-10 pr-2">
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

                {/* PAGINATION CONTROLS WITH ROUNDED BUTTONS */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-2 select-none">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? "text-stone-400 hover:text-white hover:bg-white/10" : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                                }`}
                        >
                            <ChevronLeft size={18} strokeWidth={2.5} />
                        </button>
                        <span className={`text-xs font-bold font-mono min-w-[60px] text-center ${isDark ? "text-stone-300" : "text-stone-600"
                            }`}>
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? "text-stone-400 hover:text-white hover:bg-white/10" : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                                }`}
                        >
                            <ChevronRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </div>

            {/* Auth Modals for unauthenticated users */}
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
