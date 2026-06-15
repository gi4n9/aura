"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play, ChevronDown, BarChart3, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import AIStudyPlannerModal from "./study-plan/AIStudyPlannerModal";

// --- TYPE DEFINITIONS ---
type LessonItem = {
  id: string;
  title: string;
  // Cho phép null để khớp với Prisma
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

import LessonProgressBar from "./courseComponents/LessonProgressBar";

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
    <div className="flex flex-col w-full h-full bg-white flex-shrink-0">

      {/* Sidebar Header */}
      <div className="p-5 border-b border-stone-100 bg-[#F9F8F4]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif font-bold text-lg text-[#1a1a1a]">Nội dung khóa học</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded">
            {totalLessons} Bài
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setIsPlanModalOpen(true)}
            className="flex-1 text-[11px] font-bold text-white bg-[#1a1a1a] hover:bg-[#C5A059] px-2 py-1.5 rounded transition-colors flex items-center justify-center gap-1 shadow-sm"
          >
            <Sparkles size={12} /> Lập kế hoạch
          </button>
          <Link href={`/courses/${courseId}/progress`} className="flex-1 text-[11px] font-bold text-stone-500 hover:text-[#C5A059] border border-stone-200 px-2 py-1.5 rounded bg-white hover:border-[#C5A059] transition-colors flex items-center justify-center gap-1 text-center">
            <BarChart3 size={12} /> Tiến độ
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
          <div key={chapter.id} className="bg-stone-50 rounded-xl overflow-hidden border border-stone-200">
            {/* Chapter Header */}
            <div className="p-4 bg-white border-b border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mb-1 block">
                  Chapter {chapter.lessons[0]?.position ? Math.ceil(chapter.lessons[0].position / 10) : 1}
                </span>
                <h3 className="font-serif font-bold text-[#1a1a1a] text-sm leading-tight">
                  {chapter.title}
                </h3>
              </div>
              <ChevronDown size={16} className="text-stone-400" />
            </div>

            {/* Lessons */}
            <div className="divide-y divide-stone-100">
              {chapter.lessons.map((lesson) => {
                const isActive = lesson.id === currentVideoId;
                
                // --- Tiết xuất Progress Data ---
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
                    className={`block p-4 group transition-all duration-300 relative ${isActive
                        ? "bg-[#F9F8F4]"
                        : "hover:bg-white"
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C5A059]"></div>
                    )}
                    
                    <div className="flex gap-4">
                      {/* Thumbnail/Icon */}
                      <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-stone-200 flex-shrink-0 border border-stone-200 shadow-sm">
                        {lesson.youtubeVideoId ? (
                          <Image
                            src={`https://img.youtube.com/vi/${lesson.youtubeVideoId}/mqdefault.jpg`}
                            alt={lesson.title}
                            fill
                            unoptimized
                            className={`object-cover transition-transform duration-700 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                            <Play size={16} className="text-stone-400" />
                          </div>
                        )}

                        {isActive ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]/40">
                            <div className="flex gap-0.5 items-end h-3">
                              <div className="w-1 bg-[#C5A059] animate-[bounce_1s_infinite] h-2"></div>
                              <div className="w-1 bg-[#C5A059] animate-[bounce_1.2s_infinite] h-3"></div>
                              <div className="w-1 bg-[#C5A059] animate-[bounce_0.8s_infinite] h-1.5"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                            <Play size={16} className="text-white opacity-0 group-hover:opacity-100 fill-white" />
                          </div>
                        )}
                      </div>

                      {/* Info Area */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-bold mt-0.5 flex-shrink-0 ${isActive ? 'text-[#C5A059]' : 'text-stone-300'}`}>
                            {String(lesson.position).padStart(2, '0')}
                          </span>
                          <h4
                            className={`text-sm font-medium line-clamp-2 leading-snug ${isActive ? "text-[#1a1a1a]" : "text-stone-600 group-hover:text-[#1a1a1a]"
                              }`}
                          >
                            {lesson.title}
                          </h4>
                        </div>

                        {isActive && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A059] mt-1.5 flex items-center gap-1 animate-pulse">
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