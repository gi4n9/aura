"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Play } from "lucide-react";

type VideoItem = {
  id: string;
  title: string;
  youtubeId: string;
  stt: number;
};

export default function CourseSidebar({
  courseId,
  videos,
  currentVideoId,
}: {
  courseId: string;
  videos: VideoItem[];
  currentVideoId: string;
}) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentVideoId]);

  return (
    <div 
      className="flex flex-col w-full h-[500px] lg:h-auto lg:aspect-[7/9] bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm"
    >
      
      {/* Sidebar Header */}
      <div className="p-5 border-b border-stone-100 bg-stone-50/50 backdrop-blur">
        <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif font-bold text-lg text-[#1a1a1a]">Danh sách bài học</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded">
                {videos.length} Bài học
            </span>
        </div>
        <p className="text-xs text-stone-400">Theo dõi tiến độ</p>
      </div>

      {/* Video List */}
      <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar bg-white">
        {videos.map((video) => {
          const isActive = video.youtubeId === currentVideoId;
          
          return (
            <Link
              key={video.id}
              href={`/courses/${courseId}?videoId=${video.youtubeId}`}
              ref={isActive ? (activeRef as any) : null}
              className={`flex gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${
                isActive
                  ? "bg-[#F9F8F4] border-[#C5A059]/30 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-stone-50"
              }`}
            >
              {/* Thumbnail Area */}
              <div className="relative w-24 h-14 flex-shrink-0 rounded overflow-hidden bg-stone-200 border border-stone-100">
                <Image
                  src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                  alt={video.title}
                  fill
                  className={`object-cover transition-opacity ${isActive ? 'opacity-80' : 'opacity-100'}`}
                  unoptimized={true}
                />
                
                {isActive ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]/40">
                         {/* Equalizer Animation */}
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
                    <span className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-[#C5A059]' : 'text-stone-400'}`}>
                        {String(video.stt).padStart(2, '0')}
                    </span>
                    <h4
                    className={`text-sm font-medium line-clamp-2 leading-snug ${
                        isActive ? "text-[#1a1a1a]" : "text-stone-600 group-hover:text-[#1a1a1a]"
                    }`}
                    >
                    {video.title}
                    </h4>
                </div>
                
                {isActive && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#C5A059] mt-1.5 ml-5 flex items-center gap-1">
                        Now Playing
                    </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}