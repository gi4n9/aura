"use client";

import { Info } from "lucide-react";

export default function VideoPlayer({
  videoId,
  title,
  description,
}: {
  videoId: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Khung Video: Shadow lớn, bo góc */}
      <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-black shadow-2xl border border-stone-800 ring-1 ring-white/10 group">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      {/* Thông tin Video */}
      <div className="pb-4 border-b border-stone-200">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a] leading-tight mb-4">
            {title}
        </h1>
        
        {description && (
          <div className="flex gap-4 p-5 bg-white border border-stone-200 rounded-lg shadow-sm">
            <Info className="flex-shrink-0 text-[#C5A059] mt-0.5" size={20} />
            <p className="text-stone-600 text-sm leading-relaxed font-light">
               {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}