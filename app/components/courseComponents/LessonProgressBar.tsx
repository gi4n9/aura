"use client";

import React from 'react';
import { PlayCircle, CheckCircle2 } from 'lucide-react';

interface LessonProgressBarProps {
  videoPercentage: number; // 0 - 100
  hasQuiz: boolean;
  isQuizPassed: boolean;
}

export default function LessonProgressBar({ videoPercentage, hasQuiz, isQuizPassed }: LessonProgressBarProps) {
  // Nếu có quiz, video chiếm 70%, quiz chiếm 30%.
  // Nếu không có quiz, video chiếm 100%.
  
  const videoWeight = hasQuiz ? 70 : 100;
  const quizWeight = hasQuiz ? 30 : 0;
  
  // Tính tỷ lệ fill thực tế
  const videoFill = Math.min(videoPercentage, 100) * (videoWeight / 100);
  const quizFill = isQuizPassed ? quizWeight : 0;
  
  const totalFill = videoFill + quizFill;

  return (
    <div className="flex flex-col w-full gap-1.5 mt-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-500">
        <span className="flex items-center gap-1">
          <PlayCircle size={10} className={videoFill > 0 ? "text-[#C5A059]" : "text-stone-400"}/> 
          {`Video (${Math.round(videoFill)}/${videoWeight}%)`}
        </span>
        {hasQuiz && (
          <span className="flex items-center gap-1">
            <CheckCircle2 size={10} className={isQuizPassed ? "text-green-500" : "text-stone-400"} />
            {`Bài tập (${Math.round(quizFill)}/${quizWeight}%)`}
          </span>
        )}
      </div>
      
      {/* Dual Progress Bar */}
      <div className="w-full h-1.5 bg-stone-200 rounded-full flex overflow-hidden shadow-inner">
        {/* Phần Video */}
        <div 
          className={`h-full transition-all duration-500 ${videoFill > 0 ? "bg-[#C5A059]/20" : "bg-transparent"}`}
          style={{ width: `${videoWeight}%` }}
        >
          <div className="h-full bg-gradient-to-r from-[#e3c78a] to-[#C5A059] transition-all duration-500" style={{ width: `${(videoFill / videoWeight) * 100}%` }} />
        </div>
        
        {/* Phần Quiz (Nếu có) */}
        {hasQuiz && (
          <div 
            className={`h-full border-l border-white/50 transition-all duration-500 ${isQuizPassed ? "bg-green-500/20" : "bg-transparent"}`}
            style={{ width: `${quizWeight}%` }}
          >
            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(quizFill / quizWeight) * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
