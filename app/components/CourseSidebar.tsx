"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Play, ChevronDown } from "lucide-react";

// --- 1. SỬA TYPE DEFINITION Ở ĐÂY ---
type LessonItem = {
  id: string;
  title: string;
  // Cho phép null để khớp với Prisma
  youtubeVideoId: string | null;
  position: number;
  duration: number | null;
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
}: {
  courseId: string;
  chapters: ChapterItem[];
  currentVideoId: string;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

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
    <div className="flex flex-col w-full h-[600px] lg:h-auto lg:aspect-[7/9] bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm flex-shrink-0">

      {/* Sidebar Header */}
      <div className="p-5 border-b border-stone-100 bg-[#F9F8F4]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif font-bold text-lg text-[#1a1a1a]">Nội dung khóa học</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded">
            {totalLessons} Bài
          </span>
        </div>
        <p className="text-xs text-stone-400 font-serif italic">Tiến độ học tập của bạn</p>
      </div>

      {/* Chapter & Lesson List */}
      <div className="overflow-y-auto flex-1 custom-scrollbar bg-white">
        {chapters.map((chapter) => (
          <div key={chapter.id} className="border-b border-stone-50 last:border-0">
            <div className="px-4 py-3 bg-stone-50/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 line-clamp-1">
                {chapter.title}
              </h4>
              <ChevronDown size={14} className="text-stone-300" />
            </div>

            <div className="p-2 space-y-1">
              {chapter.lessons.map((lesson) => {
                // --- 2. XỬ LÝ FALLBACK KHI VIDEO ID LÀ NULL ---
                const videoId = lesson.youtubeVideoId || "";
                const isActive = videoId === currentVideoId;

                return (
                  <Link
                    key={lesson.id}
                    // Dùng biến videoId đã xử lý fallback
                    href={`/courses/${courseId}?videoId=${videoId}`}
                    ref={isActive ? activeRef : null}
                    className={`flex gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${isActive
                        ? "bg-[#F9F8F4] border-[#C5A059]/30 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-stone-50"
                      }`}
                  >
                    {/* Thumbnail Area */}
                    <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-stone-200 border border-stone-100">
                      {/* Chỉ render ảnh nếu có videoId */}
                      {videoId ? (
                        <Image
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt={lesson.title}
                          fill
                          className={`object-cover transition-opacity ${isActive ? 'opacity-80' : 'opacity-100'}`}
                          unoptimized={true}
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-300 flex items-center justify-center">
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
                    <div className="flex flex-col justify-center min-w-0">
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
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A059] mt-1.5 ml-5 flex items-center gap-1 animate-pulse">
                          Now Playing
                        </span>
                      )}
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