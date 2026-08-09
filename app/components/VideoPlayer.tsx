"use client";

import { Info, Tv, Sparkles } from "lucide-react";
import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { saveVideoProgress, getVideoProgress } from "@/app/actions/video-progress";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoPlayerProps {
  videoId: string;
  lessonId: string;
  title: string;
  description?: string;
  initialProgress?: number;
}

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({
  videoId,
  lessonId,
  title,
  description,
  initialProgress = 0,
}, ref) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(initialProgress);
  const lastSavedTimeRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (playerRef.current?.seekTo) {
        playerRef.current.seekTo(seconds, true);
      }
    },
    getCurrentTime: () => {
      return playerRef.current?.getCurrentTime?.() || 0;
    },
    getDuration: () => {
      return playerRef.current?.getDuration?.() || 0;
    },
  }), []);

  useEffect(() => {
    const loadProgress = async () => {
      if (!lessonId) return;

      const progress = await getVideoProgress(lessonId);
      if (progress && progress.currentTime > 0) {
        setStartTime(progress.currentTime);
      }
      setIsLoading(false);
    };

    loadProgress();
  }, [lessonId]);

  const router = useRouter();

  const saveProgress = useCallback(async (shouldRefreshUI: boolean = false) => {
    if (!playerRef.current || !lessonId) return;

    try {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();

      if (!shouldRefreshUI && Math.abs(currentTime - lastSavedTimeRef.current) < 5) return;

      lastSavedTimeRef.current = currentTime;
      await saveVideoProgress(lessonId, currentTime, duration);
      
      if (shouldRefreshUI) {
        router.refresh();
      }
    } catch (error) {
      console.error("Error saving video progress:", error);
    }
  }, [lessonId, router]);

  useEffect(() => {
    if (isLoading) return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          start: Math.floor(startTime),
        },
        events: {
          onReady: (event: any) => {
            if (startTime > 0) {
              event.target.seekTo(startTime, true);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PAUSED) {
              saveProgress(true);
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              saveProgress(true);
            }
          },
        },
      });

      saveIntervalRef.current = setInterval(() => {
        if (playerRef.current?.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
          saveProgress(true);
        }
      }, 10000);
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      saveProgress();
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, startTime, saveProgress, isLoading]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveProgress]);

  return (
    <div className={`relative flex flex-col gap-6 p-6 sm:p-8 md:p-10 rounded-[36px] sm:rounded-[44px] transition-all duration-500 overflow-hidden group border ${
      isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-sm"
    }`}>

      {/* TOP CONTROL BAR */}
      <div className={`flex items-center justify-between px-3 pb-3 border-b text-[11px] font-mono tracking-wider transition-colors ${
        isDark ? "border-white/10 text-stone-300" : "border-stone-200/80 text-stone-700"
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
          <span className="font-bold uppercase tracking-widest text-[#C5A059] text-[11px] flex items-center gap-1.5">
            <Tv size={14} /> AURA CINEMA 4K
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase font-bold opacity-90">
          <span className="px-2 py-0.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#C5A059]">HDR10+</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
          <span>60 FPS</span>
        </div>
      </div>

      {/* FORCED ROUNDED YOUTUBE VIDEO SCREEN WRAPPER WITH MASK CLIPPING */}
      <div className={`relative w-full pt-[56.25%] rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 isolate transform-gpu [mask-image:linear-gradient(white,white)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] [&_iframe]:rounded-[24px] [&_iframe]:sm:rounded-[32px] [&_iframe]:overflow-hidden ${
        isDark
          ? "border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.6)] group-hover:border-[#C5A059]/60"
          : "border border-white/80 shadow-[0_20px_50px_rgba(197,160,89,0.15)] group-hover:border-[#C5A059]/60"
      }`}>
        {isLoading ? (
          <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-2xl ${
            isDark ? "bg-stone-900/90" : "bg-stone-100/90"
          }`}>
            <div className="animate-pulse text-[#C5A059] font-serif font-bold text-sm tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="animate-spin text-[#C5A059]" />
              {t("course.loadingVideo", "ĐANG TẢI BÀI GIẢNG...")}
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full rounded-[24px] sm:rounded-[32px] overflow-hidden [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:rounded-[24px] [&_iframe]:sm:rounded-[32px] [&_iframe]:overflow-hidden"
          />
        )}
      </div>

      {/* VIDEO TITLE & INFO SECTION */}
      <div className="space-y-3 pt-1">
        <h1 className={`text-xl md:text-2xl font-serif font-bold leading-tight tracking-tight ${
          isDark ? "text-white" : "text-stone-900"
        }`}>
          {title}
        </h1>

        {startTime > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C5A059]/15 border border-[#C5A059]/40 rounded-full text-xs font-bold text-[#C5A059] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
            {t("course.resumeFrom", "Tiếp tục từ")} {Math.floor(startTime / 60)}:{String(Math.floor(startTime % 60)).padStart(2, '0')}
          </div>
        )}

        {description && (
          <div className={`p-5 rounded-3xl border backdrop-blur-xl ${
            isDark ? "bg-white/5 border-white/10 text-stone-300" : "bg-white/80 border-stone-200 text-stone-700"
          }`}>
            <p className="text-xs sm:text-sm leading-relaxed">
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;
