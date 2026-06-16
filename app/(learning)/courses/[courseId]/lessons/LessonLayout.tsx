"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    PanelLeftClose,
    PanelLeftOpen,
    Maximize2,
    Minimize2,
    CheckCircle,
    ArrowLeft,
    Clock,
    MoveHorizontal,
    MessageCircle,
    Loader2,
    Sparkles,
    PlayCircle,
    Workflow,
    Brain // Icon for Flashcards
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateConversation } from "@/app/actions/chat";
import CourseSidebar from "@/app/components/CourseSidebar";
import VideoPlayer, { VideoPlayerHandle } from "@/app/components/VideoPlayer";
import QuizPlayer from "../../../../components/courseComponents/QuizPlayer";
import TranscriptTimeline from "@/app/components/TranscriptTimeline";
import VideoChat from "@/app/components/ai/VideoChat";
import MindmapView from "@/app/components/ai/MindmapView";
import FlashcardDeck from "@/app/components/ai/FlashcardDeck";


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
    mindMapData: any; // AI generated mindmap structure
    flashcards: any; // AI generated flashcards
    duration: number | null;
    questions: any[];
};

type CourseData = {
    id: string;
    title: string;
    chapters: any[];
    instructor?: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    } | null;
};

export default function LessonLayout({
    course,
    lesson,
    formattedQuestions,
    initialResult,
    userAnswers,
    allVideoProgress = [],
    allQuizResults = [],
}: {
    course: CourseData;
    lesson: LessonData;
    formattedQuestions: any[];
    initialResult?: any;
    userAnswers?: Record<string, { selectedOption?: string, answerText?: string, fileUrl?: string }>;
    allVideoProgress?: any[];
    allQuizResults?: any[];
}) {
    // State quản lý hiển thị
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isVideoVisible, setIsVideoVisible] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [activeTab, setActiveTab] = useState<'quiz' | 'ai' | 'mindmap' | 'flashcards'>('quiz');

    const router = useRouter();
    const searchParams = useSearchParams();

    // State cho resizable quiz panel
    const [quizPanelWidth, setQuizPanelWidth] = useState(400);

    // Effect: Auto Seek from URL
    useEffect(() => {
        const t = searchParams.get('t');
        if (t && videoPlayerRef.current) {
            // Need a slight delay to ensure player is ready? 
            // Better if VideoPlayer exposes onReady prop, but timeout works for now.
            setTimeout(() => {
                videoPlayerRef.current?.seekTo(Number(t));
                videoContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 1000);
        }
    }, [searchParams]);
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

    // Handle Chat with Instructor
    const handleChatWithInstructor = async () => {
        if (!course.instructor?.id) return alert("Không tìm thấy thông tin giảng viên");

        setIsCreatingChat(true);
        try {
            const res = await getOrCreateConversation(course.instructor.id);
            if (res.success && res.conversationId) {
                router.push(`/messages`);
            } else {
                alert(res.error || "Không thể tạo cuộc trò chuyện");
            }
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra");
        } finally {
            setIsCreatingChat(false);
        }
    };

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
                        allVideoProgress={allVideoProgress}
                        allQuizResults={allQuizResults}
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
                        {/* Nút Chat (NEW) */}
                        {course.instructor && (
                            <button
                                onClick={handleChatWithInstructor}
                                disabled={isCreatingChat}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-600 hover:bg-[#C5A059] hover:text-white transition-colors disabled:opacity-50"
                                title={`Nhắn tin với giảng viên: ${course.instructor.fullName}`}
                            >
                                {isCreatingChat ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                                <span className="hidden sm:inline">Hỏi Giảng viên</span>
                            </button>
                        )}

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
                            transition-colors duration-200 relative group z-20
                            ${isVideoVisible ? 'bg-stone-200' : 'hidden'}
                            ${isDragging ? '!bg-[#C5A059]' : ''}`}
                    >
                        {/* Visual indicator icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-6 h-6 bg-white border border-stone-200 shadow-sm rounded-full flex items-center justify-center text-stone-500">
                                <MoveHorizontal size={14} />
                            </div>
                        </div>
                    </div>

                    {/* --- CỘT PHẢI: BÀI TẬP (QUIZ) & AI CHAT & MINDMAP & FLASHCARDS --- */}
                    <div
                        className={`border-l border-stone-200 bg-white flex flex-col transition-all ease-in-out ${!isVideoVisible
                            ? "w-full flex-1 duration-300" // Chế độ tập trung: Full màn hình
                            : !isSidebarOpen
                                ? "flex-1 min-w-0 duration-300" // Chế độ chia đôi: 50% màn hình
                                : "flex-shrink-0 duration-0" // Chế độ thường: width động
                            }`}
                        style={isVideoVisible && isSidebarOpen ? { width: `${quizPanelWidth}px` } : undefined}
                    >
                        {/* Right Panel Tabs */}
                        <div className="flex border-b border-stone-200 bg-stone-50 overflow-x-auto custom-scrollbar">
                            <button
                                onClick={() => setActiveTab('quiz')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors min-w-fit px-2 ${activeTab === 'quiz' ? 'bg-white text-stone-800 border-b-2 border-[#C5A059]' : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                <CheckCircle size={16} /> <span className="hidden xl:inline">Bài tập</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors min-w-fit px-2 ${activeTab === 'ai' ? 'bg-white text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                <Sparkles size={16} /> <span className="hidden xl:inline">AI Tutor</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('mindmap')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors min-w-fit px-2 ${activeTab === 'mindmap' ? 'bg-white text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                <Workflow size={16} /> <span className="hidden xl:inline">Mindmap</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('flashcards')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors min-w-fit px-2 ${activeTab === 'flashcards' ? 'bg-white text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                <Brain size={16} /> <span className="hidden xl:inline">Flashcards</span>
                            </button>
                        </div>

                        {/* Content Area */}

                        {activeTab === 'quiz' && (
                            // Render Quiz Logic
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 h-full relative">
                                {!isVideoVisible && <p className="text-center text-xs text-stone-400 font-bold uppercase tracking-widest mb-4">Chế độ tập trung</p>}
                                <div className={`transition-all duration-500 ${!isVideoVisible
                                    ? "max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-stone-200 p-8 min-h-fit"
                                    : "w-full pb-10"
                                    }`}>
                                    <QuizPlayer
                                        lessonId={lesson.id}
                                        questions={formattedQuestions}
                                        initialResult={initialResult}
                                        initialAnswers={userAnswers}
                                        onSeek={handleSeekToTime}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            // Render AI Chat Logic
                            <div className={`flex-1 overflow-hidden h-full ${!isVideoVisible ? "max-w-3xl mx-auto w-full border-x border-stone-200" : ""}`}>
                                <VideoChat
                                    lessonId={lesson.id}
                                    onSeek={handleSeekToTime}
                                />
                            </div>
                        )}

                        {activeTab === 'mindmap' && (
                            // Render Mindmap Logic
                            <div className={`flex-1 overflow-hidden h-full ${!isVideoVisible ? "max-w-5xl mx-auto w-full border-x border-stone-200" : ""}`}>
                                <MindmapView
                                    data={lesson.mindMapData}
                                    onSeek={handleSeekToTime}
                                />
                            </div>
                        )}

                        {activeTab === 'flashcards' && (
                            // Render Flashcards Logic
                            <div className={`flex-1 overflow-hidden h-full ${!isVideoVisible ? "max-w-5xl mx-auto w-full border-x border-stone-200" : ""}`}>
                                <FlashcardDeck
                                    cards={lesson.flashcards}
                                    onSeek={handleSeekToTime}
                                />
                            </div>
                        )}

                    </div>

                </div>
            </div>

        </div>
    );
}