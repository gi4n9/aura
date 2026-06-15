"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { saveVideoProgress, getVideoProgress } from "@/app/actions/video-progress";

// Khai báo type cho YouTube Player
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

// Export interface để parent có thể control video
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
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(initialProgress);
  const lastSavedTimeRef = useRef<number>(0);

  // Expose player controls to parent via ref
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

  // Load saved progress từ database
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

  // Hàm lưu progress
  const saveProgress = useCallback(async (shouldRefreshUI: boolean = false) => {
    if (!playerRef.current || !lessonId) return;

    try {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();

      // Chỉ lưu nếu có sự thay đổi đáng kể (>5 giây) và không phải force refresh
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

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (isLoading) return;

    // Load YouTube IFrame API script
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Initialize player when API is ready
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
              saveProgress(true); // Force refresh UI on pause
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              saveProgress(true); // Force refresh UI on end
            }
          },
        },
      });

      // Setup interval để save progress mỗi 10 giây
      saveIntervalRef.current = setInterval(() => {
        if (playerRef.current?.getPlayerState?.() === window.YT.PlayerState.PLAYING) {
          saveProgress(true); // Cập nhật cả UI mỗi 10s
        }
      }, 10000);
    };

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Cleanup
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

  // Save progress when user leaves page
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveProgress]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Khung Video */}
      <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden bg-black shadow-2xl border border-stone-800 ring-1 ring-white/10 group">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
            <div className="animate-pulse text-stone-400">Đang tải...</div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="absolute top-0 left-0 w-full h-full"
          />
        )}
      </div>

      {/* Thông tin Video */}
      <div className="pb-4 border-b border-stone-200">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a] leading-tight mb-4">
          {title}
        </h1>

        {/* Resume indicator */}
        {startTime > 0 && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ▶️ Tiếp tục từ {Math.floor(startTime / 60)}:{String(Math.floor(startTime % 60)).padStart(2, '0')}
          </div>
        )}

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
});

VideoPlayer.displayName = "VideoPlayer";

export default VideoPlayer;

