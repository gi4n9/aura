"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play, ChevronDown, BarChart3, Sparkles } from "lucide-react";
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
    <div className={`flex flex-col w-full h-full flex-shrink-0 transition-colors duration-500 ${
      isDark ? "bg-[#0e0e0e] text-white" : "bg-white text-stone-900"
    }`}>

      {/* Sidebar Header */}
      <div className={`p-5 border-b ${
        isDark ? "border-white/10 bg-white/5" : "border-stone-200 bg-[#F9F8F4]"
      }`}>
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
            className="flex-1 text-[11px] font-bold text-[#080808] bg-[#C5A059] hover:bg-[#e9c176] px-2.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm uppercase tracking-wider"
          >
            <Sparkles size={13} /> {t("courseSidebar.planner", "Lập kế hoạch")}
          </button>
          <Link
            href={`/courses/${courseId}/progress`}
            className={`flex-1 text-[11px] font-bold px-2.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-center uppercase tracking-wider ${
              isDark
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
        {chapters.map((chapter) => (
          <div key={chapter.id} className={`rounded-2xl overflow-hidden border transition-all ${
            isDark ? "bg-white/5 border-white/10" : "bg-stone-50 border-stone-200"
          }`}>
            {/* Chapter Header */}
            <div className={`p-4 flex items-center justify-between border-b ${
              isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-100"
            }`}>
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#C5A059] mb-0.5 block">
                  Chapter {chapter.lessons[0]?.position ? Math.ceil(chapter.lessons[0].position / 10) : 1}
                </span>
                <h3 className="font-serif font-bold text-sm leading-tight">
                  {chapter.title}
                </h3>
              </div>
              <ChevronDown size={16} className={isDark ? "text-stone-400" : "text-stone-500"} />
            </div>

            {/* Lessons */}
            <div className={`divide-y ${isDark ? "divide-white/5" : "divide-stone-100"}`}>
              {chapter.lessons.map((lesson) => {
                const isActive = lesson.id === currentVideoId;
                
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
                    className={`block p-4 group transition-all duration-300 relative ${
                      isActive
                        ? isDark ? "bg-[#C5A059]/15" : "bg-amber-50/60"
                        : isDark ? "hover:bg-white/5" : "hover:bg-white"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C5A059]"></div>
                    )}
                    
                    <div className="flex gap-3.5">
                      {/* Thumbnail/Icon */}
                      <div className={`relative w-24 aspect-video rounded-xl overflow-hidden flex-shrink-0 border shadow-sm ${
                        isDark ? "bg-stone-900 border-white/10" : "bg-stone-200 border-stone-200"
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
                          <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/60">
                            <div className="flex gap-0.5 items-end h-3">
                              <div className="w-1 bg-[#C5A059] animate-[bounce_1s_infinite] h-2"></div>
                              <div className="w-1 bg-[#C5A059] animate-[bounce_1.2s_infinite] h-3"></div>
                              <div className="w-1 bg-[#C5A059] animate-[bounce_0.8s_infinite] h-1.5"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                            <Play size={16} className="text-white opacity-0 group-hover:opacity-100 fill-white" />
                          </div>
                        )}
                      </div>

                      {/* Info Area */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold mt-0.5 flex-shrink-0 ${isActive ? 'text-[#C5A059]' : isDark ? 'text-stone-500' : 'text-stone-400'}`}>
                            {String(lesson.position).padStart(2, '0')}
                          </span>
                          <h4
                            className={`text-xs font-semibold line-clamp-2 leading-snug transition-colors ${
                              isActive
                                ? "text-[#C5A059]"
                                : isDark ? "text-stone-300 group-hover:text-white" : "text-stone-700 group-hover:text-stone-900"
                            }`}
                          >
                            {lesson.title}
                          </h4>
                        </div>

                        {isActive && (
                          <span className="text-[9px] uppercase font-bold tracking-widest text-[#C5A059] mt-1.5 flex items-center gap-1 animate-pulse">
                            Now Playing
                          </span>
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
          </div>
        ))}
      </div>
    </div>
  );
}