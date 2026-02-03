"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    PanelLeftClose,
    PanelLeftOpen,
    Maximize2,
    Minimize2,
    CheckCircle,
    ArrowLeft,
    Clock
} from "lucide-react";
import Link from "next/link";
import CourseSidebar from "@/app/components/CourseSidebar";
import VideoPlayer, { VideoPlayerHandle } from "@/app/components/VideoPlayer";
import QuizPlayer from "../../../../components/courseComponents/QuizPlayer";
import TranscriptTimeline from "@/app/components/TranscriptTimeline";


// Định nghĩa lại các Type cần thiết
type TimelineItem = {
    time: number;
    label: string;
};

type LessonData = {
    id: string;
    title: string;
    youtubeVideoId: string | null;
    transcript: string | null;
    timeline: TimelineItem[] | null;
    duration: number | null;
    questions: any[];
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

    // State cho resizable quiz panel
    const [quizPanelWidth, setQuizPanelWidth] = useState(400);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(400);

    // Ref để control video player và container
    const videoPlayerRef = useRef<VideoPlayerHandle>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    // Handler để seek video từ timeline + scroll đến video
    const handleSeekToTime = useCallback((seconds: number) => {
        // Seek video đến mốc thời gian
        videoPlayerRef.current?.seekTo(seconds);

        // Scroll đến video container với animation mượt
        videoContainerRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, []);

    // Handlers cho drag resize
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartX.current = e.clientX;
        dragStartWidth.current = quizPanelWidth;
    }, [quizPanelWidth]);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const deltaX = dragStartX.current - e.clientX;
        const newWidth = Math.min(Math.max(dragStartWidth.current + deltaX, 300), 800);
        setQuizPanelWidth(newWidth);
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Effect để add/remove mouse event listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

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
                    <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#F9F8F4] transition-all duration-300 ${!isVideoVisible ? "hidden" : ""
                        } ${!isSidebarOpen ? "min-w-0" : "min-w-[400px]"
                        }`}>
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Video Player */}
                            <div ref={videoContainerRef}>
                                <VideoPlayer
                                    ref={videoPlayerRef}
                                    videoId={lesson.youtubeVideoId || ""}
                                    lessonId={lesson.id}
                                    title={lesson.title}
                                    description=""
                                />
                            </div>

                            {/* Timeline Section - Click để nhảy đến mốc thời gian */}
                            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                                <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2 text-stone-800">
                                    <Clock size={20} className="text-[#C5A059]" />
                                    Mốc thời gian bài giảng
                                </h3>
                                <TranscriptTimeline
                                    timeline={lesson.timeline}
                                    onSeek={handleSeekToTime}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- DRAG HANDLE để resize quiz panel --- */}
                    <div
                        onMouseDown={handleDragStart}
                        className={`w-1.5 hover:bg-[#C5A059] cursor-col-resize flex-shrink-0 
                            transition-colors duration-200 relative group
                            ${isVideoVisible ? 'bg-stone-200' : 'hidden'}
                            ${isDragging ? '!bg-[#C5A059]' : ''}`}
                    >
                        {/* Visual indicator */}
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-1 h-8 bg-[#C5A059] rounded-full" />
                        </div>
                    </div>

                    {/* --- CỘT PHẢI: BÀI TẬP (QUIZ) --- */}
                    <div
                        className={`border-l border-stone-200 bg-white flex flex-col transition-all ease-in-out ${!isVideoVisible
                            ? "w-full flex-1 duration-300" // Chế độ tập trung: Full màn hình
                            : !isSidebarOpen
                                ? "flex-1 min-w-0 duration-300" // Chế độ chia đôi: 50% màn hình
                                : "flex-shrink-0 duration-0" // Chế độ thường: width động
                            }`}
                        style={isVideoVisible && isSidebarOpen ? { width: `${quizPanelWidth}px` } : undefined}
                    >
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