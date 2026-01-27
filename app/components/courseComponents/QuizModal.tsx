"use client";

import { useEffect, useState } from "react";
import QuizEditor from "./QuizEditor";
import { getLessonQuestions } from "@/app/actions/question";
import { X, Loader2, Sparkles } from "lucide-react";

interface QuizModalProps {
    lessonId: string;
    lessonTitle: string;
    onClose: () => void;
}

export default function QuizModal({ lessonId, lessonTitle, onClose }: QuizModalProps) {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        getLessonQuestions(lessonId)
            .then((res) => {
                if (mounted && res.success) {
                    setQuestions(res.data || []);
                }
            })
            .catch((err) => console.error(err))
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [lessonId]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md transition-all animate-in fade-in duration-200">
            <div className="bg-[#F9F8F4] w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200 border border-white/20">

                {/* Header */}
                <div className="px-8 py-5 border-b border-stone-200 flex justify-between items-center bg-white rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                            <Sparkles className="text-[#C5A059]" size={20} />
                            Biên tập câu hỏi trắc nghiệm
                        </h2>
                        <p className="text-sm text-stone-500 mt-1">
                            Bài học: <span className="font-semibold text-stone-700">{lessonTitle}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-red-500 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-3">
                            <Loader2 size={40} className="animate-spin text-[#C5A059]" />
                            <p>Đang tải bộ câu hỏi...</p>
                        </div>
                    ) : (
                        <QuizEditor lessonId={lessonId} initialQuestions={questions} />
                    )}
                </div>

                {/* Footer Hint */}
                <div className="px-8 py-3 bg-stone-50 border-t border-stone-200 text-xs text-stone-400 text-center rounded-b-2xl">
                    Bấm "Lưu thay đổi" để cập nhật ngay lập tức. Nhấn ESC để đóng.
                </div>
            </div>
        </div>
    );
}
