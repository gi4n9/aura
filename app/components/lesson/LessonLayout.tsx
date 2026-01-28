"use client";

import { useState } from "react";
import {
    PanelLeftClose,
    PanelLeftOpen,
    Maximize2,
    Minimize2,
    BookOpen,
    CheckCircle,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import CourseSidebar from "@/app/components/CourseSidebar";
import VideoPlayer from "@/app/components/VideoPlayer";
import QuizPlayer from "../courseComponents/QuizPlayer";


// Định nghĩa lại các Type cần thiết (khớp với data từ Prisma truyền xuống)
type LessonData = {
    id: string;
    title: string;
    youtubeVideoId: string | null;
    transcript: string | null;
    questions: any[]; // Data quiz đã format
};

type CourseData = {
    id: string;
    title: string;
    chapters: any[];
};

export default function LessonLayout({
    course,
    lesson,
    formattedQuestions,
    initialResult,
    userAnswers,
}: {
    course: CourseData;
    lesson: LessonData;
    formattedQuestions: any[];
    initialResult?: any;
    userAnswers?: Record<string, string>;
}) {
    // State quản lý hiển thị
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isVideoVisible, setIsVideoVisible] = useState(true);

    return (
        <div className="flex h-screen w-full bg-[#F9F8F4] overflow-hidden pt-[70px]">

            {/* --- 1. SIDEBAR BÊN TRÁI (Collapsible) --- */}
            <div
                className={`flex-shrink-0 bg-white border-r border-stone-200 transition-all duration-300 ease-in-out relative ${isSidebarOpen ? "w-80" : "w-0 opacity-0 overflow-hidden"
                    }`}
            >
                <div className="h-full overflow-y-auto custom-scrollbar">
                    {/* Nút quay lại */}
                    <div className="p-4 border-b border-stone-100 sticky top-0 bg-white z-10">
                        <Link href={`/courses/${course.id}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-[#C5A059]">
                            <ArrowLeft size={14} /> Tổng quan
                        </Link>
                    </div>

                    <CourseSidebar
                        courseId={course.id}
                        chapters={course.chapters}
                        currentVideoId={lesson.youtubeVideoId || ""}
                    />
                </div>
            </div>

            {/* --- 2. KHUNG NỘI DUNG CHÍNH (Giữa + Phải) --- */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Toolbar điều khiển (Header nhỏ) */}
                <div className="h-12 bg-white border-b border-stone-200 flex items-center justify-between px-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Nút Toggle Sidebar */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-1.5 hover:bg-stone-100 rounded text-stone-500"
                            title={isSidebarOpen ? "Thu gọn danh sách bài" : "Mở danh sách bài"}
                        >
                            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                        </button>
                        <span className="font-serif font-bold text-stone-800 line-clamp-1">
                            {lesson.title}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Nút Toggle Video Mode */}
                        <button
                            onClick={() => setIsVideoVisible(!isVideoVisible)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${!isVideoVisible
                                ? "bg-[#C5A059] text-white"
                                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                }`}
                        >
                            {!isVideoVisible ? (
                                <><Maximize2 size={14} /> Hiện Video</>
                            ) : (
                                <><Minimize2 size={14} /> Tập trung làm bài</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Vùng chứa nội dung: Video (Giữa) + Quiz (Phải) */}
                <div className="flex-1 flex overflow-hidden">

                    {/* --- CỘT GIỮA: VIDEO & TRANSCRIPT --- */}
                    {isVideoVisible && (
                        <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#F9F8F4] transition-all duration-300 ${
                            // Nếu Sidebar đóng, set min-width nhỏ hơn để nó có thể co lại còn 50%
                            !isSidebarOpen ? "min-w-0" : "min-w-[400px]"
                            }`}>
                            <div className="max-w-4xl mx-auto space-y-8">
                                {/* Video Player */}
                                <VideoPlayer
                                    videoId={lesson.youtubeVideoId || ""}
                                    title={lesson.title}
                                    description="" // Ta sẽ hiển thị mô tả bên dưới riêng
                                />

                                {/* Transcript Section */}
                                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                                    <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2 text-stone-800">
                                        <BookOpen size={20} className="text-[#C5A059]" />
                                        Nội dung bài giảng
                                    </h3>
                                    <div className="prose prose-stone text-sm max-w-none text-stone-600 leading-relaxed">
                                        {lesson.transcript ? (
                                            <p className="whitespace-pre-line">{lesson.transcript}</p>
                                        ) : (
                                            <p className="italic text-stone-400">Chưa có nội dung tóm tắt.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CỘT PHẢI: BÀI TẬP (QUIZ) --- */}
                    <div className={`border-l border-stone-200 bg-white flex flex-col transition-all duration-300 ease-in-out ${!isVideoVisible
                        ? "w-full flex-1" // Chế độ tập trung: Full màn hình
                        : !isSidebarOpen
                            ? "flex-1 min-w-0" // Chế độ chia đôi: 50% màn hình
                            : "w-[400px] flex-shrink-0" // Chế độ thường: Cố định 400px
                        }`}>
                        {/* Quiz Header */}
                        <div className={`p-4 border-b border-stone-200 flex items-center gap-2 flex-shrink-0 ${!isVideoVisible ? "bg-white shadow-sm justify-center" : "bg-stone-50"}`}>
                            <CheckCircle className="text-[#C5A059]" size={20} />
                            <div className={!isVideoVisible ? "text-center" : ""}>
                                <h3 className="font-bold text-stone-800 text-sm">Bài tập thực hành</h3>
                                {!isVideoVisible && <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Chế độ tập trung</p>}
                            </div>
                        </div>

                        {/* Quiz Content (Scrollable) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 h-full">

                            {/* 👇 SỬA LỖI Ở ĐÂY: 
                       - Bỏ 'h-full' khi ở chế độ thường.
                       - Dùng 'min-h-full' thay vì 'h-full' để nội dung có thể dãn ra.
                   */}
                            <div className={`transition-all duration-500 ${!isVideoVisible
                                ? "max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-stone-200 p-8 min-h-fit" // Sửa thành min-h-fit hoặc để tự nhiên
                                : "w-full pb-10" // Thêm padding-bottom để không bị sát đáy
                                }`}>
                                <QuizPlayer
                                    lessonId={lesson.id}
                                    questions={formattedQuestions}
                                    initialResult={initialResult}
                                    initialAnswers={userAnswers}
                                />
                            </div>

                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}