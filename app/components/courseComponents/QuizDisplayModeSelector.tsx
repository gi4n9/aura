"use client";

import { useState } from "react";
import { MonitorPlay, FileText, LayoutTemplate, Loader2 } from "lucide-react";
import { QuizDisplayMode } from "@prisma/client";
import { updateQuizDisplayMode } from "@/app/actions/quiz-worksheet";
import { toast } from "sonner";

interface QuizDisplayModeSelectorProps {
    lessonId: string;
    initialMode: QuizDisplayMode;
}

export default function QuizDisplayModeSelector({ lessonId, initialMode }: QuizDisplayModeSelectorProps) {
    const [mode, setMode] = useState<QuizDisplayMode>(initialMode);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleModeChange = async (newMode: QuizDisplayMode) => {
        setMode(newMode);
        setIsUpdating(true);
        try {
            const res = await updateQuizDisplayMode(lessonId, newMode);
            if (res.success) {
                toast.success("Đã cập nhật chế độ hiển thị bài tập");
            } else {
                toast.error("Lỗi cập nhật: " + res.error);
                setMode(mode); // Revert
            }
        } catch (err: any) {
            toast.error("Có lỗi xảy ra: " + err.message);
            setMode(mode); // Revert
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm mb-6">
            <h3 className="font-serif text-lg font-bold mb-4 text-stone-800 flex justify-between items-center">
                <span>Chế độ hiển thị cho sinh viên</span>
                {isUpdating && <Loader2 className="animate-spin text-[#C5A059]" size={18} />}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                    onClick={() => handleModeChange(QuizDisplayMode.AI_ONLY)}
                    disabled={isUpdating}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${
                        mode === QuizDisplayMode.AI_ONLY 
                        ? "border-[#C5A059] bg-[#C5A059]/5 ring-1 ring-[#C5A059]" 
                        : "border-stone-200 hover:border-[#C5A059]/50 hover:bg-stone-50"
                    }`}
                >
                    <MonitorPlay size={24} className={mode === QuizDisplayMode.AI_ONLY ? "text-[#C5A059]" : "text-stone-400"} />
                    <span className={`text-sm font-semibold ${mode === QuizDisplayMode.AI_ONLY ? "text-[#C5A059]" : "text-stone-600"}`}>
                        Chỉ câu hỏi AI
                    </span>
                    <span className="text-xs text-stone-500 text-center">
                        Chỉ hiển thị câu hỏi được tạo tự động từ Video
                    </span>
                </button>

                <button
                    onClick={() => handleModeChange(QuizDisplayMode.WORKSHEET_ONLY)}
                    disabled={isUpdating}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${
                        mode === QuizDisplayMode.WORKSHEET_ONLY 
                        ? "border-[#C5A059] bg-[#C5A059]/5 ring-1 ring-[#C5A059]" 
                        : "border-stone-200 hover:border-[#C5A059]/50 hover:bg-stone-50"
                    }`}
                >
                    <FileText size={24} className={mode === QuizDisplayMode.WORKSHEET_ONLY ? "text-[#C5A059]" : "text-stone-400"} />
                    <span className={`text-sm font-semibold ${mode === QuizDisplayMode.WORKSHEET_ONLY ? "text-[#C5A059]" : "text-stone-600"}`}>
                        Chỉ phiếu bài tập
                    </span>
                    <span className="text-xs text-stone-500 text-center">
                        Chỉ hiển thị câu hỏi từ phiếu bạn đã tải lên
                    </span>
                </button>

                <button
                    onClick={() => handleModeChange(QuizDisplayMode.BOTH)}
                    disabled={isUpdating}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-all ${
                        mode === QuizDisplayMode.BOTH 
                        ? "border-[#C5A059] bg-[#C5A059]/5 ring-1 ring-[#C5A059]" 
                        : "border-stone-200 hover:border-[#C5A059]/50 hover:bg-stone-50"
                    }`}
                >
                    <LayoutTemplate size={24} className={mode === QuizDisplayMode.BOTH ? "text-[#C5A059]" : "text-stone-400"} />
                    <span className={`text-sm font-semibold ${mode === QuizDisplayMode.BOTH ? "text-[#C5A059]" : "text-stone-600"}`}>
                        Hiển thị cả hai
                    </span>
                    <span className="text-xs text-stone-500 text-center">
                        Hiển thị cả câu hỏi từ Video và Phiếu bài tập
                    </span>
                </button>
            </div>
        </div>
    );
}
