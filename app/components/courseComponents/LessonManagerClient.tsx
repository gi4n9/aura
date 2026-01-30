"use client";

import { useState } from "react";
import { Youtube, FileQuestion, LayoutDashboard } from "lucide-react";
import QuestionEditor from "./QuestionEditor";
import LessonVideoEditor from "./LessonVideoEditor";

interface LessonManagerProps {
    lessonId: string;
    lessonTitle: string;
    initialQuestions: any[];
}

export default function LessonManagerClient({ lessonId, lessonTitle, initialQuestions }: LessonManagerProps) {
    const [activeTab, setActiveTab] = useState<"questions" | "video">("questions");

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-stone-200 w-fit">
                <button
                    onClick={() => setActiveTab("questions")}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "questions"
                            ? "bg-[#1a1a1a] text-white shadow-md"
                            : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                        }`}
                >
                    <FileQuestion size={18} />
                    Câu hỏi AI
                </button>
                <button
                    onClick={() => setActiveTab("video")}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "video"
                            ? "bg-[#C5A059] text-white shadow-md"
                            : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                        }`}
                >
                    <Youtube size={18} />
                    Cài đặt Video
                </button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === "questions" ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="mb-4 bg-blue-50 text-blue-800 p-4 rounded-lg flex gap-2 text-sm border border-blue-100">
                            <LayoutDashboard className="shrink-0 mt-0.5" size={16} />
                            <p>
                                Đây là các câu hỏi được AI tạo tự động từ nội dung video.
                                Bạn có thể chỉnh sửa, thêm mới hoặc xóa bớt trước khi xuất bản.
                            </p>
                        </div>
                        <QuestionEditor lessonId={lessonId} initialQuestions={initialQuestions} />
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <LessonVideoEditor lessonId={lessonId} />
                    </div>
                )}
            </div>
        </div>
    );
}
