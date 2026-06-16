"use client";

import { useEffect, useState } from "react";
import { getChapterLessons } from "@/app/actions/chapter";
import { getLessonQuestions } from "@/app/actions/question"; // Reuse existing action
import QuizEditor from "./QuizEditor";
import { X, Loader2, Sparkles, FileQuestion, CheckCircle2, Circle } from "lucide-react";

interface ChapterQuizModalProps {
    chapterId: string;
    chapterTitle: string;
    onClose: () => void;
}

export default function ChapterQuizModal({ chapterId, chapterTitle, onClose }: ChapterQuizModalProps) {
    const [loadingLessons, setLoadingLessons] = useState(true);
    const [lessons, setLessons] = useState<any[]>([]);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

    // Fetch list of lessons when modal opens
    useEffect(() => {
        let mounted = true;
        setLoadingLessons(true);
        getChapterLessons(chapterId).then(res => {
            if (mounted && res.success) {
                setLessons(res.data || []);
                if (res.data && res.data.length > 0) {
                    setSelectedLessonId(res.data[0].id);
                }
            }
            if (mounted) setLoadingLessons(false);
        });
        return () => { mounted = false; };
    }, [chapterId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-200">
            <div className="bg-[#F9F8F4] w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex relative animate-in zoom-in-95 duration-200 border border-white/20 overflow-hidden">

                {/* Close Button Absolute */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-50 p-2 bg-white/80 hover:bg-white rounded-full text-stone-400 hover:text-red-500 transition-colors shadow-sm"
                >
                    <X size={20} />
                </button>

                {/* LEFT SIDEBAR: Lesson List */}
                <div className="w-80 bg-white border-r border-stone-200 flex flex-col">
                    <div className="p-6 border-b border-stone-100">
                        <h2 className="text-lg font-bold text-stone-800 line-clamp-1" title={chapterTitle}>
                            {chapterTitle}
                        </h2>
                        <p className="text-xs text-stone-500 mt-1 uppercase tracking-wider font-semibold">
                            Danh sách bài học
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {loadingLessons ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="animate-spin text-[#C5A059]" />
                            </div>
                        ) : lessons.length === 0 ? (
                            <div className="text-center text-stone-400 py-10 text-sm">
                                Chương này chưa có bài học nào.
                            </div>
                        ) : (
                            lessons.map((lesson) => {
                                const isSelected = selectedLessonId === lesson.id;
                                const hasQuestions = lesson._count?.questions > 0;

                                return (
                                    <button
                                        key={lesson.id}
                                        onClick={() => setSelectedLessonId(lesson.id)}
                                        className={`w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3 ${isSelected
                                            ? "bg-[#C5A059]/10 border-[#C5A059] text-[#b08d4b]"
                                            : "hover:bg-stone-50 border-transparent hover:border-stone-200 text-stone-600"
                                            }`}
                                    >
                                        <div className={`shrink-0 ${isSelected ? "text-[#C5A059]" : "text-stone-400"}`}>
                                            {hasQuestions ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold truncate ${isSelected ? "text-stone-900" : ""}`}>
                                                {lesson.title}
                                            </p>
                                            <p className="text-[10px] text-stone-400">
                                                {lesson._count?.questions || 0} câu hỏi
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT MAIN: Quiz Editor */}
                <div className="flex-1 flex flex-col h-full bg-[#FAFAFA] relative">
                    {selectedLessonId ? (
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <QuizLoader lessonId={selectedLessonId} />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
                            <FileQuestion size={64} className="mb-4 opacity-50" />
                            <p>Chọn một bài học để biên soạn câu hỏi.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-component to handle fetching questions for specific lesson
function QuizLoader({ lessonId }: { lessonId: string }) {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]);
    const [displayMode, setDisplayMode] = useState<any>("BOTH");

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getLessonQuestions(lessonId).then(res => {
            if (mounted && res.success) {
                setQuestions(res.data || []);
                setDisplayMode((res as any).quizDisplayMode || "BOTH");
            }
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, [lessonId]);

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-3">
            <Loader2 size={40} className="animate-spin text-[#C5A059]" />
            <p className="text-sm font-medium">Đang tải câu hỏi...</p>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <QuizEditor lessonId={lessonId} initialQuestions={questions} initialDisplayMode={displayMode} />
        </div>
    );
}
