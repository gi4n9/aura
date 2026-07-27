"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play, ChevronDown, BarChart3, Sparkles, Volume2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import AIStudyPlannerModal from "./study-plan/AIStudyPlannerModal";
import LessonProgressBar from "./courseComponents/LessonProgressBar";

// --- TYPE DEFINITIONS ---
type LessonItem = {
  id: string;
  title: string;
  youtubeVideoId: string | null;
  position: number;
  duration: number | null;
  _count?: {
    questions: number;
  };
};

type ChapterItem = {
  id: string;
  title: string;
  lessons: LessonItem[];
};

export default function CourseSidebar({
  courseId,
  chapters,
  currentVideoId,
  allVideoProgress = [],
  allQuizResults = [],
}: {
  courseId: string;
  chapters: ChapterItem[];
  currentVideoId: string;
  allVideoProgress?: any[];
  allQuizResults?: any[];
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const pathName = usePathname();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  // Helper to check if a lesson is the current active lesson (by id or youtubeVideoId)
  const isLessonActive = (l: LessonItem) => {
    if (!currentVideoId) return false;
    return l.id === currentVideoId || (!!l.youtubeVideoId && l.youtubeVideoId === currentVideoId);
  };

  // Auto-expand ONLY the chapter containing currentVideoId, collapse all other chapters
  useEffect(() => {
    if (currentVideoId && chapters.length > 0) {
      const activeChapter = chapters.find((ch) =>
        ch.lessons.some((l) => isLessonActive(l))
      );

      const initialCollapsedState: Record<string, boolean> = {};
      chapters.forEach((ch) => {
        initialCollapsedState[ch.id] = activeChapter ? ch.id !== activeChapter.id : false;
      });

      setCollapsedChapters(initialCollapsedState);
    }
  }, [currentVideoId, chapters]);

  const toggleChapter = (chapterId: string) => {
    setCollapsedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentVideoId]);

  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);

  return (
    <div className={`flex flex-col w-full h-full flex-shrink-0 transition-colors duration-500 ${isDark ? "bg-[#0e0e0e] text-white" : "bg-white text-stone-900"
      }`}>

      {/* Sidebar Header */}
      <div className={`p-5 border-b ${isDark ? "border-white/10 bg-white/5" : "border-stone-200 bg-[#F9F8F4]"}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif font-bold text-base leading-tight">
            {t("courseSidebar.content", "Nội dung khóa học")}
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] bg-[#C5A059]/15 px-2.5 py-0.5 rounded-full border border-[#C5A059]/30">
            {totalLessons} {t("courseSidebar.lessons", "Bài")}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setIsPlanModalOpen(true)}
            className="flex-1 text-[11px] font-bold text-[#080808] bg-[#C5A059] hover:bg-[#e9c176] px-2.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm uppercase tracking-wider cursor-pointer"
          >
            <Sparkles size={13} /> {t("courseSidebar.planner", "Lập kế hoạch")}
          </button>
          <Link
            href={`/courses/${courseId}/progress`}
            className={`flex-1 text-[11px] font-bold px-2.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-center uppercase tracking-wider ${isDark
              ? "text-stone-300 border border-white/10 bg-white/5 hover:border-[#C5A059] hover:text-[#C5A059]"
              : "text-stone-600 border border-stone-200 bg-white hover:border-[#C5A059] hover:text-[#C5A059]"
              }`}
          >
            <BarChart3 size={13} /> {t("courseSidebar.progress", "Tiến độ")}
          </Link>
        </div>
      </div>

      <AIStudyPlannerModal
        courseId={courseId}
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
      />

      {/* Chapters List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {chapters.map((chapter, idx) => {
          const isCollapsed = collapsedChapters[chapter.id] || false;
          const hasActiveLesson = chapter.lessons.some((l) => isLessonActive(l));

          return (
            <div key={chapter.id} className={`rounded-2xl overflow-hidden border transition-all ${
              hasActiveLesson
                ? isDark ? "border-[#C5A059]/50 bg-[#C5A059]/10 shadow-lg shadow-[#C5A059]/5" : "border-[#C5A059]/50 bg-amber-50/40 shadow-sm"
                : isDark ? "bg-white/5 border-white/10" : "bg-stone-50 border-stone-200"
              }`}>
              {/* Chapter Header - Clickable for Collapse/Expand */}
              <div
                onClick={() => toggleChapter(chapter.id)}
                className={`p-4 flex items-center justify-between border-b cursor-pointer select-none transition-colors ${
                  hasActiveLesson
                    ? isDark ? "bg-[#C5A059]/20 border-[#C5A059]/30" : "bg-amber-100/80 border-amber-200"
                    : isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-stone-100 hover:bg-stone-100/60"
                  }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#C5A059] block">
                      Chapter {idx + 1}
                    </span>
                    {hasActiveLesson && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C5A059] text-[#080808] flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#080808] animate-ping" />
                        <span>Đang học</span>
                      </span>
                    )}
                  </div>
                  <h3 className={`font-serif font-bold text-sm leading-tight ${
                    hasActiveLesson ? "text-[#C5A059]" : ""
                  }`}>
                    {chapter.title}
                  </h3>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${isDark ? "text-stone-400" : "text-stone-500"
                    } ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                />
              </div>

              {/* Lessons List (Collapsible) */}
              {!isCollapsed && (
                <div className={`divide-y ${isDark ? "divide-white/5" : "divide-stone-100"}`}>
                  {chapter.lessons.map((lesson) => {
                    const isActive = isLessonActive(lesson);

                    const vp = allVideoProgress.find((p: any) => p.lessonId === lesson.id);
                    const videoPercentage = vp ? vp.percentage : 0;

                    const hasQuiz = (lesson._count?.questions || 0) > 0;
                    const qr = allQuizResults.find((q: any) => q.lessonId === lesson.id);
                    const isQuizPassed = qr ? qr.isPassed : false;

                    return (
                      <Link
                        key={lesson.id}
                        href={`/courses/${courseId}/lessons/${lesson.id}`}
                        ref={isActive ? activeRef : null}
                        className={`block p-4 group transition-all duration-300 relative border-l-4 ${
                          isActive
                            ? isDark
                              ? "bg-[#C5A059]/25 border-l-[#C5A059] shadow-md"
                              : "bg-amber-100/90 border-l-[#C5A059] shadow-sm"
                            : isDark
                              ? "border-l-transparent hover:bg-white/5"
                              : "border-l-transparent hover:bg-white"
                          }`}
                      >
                        <div className="flex gap-3.5">
                          {/* Thumbnail/Icon */}
                          <div className={`relative w-24 aspect-video rounded-xl overflow-hidden flex-shrink-0 border shadow-sm ${
                            isActive
                              ? "border-[#C5A059] ring-2 ring-[#C5A059]/60 shadow-lg"
                              : isDark ? "bg-stone-900 border-white/10" : "bg-stone-200 border-stone-200"
                            }`}>
                            {lesson.youtubeVideoId ? (
                              <Image
                                src={`https://img.youtube.com/vi/${lesson.youtubeVideoId}/mqdefault.jpg`}
                                alt={lesson.title}
                                fill
                                unoptimized
                                className={`object-cover transition-transform duration-700 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play size={16} className="text-[#C5A059]" />
                              </div>
                            )}

                            {isActive ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/70 backdrop-blur-[1px]">
                                <div className="flex gap-1 items-end h-3.5">
                                  <div className="w-1 bg-[#C5A059] animate-[bounce_0.8s_infinite] h-3.5 rounded-full"></div>
                                  <div className="w-1 bg-[#C5A059] animate-[bounce_1.2s_infinite] h-2 rounded-full"></div>
                                  <div className="w-1 bg-[#C5A059] animate-[bounce_1.0s_infinite] h-3 rounded-full"></div>
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                                <Play size={16} className="text-white opacity-0 group-hover:opacity-100 fill-white" />
                              </div>
                            )}
                          </div>

                          {/* Info Area */}
                          <div className="flex flex-col min-w-0 flex-1 justify-center">
                            <div className="flex items-start gap-2">
                              <span className={`text-[10px] font-bold mt-0.5 flex-shrink-0 ${isActive ? 'text-[#C5A059]' : isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                                {String(lesson.position).padStart(2, '0')}
                              </span>
                              <h4
                                className={`text-xs font-bold line-clamp-2 leading-snug transition-colors ${isActive
                                  ? "text-[#C5A059]"
                                  : isDark ? "text-stone-300 group-hover:text-white" : "text-stone-700 group-hover:text-stone-900"
                                  }`}
                              >
                                {lesson.title}
                              </h4>
                            </div>

                            {isActive && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C5A059] text-[#080808] text-[9px] font-black uppercase tracking-wider shadow-sm mt-2 w-fit">
                                <Volume2 size={11} className="animate-pulse" />
                                <span>Đang học</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* DUAL PROGRESS BAR */}
                        <div className="mt-3">
                          <LessonProgressBar
                            videoPercentage={videoPercentage}
                            hasQuiz={hasQuiz}
                            isQuizPassed={isQuizPassed}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}