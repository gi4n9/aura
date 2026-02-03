"use client";

import { Clock, Play } from "lucide-react";

// Type cho mỗi item trong timeline
// Format: [{ "time": 0, "label": "Mở đầu" }, { "time": 120, "label": "Phần 1: Giới thiệu" }]
interface TimelineItem {
    time: number; // Seconds
    label: string;
}

interface TranscriptTimelineProps {
    timeline: TimelineItem[] | null;
    onSeek: (seconds: number) => void;
}

// Helper format time
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TranscriptTimeline({
    timeline,
    onSeek,
}: TranscriptTimelineProps) {
    if (!timeline || timeline.length === 0) {
        return (
            <div className="text-stone-400 italic text-sm py-4 text-center">
                Chưa có mốc thời gian cho bài học này.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {timeline.map((item, index) => (
                <button
                    key={index}
                    onClick={() => onSeek(item.time)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-stone-50 transition-colors group border border-transparent hover:border-stone-200"
                >
                    {/* Timestamp Badge */}
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 group-hover:bg-[#C5A059] group-hover:text-white rounded-md text-xs font-mono font-bold text-stone-600 transition-colors">
                        <Play size={10} className="group-hover:scale-110 transition-transform" />
                        {formatTime(item.time)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-700 group-hover:text-stone-900 line-clamp-2">
                            {item.label}
                        </p>
                        {/* Optional: Show next timestamp indicator */}
                        {index < timeline.length - 1 && (
                            <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-wider">
                                Đến {formatTime(timeline[index + 1].time)}
                            </p>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}
