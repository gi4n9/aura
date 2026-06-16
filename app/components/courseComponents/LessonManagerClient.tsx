"use client";

import { useState } from "react";
import {
    Youtube, FileQuestion, FileText,
    Network, Layers, LayoutDashboard
} from "lucide-react";

// Import đầy đủ các component (Đã sửa đổi thành QuizEditor)
import LessonVideoEditor from "./LessonVideoEditor";
import QuizEditor from "./QuizEditor";
import TranscriptEditor from "./TranscriptEditor";
import MindMapEditor from "./MindMapEditor";
import FlashcardEditor from "./FlashcardEditor";

interface LessonManagerProps {
    lessonId: string;
    lessonTitle: string;
    initialQuestions: any[];
    initialTranscript?: string | null;
    initialMindMap?: any;
    initialFlashcards?: any;
    initialDisplayMode?: any;
}

export default function LessonManagerClient({
    lessonId,
    lessonTitle,
    initialQuestions,
    initialTranscript,
    initialMindMap,
    initialFlashcards,
    initialDisplayMode
}: LessonManagerProps) {
    const [activeTab, setActiveTab] = useState<"video" | "transcript" | "mindmap" | "flashcards" | "questions">("video");

    const tabs = [
        { id: "video", label: "Cài đặt Video", icon: Youtube, activeColor: "bg-[#C5A059] text-white" },
        { id: "transcript", label: "Transcript", icon: FileText, activeColor: "bg-blue-600 text-white" },
        { id: "mindmap", label: "Mind Map", icon: Network, activeColor: "bg-purple-600 text-white" },
        { id: "flashcards", label: "Flashcards", icon: Layers, activeColor: "bg-orange-500 text-white" },
        { id: "questions", label: "Quiz AI", icon: FileQuestion, activeColor: "bg-slate-900 text-white" },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex flex-wrap bg-white p-1.5 rounded-xl shadow-sm border border-stone-200 gap-1 lg:w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                ? `${tab.activeColor} shadow-md`
                                : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content Area */}
            <div className="min-h-[600px]">
                {activeTab === "video" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <LessonVideoEditor lessonId={lessonId} />
                    </div>
                )}

                {activeTab === "transcript" && (
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <TranscriptEditor lessonId={lessonId} initialTranscript={initialTranscript} />
                    </div>
                )}

                {activeTab === "mindmap" && (
                    <div className="bg-white p-2 rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <MindMapEditor lessonId={lessonId} initialMindMap={initialMindMap} transcript={initialTranscript} />
                    </div>
                )}

                {activeTab === "flashcards" && (
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <FlashcardEditor lessonId={lessonId} initialFlashcards={initialFlashcards} transcript={initialTranscript} />
                    </div>
                )}

                {activeTab === "questions" && (
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="mb-6 bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 text-sm border border-blue-100 items-start">
                            <LayoutDashboard className="shrink-0 mt-0.5 text-blue-600" size={18} />
                            <p>
                                Đây là các câu hỏi được AI tạo tự động từ nội dung video <strong>{lessonTitle}</strong>.
                                Bạn có thể chỉnh sửa, thêm mới hoặc xóa bớt trước khi xuất bản.
                            </p>
                        </div>
                        {/* Đã thay thế lại QuestionEditor bằng QuizEditor để có full feature */}
                        <QuizEditor lessonId={lessonId} initialQuestions={initialQuestions} initialDisplayMode={initialDisplayMode} />
                    </div>
                )}
            </div>
        </div>
    );
}