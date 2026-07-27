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
    Workflow,
    Brain
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getOrCreateConversation } from "@/app/actions/chat";
import CourseSidebar from "@/app/components/CourseSidebar";
import VideoPlayer, { VideoPlayerHandle } from "@/app/components/VideoPlayer";
import QuizPlayer from "../../../../components/courseComponents/QuizPlayer";
import TranscriptTimeline from "@/app/components/TranscriptTimeline";
import JarvisAssistant from "@/app/components/ai/JarvisAssistant";
import MindmapView from "@/app/components/ai/MindmapView";
import FlashcardDeck from "@/app/components/ai/FlashcardDeck";
import ThemeSwitcher from "@/app/components/ThemeSwitcher";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
    mindMapData: any;
    flashcards: any;
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
    userAnswers?: Record<string, { selectedOption?: string, answerText?: string, fileUrl?: string, subItemAnswers?: Record<string, boolean> }>;
    allVideoProgress?: any[];
    allQuizResults?: any[];
}) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isVideoVisible, setIsVideoVisible] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [activeTab, setActiveTab] = useState<'quiz' | 'ai' | 'mindmap' | 'flashcards'>('quiz');

    const router = useRouter();
    const searchParams = useSearchParams();

    const [quizPanelWidth, setQuizPanelWidth] = useState(440);

    const videoPlayerRef = useRef<VideoPlayerHandle>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timeParam = searchParams.get('t');
        if (timeParam && videoPlayerRef.current) {
            setTimeout(() => {
                videoPlayerRef.current?.seekTo(Number(timeParam));
                videoContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 1000);
        }
    }, [searchParams]);

    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(440);

    const handleSeekToTime = useCallback((seconds: number) => {
        videoPlayerRef.current?.seekTo(seconds);
        videoContainerRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }, []);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartX.current = e.clientX;
        dragStartWidth.current = quizPanelWidth;
    }, [quizPanelWidth]);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        const deltaX = dragStartX.current - e.clientX;
        const newWidth = Math.min(Math.max(dragStartWidth.current + deltaX, 320), 800);
        setQuizPanelWidth(newWidth);
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

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

    const handleChatWithInstructor = async () => {
        if (!course.instructor?.id) return alert(t("course.noInstructorInfo", "Không tìm thấy thông tin giảng viên"));

        setIsCreatingChat(true);
        try {
            const res = await getOrCreateConversation(course.instructor.id);
            if (res.success && res.conversationId) {
                router.push(`/messages`);
            } else {
                alert(res.error || t("course.cannotCreateChat", "Không thể tạo cuộc trò chuyện"));
            }
        } catch (error) {
            console.error(error);
            alert(t("common.errorOccurred", "Có lỗi xảy ra"));
        } finally {
            setIsCreatingChat(false);
        }
    };

    return (
        <div className={`flex h-screen w-full transition-colors duration-500 overflow-hidden ${
            isDark ? "bg-[#080808] text-white" : "bg-[#F4F3EE] text-stone-900"
        }`}>

            {/* --- 1. LEFT SIDEBAR (Collapsible Course Tree) --- */}
            <div
                className={`flex-shrink-0 border-r transition-all duration-300 ease-in-out relative ${
                    isSidebarOpen ? "w-80" : "w-0 opacity-0 overflow-hidden"
                } ${isDark ? "bg-[#0e0e0e] border-white/10" : "bg-white border-stone-200"}`}
            >
                <div className="h-full overflow-y-auto custom-scrollbar">
                    {/* Back link */}
                    <div className={`p-4 border-b sticky top-0 z-10 backdrop-blur-md ${
                        isDark ? "border-white/10 bg-[#0e0e0e]/90" : "border-stone-200 bg-white/90"
                    }`}>
                        <Link
                            href={`/courses/${course.id}`}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C5A059] hover:underline"
                        >
                            <ArrowLeft size={14} /> {t("course.overview", "Tổng quan khóa học")}
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

            {/* --- 2. MAIN WORKSPACE (Center + Right) --- */}
            <div className="flex-1 flex flex-col min-w-0 h-full">

                {/* Top Control Bar (Cleanly Separated Top Workspace Header) */}
                <div className={`h-16 border-b flex items-center justify-between px-6 flex-shrink-0 backdrop-blur-md z-30 shadow-sm ${
                    isDark ? "bg-[#0e0e0e]/95 border-white/10 text-white" : "bg-white/95 border-stone-200 text-stone-900"
                }`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`p-2 rounded-xl transition-colors shrink-0 ${
                                isDark ? "hover:bg-white/10 text-stone-300" : "hover:bg-stone-100 text-stone-600"
                            }`}
                            title={isSidebarOpen ? t("course.collapseSidebar", "Thu gọn danh sách bài") : t("course.expandSidebar", "Mở danh sách bài")}
                        >
                            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                        </button>
                        <h1 className={`font-serif font-bold text-base md:text-lg truncate ${
                            isDark ? "text-white" : "text-stone-900"
                        }`}>
                            {lesson.title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <ThemeSwitcher />
                        <LanguageSwitcher />

                        {/* Ask Instructor Button */}
                        {course.instructor && (
                            <button
                                onClick={handleChatWithInstructor}
                                disabled={isCreatingChat}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                                    isDark
                                        ? "bg-white/10 text-stone-200 border-white/10 hover:bg-[#C5A059] hover:text-[#080808]"
                                        : "bg-stone-100 text-stone-700 border-stone-200 hover:bg-[#C5A059] hover:text-white"
                                } disabled:opacity-50`}
                                title={`Nhắn tin với giảng viên: ${course.instructor.fullName}`}
                            >
                                {isCreatingChat ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                                <span className="hidden sm:inline">{t("course.askInstructor", "Hỏi Giảng viên")}</span>
                            </button>
                        )}

                        {/* Focus / Video Mode Toggle Button */}
                        <button
                            onClick={() => setIsVideoVisible(!isVideoVisible)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                                !isVideoVisible
                                    ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176]"
                                    : isDark
                                    ? "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                    : "bg-stone-900 text-white hover:bg-stone-800"
                            }`}
                        >
                            {!isVideoVisible ? (
                                <><Maximize2 size={14} /> {t("course.showVideo", "Hiện Video")}</>
                            ) : (
                                <><Minimize2 size={14} /> {t("course.focusMode", "Tập trung làm bài")}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Workspace Area: Video (Center) + Quiz/AI/Mindmap (Right) */}
                <div className="flex-1 flex overflow-hidden">

                    {/* --- CENTER COLUMN: VIDEO & TIMELINE --- */}
                    <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 transition-all duration-300 ${
                        !isVideoVisible ? "hidden" : ""
                    } ${!isSidebarOpen ? "min-w-0" : "min-w-[360px]"}`}>
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Video Player */}
                            <div ref={videoContainerRef} className="transition-all duration-500">
                                <VideoPlayer
                                    ref={videoPlayerRef}
                                    videoId={lesson.youtubeVideoId || ""}
                                    lessonId={lesson.id}
                                    title={lesson.title}
                                    description=""
                                />
                            </div>

                            {/* Timeline Section */}
                            <div className={`p-6 rounded-3xl transition-all liquid-glass ${
                                isDark ? "text-white" : "text-stone-900 shadow-md"
                            }`}>
                                <h3 className={`font-serif text-lg font-bold mb-4 flex items-center gap-2 ${
                                    isDark ? "text-white" : "text-stone-900"
                                }`}>
                                    <Clock size={20} className="text-[#C5A059]" />
                                    {t("course.timeline", "Mốc thời gian bài giảng")}
                                </h3>
                                <TranscriptTimeline
                                    timeline={lesson.timeline}
                                    onSeek={handleSeekToTime}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- DRAG HANDLE to resize right panel --- */}
                    <div
                        onMouseDown={handleDragStart}
                        className={`w-1.5 hover:bg-[#C5A059] cursor-col-resize flex-shrink-0 
                            transition-colors duration-200 relative group z-20
                            ${isVideoVisible ? (isDark ? 'bg-white/10' : 'bg-stone-200') : 'hidden'}
                            ${isDragging ? '!bg-[#C5A059]' : ''}`}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shadow-md ${
                                isDark ? "bg-[#0e0e0e] border-white/20 text-[#C5A059]" : "bg-white border-stone-300 text-stone-700"
                            }`}>
                                <MoveHorizontal size={14} />
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT COLUMN: QUIZ / AI / MINDMAP / FLASHCARDS --- */}
                    <div
                        className={`border-l flex flex-col transition-all ease-in-out ${
                            isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                        } ${!isVideoVisible
                            ? "w-full flex-1 duration-300"
                            : !isSidebarOpen
                                ? "flex-1 min-w-0 duration-300"
                                : "flex-shrink-0 duration-0"
                        }`}
                        style={isVideoVisible && isSidebarOpen ? { width: `${quizPanelWidth}px` } : undefined}
                    >
                        {/* Right Panel Tabs */}
                        <div className={`flex border-b overflow-x-auto custom-scrollbar ${
                            isDark ? "bg-white/5 border-white/10" : "bg-stone-100/80 border-stone-200"
                        }`}>
                            <button
                                onClick={() => setActiveTab('quiz')}
                                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-fit px-3 ${
                                    activeTab === 'quiz'
                                        ? isDark
                                            ? 'bg-[#0e0e0e] text-[#C5A059] border-b-2 border-[#C5A059]'
                                            : 'bg-white text-stone-900 border-b-2 border-[#C5A059]'
                                        : isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <CheckCircle size={16} /> <span className="hidden xl:inline">{t("course.quizTab", "Bài tập")}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-fit px-3 ${
                                    activeTab === 'ai'
                                        ? isDark
                                            ? 'bg-[#0e0e0e] text-[#C5A059] border-b-2 border-[#C5A059]'
                                            : 'bg-white text-[#C5A059] border-b-2 border-[#C5A059]'
                                        : isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Sparkles size={16} /> <span className="hidden xl:inline">AI Tutor</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('mindmap')}
                                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-fit px-3 ${
                                    activeTab === 'mindmap'
                                        ? isDark
                                            ? 'bg-[#0e0e0e] text-[#C5A059] border-b-2 border-[#C5A059]'
                                            : 'bg-white text-[#C5A059] border-b-2 border-[#C5A059]'
                                        : isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Workflow size={16} /> <span className="hidden xl:inline">Mindmap</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('flashcards')}
                                className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-fit px-3 ${
                                    activeTab === 'flashcards'
                                        ? isDark
                                            ? 'bg-[#0e0e0e] text-[#C5A059] border-b-2 border-[#C5A059]'
                                            : 'bg-white text-[#C5A059] border-b-2 border-[#C5A059]'
                                        : isDark ? 'text-stone-400 hover:text-white' : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                <Brain size={16} /> <span className="hidden xl:inline">Flashcards</span>
                            </button>
                        </div>

                        {/* Content Area */}
                        {activeTab === 'quiz' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 h-full relative">
                                {!isVideoVisible && (
                                    <p className="text-center text-xs text-[#C5A059] font-bold uppercase tracking-widest mb-4">
                                        {t("course.focusModeActive", "Chế độ tập trung làm bài")}
                                    </p>
                                )}
                                <div className={`transition-all duration-500 ${!isVideoVisible
                                    ? "max-w-3xl mx-auto rounded-3xl p-8 min-h-fit liquid-glass"
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
                            <div className={`flex-1 overflow-hidden h-full ${!isVideoVisible ? "max-w-3xl mx-auto w-full border-x border-white/10" : ""}`}>
                                <JarvisAssistant
                                    lessonId={lesson.id}
                                    onSeek={handleSeekToTime}
                                    onOpenTab={setActiveTab}
                                />
                            </div>
                        )}

                        {activeTab === 'mindmap' && (
                            <div className={`flex-1 overflow-hidden h-full ${!isVideoVisible ? "max-w-5xl mx-auto w-full border-x border-white/10" : ""}`}>
                                <MindmapView
                                    data={lesson.mindMapData}
                                    onSeek={handleSeekToTime}
                                />
                            </div>
                        )}

                        {activeTab === 'flashcards' && (
                            <div className={`flex-1 overflow-hidden h-full ${!isVideoVisible ? "max-w-5xl mx-auto w-full border-x border-white/10" : ""}`}>
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