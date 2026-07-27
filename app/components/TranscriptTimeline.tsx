"use client";

import { Clock, Play } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface TimelineItem {
    time: number; // Seconds
    label: string;
}

interface TranscriptTimelineProps {
    timeline: TimelineItem[] | null;
    onSeek: (seconds: number) => void;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TranscriptTimeline({
    timeline,
    onSeek,
}: TranscriptTimelineProps) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    if (!timeline || timeline.length === 0) {
        return (
            <div className={`italic text-sm py-4 text-center ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                {t("course.noTimeline", "Chưa có mốc thời gian cho bài học này.")}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {timeline.map((item, index) => (
                <button
                    key={index}
                    onClick={() => onSeek(item.time)}
                    className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition-all group border ${
                        isDark
                            ? "hover:bg-white/10 border-transparent hover:border-white/10 text-white"
                            : "hover:bg-stone-100/80 border-transparent hover:border-stone-200 text-stone-900"
                    }`}
                >
                    {/* Timestamp Badge */}
                    <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                        isDark
                            ? "bg-white/10 text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-[#080808]"
                            : "bg-stone-100 text-stone-700 group-hover:bg-[#C5A059] group-hover:text-white"
                    }`}>
                        <Play size={10} className="group-hover:scale-110 transition-transform" />
                        {formatTime(item.time)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug line-clamp-2 transition-colors ${
                            isDark ? "text-stone-200 group-hover:text-white" : "text-stone-700 group-hover:text-stone-900"
                        }`}>
                            {item.label}
                        </p>
                        {index < timeline.length - 1 && (
                            <p className={`text-[10px] mt-1 uppercase tracking-wider ${
                                isDark ? "text-stone-400" : "text-stone-500"
                            }`}>
                                {t("course.until", "Đến")} {formatTime(timeline[index + 1].time)}
                            </p>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}
