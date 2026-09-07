"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Clock, Timer, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { getLessonProcessingStatus } from "@/app/actions/process-video";

interface LessonProcessingProgressProps {
  lessonId: string;
}

const STEPS = [
  { id: 1, name: "Ghép file & Trích xuất Audio", icon: "📤" },
  { id: 2, name: "Groq Whisper STT", icon: "⚡" },
  { id: 3, name: "Tải lên YouTube", icon: "🎬" },
  { id: 4, name: "Sinh Timeline Bài giảng", icon: "📊" },
  { id: 5, name: "Tạo RAG Embeddings", icon: "🧬" },
  { id: 6, name: "Hoàn tất!", icon: "✅" },
];

function formatTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "0s";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs > 0 ? secs + "s" : ""}`;
}

export default function LessonProcessingProgress({ lessonId }: LessonProcessingProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<{
    isProcessing: boolean;
    isError: boolean;
    step: number;
    stepName: string;
    progress: number;
    etaSeconds: number;
    errorMessage: string;
    youtubeVideoId: string | null;
  }>({
    isProcessing: false,
    isError: false,
    step: 1,
    stepName: "Đang khởi tạo...",
    progress: 0,
    etaSeconds: 0,
    errorMessage: "",
    youtubeVideoId: null,
  });

  const [elapsed, setElapsed] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling server status only while processing (auto-stops when finished)
  useEffect(() => {
    let isSubscribed = true;
    let intervalId: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        const res = await getLessonProcessingStatus(lessonId);
        if (!isSubscribed) return;

        if (res.isError) {
          setStatus((prev) => ({ ...prev, isProcessing: false, isError: true, errorMessage: res.errorMessage || "Lỗi xử lý" }));
          if (intervalId) clearInterval(intervalId);
          return;
        }

        if (!res.isProcessing) {
          setStatus({
            isProcessing: false,
            isError: false,
            step: 6,
            stepName: "Hoàn tất!",
            progress: 100,
            etaSeconds: 0,
            errorMessage: "",
            youtubeVideoId: res.youtubeVideoId || null,
          });
          if (intervalId) clearInterval(intervalId);
          router.refresh();
          return;
        }

        setStatus({
          isProcessing: true,
          isError: false,
          step: res.step || 1,
          stepName: res.stepName || "Đang xử lý...",
          progress: res.progress || 15,
          etaSeconds: Math.max(0, res.etaSeconds || 30),
          errorMessage: "",
          youtubeVideoId: res.youtubeVideoId || null,
        });
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    pollStatus();
    intervalId = setInterval(pollStatus, 4000);

    return () => {
      isSubscribed = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [lessonId, router]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (status.isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6 text-red-700">
        <div className="flex items-center gap-3 mb-2 font-bold text-lg">
          <AlertCircle className="text-red-500" size={24} />
          <span>⚠️ Quá trình AI xử lý gặp sự cố</span>
        </div>
        <p className="text-sm text-red-600 mb-4">{status.errorMessage}</p>
        <button
          onClick={handleManualRefresh}
          className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition flex items-center gap-2"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> Tải lại trang
        </button>
      </div>
    );
  }

  if (!status.isProcessing) {
    return null; // Không trong trạng thái xử lý AI
  }

  return (
    <div className="bg-gradient-to-br from-amber-50/80 via-white to-stone-50 border border-[#C5A059]/30 rounded-3xl p-6 mb-8 shadow-sm transition-all duration-500 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-stone-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C5A059]/15 flex items-center justify-center text-[#C5A059]">
            <Loader2 className="animate-spin" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <span>🤖 Trí Tuệ Nhân Tạo Đang Phân Tích Bài Giảng</span>
              <Sparkles size={16} className="text-[#C5A059] animate-pulse" />
            </h3>
            <p className="text-xs text-stone-500 font-medium">{status.stepName}</p>
          </div>
        </div>

        {/* Live Timers */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-white/80 border border-stone-200 px-3 py-1.5 rounded-xl font-mono text-stone-700">
            <Clock size={14} className="text-stone-400" />
            <span>Đã chạy: <strong>{formatTime(elapsed)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#C5A059]/10 border border-[#C5A059]/30 px-3 py-1.5 rounded-xl font-mono text-[#C5A059]">
            <Timer size={14} className="animate-spin" />
            <span>Còn lại: <strong>~{formatTime(status.etaSeconds)}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
          <span className="text-stone-600">Tiến độ tổng thể</span>
          <span className="text-[#C5A059] font-mono text-sm">{status.progress}%</span>
        </div>
        <div className="w-full bg-stone-200/80 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
          <div
            className="bg-gradient-to-r from-[#C5A059] via-amber-400 to-amber-500 h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{ width: `${Math.max(status.progress, 5)}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STEPS.map((s) => {
          const isDone = status.step > s.id;
          const isCurrent = status.step === s.id;

          return (
            <div
              key={s.id}
              className={`p-2.5 rounded-2xl border text-center transition-all duration-300 ${
                isDone
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                  : isCurrent
                  ? "bg-white border-[#C5A059] shadow-md text-stone-900 ring-2 ring-[#C5A059]/20"
                  : "bg-stone-50/60 border-stone-200/60 text-stone-400"
              }`}
            >
              <div className="text-sm mb-1">
                {isDone ? <CheckCircle2 size={16} className="inline text-emerald-500" /> : s.icon}
              </div>
              <p className="text-[10px] font-bold truncate">{s.name}</p>
            </div>
          );
        })}
      </div>

      {/* YouTube Confirmation Banner */}
      {status.youtubeVideoId && (
        <div className="mt-4 p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Đã upload video lên YouTube thành công! (ID: <strong>{status.youtubeVideoId}</strong>)</span>
          </div>
          <a
            href={`https://youtu.be/${status.youtubeVideoId}`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-emerald-950 font-bold shrink-0"
          >
            Mở trên YouTube →
          </a>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-4 pt-3 border-t border-stone-200/40 flex items-center justify-between text-[11px] text-stone-500">
        <span>⚡ Sử dụng <strong>Groq Whisper</strong> STT siêu tốc</span>
        <button
          onClick={handleManualRefresh}
          className="text-stone-400 hover:text-stone-700 flex items-center gap-1 transition"
        >
          <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} /> Tải lại trạng thái
        </button>
      </div>
    </div>
  );
}
