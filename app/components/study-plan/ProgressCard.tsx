"use client";

import { Crown, AlertCircle, CalendarDays } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load Mascot để không load Three.js ngay lập tức
const Mascot = dynamic(() => import("./Mascot"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[350px] flex items-center justify-center bg-gradient-to-b from-white to-[#F9F8F4]">
            <div className="animate-pulse text-stone-300">Đang tải...</div>
        </div>
    ),
});

interface ProgressCardProps {
    totalSessions: number;
    completedSessions: number;
    expectedSessions: number;
    daysLeft: number;
    totalDays: number;
}

export default function ProgressCard({
    totalSessions,
    completedSessions,
    expectedSessions,
    daysLeft,
    totalDays
}: ProgressCardProps) {

    // Calculation logic
    const safeTotal = totalSessions > 0 ? totalSessions : 1;
    const progressPercent = Math.min(100, Math.max(0, (completedSessions / safeTotal) * 100));
    const expectedPercent = Math.min(100, Math.max(0, (expectedSessions / safeTotal) * 100));

    // Status logic: Allow a small buffer (e.g. 1 session or 5%)
    const isBehind = completedSessions < (expectedSessions - 1);
    const status = isBehind ? "behind" : "ahead";

    return (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden sticky top-24">
            {/* Header Stats */}
            <div className="p-6 border-b border-stone-100">
                <h3 className="font-bold text-lg text-stone-800 mb-4 flex items-center justify-between">
                    Tiến độ học tập
                    <span className="text-xs font-medium text-[#C5A059] bg-[#C5A059]/10 px-2 py-1 rounded-full">
                        Xếp lại lịch
                    </span>
                </h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 font-medium flex items-center gap-2">
                            <CalendarDays size={16} /> Số ngày còn lại
                        </span>
                        <span className="font-bold text-stone-800">
                            {daysLeft}/{totalDays} ngày
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-stone-500 font-medium flex items-center gap-2">
                            <Crown size={16} className="text-[#C5A059]" /> Tiến độ thực tế
                        </span>
                        <div className="text-right">
                            <span className="font-bold text-[#C5A059]">
                                {completedSessions}/{totalSessions} bài
                            </span>
                            <div className="text-[10px] text-stone-400">
                                (Dự kiến: {expectedSessions} bài)
                            </div>
                        </div>

                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 relative">
                        <div className="flex justify-between text-xs mb-1 text-stone-400">
                            <span>Hoàn thành: {Math.round(progressPercent)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden relative">
                            {/* Expected Marker (Ghost Bar) */}
                            <div
                                className="absolute h-full bg-stone-200/50 border-r-2 border-stone-300 z-0"
                                style={{ width: `${expectedPercent}%` }}
                                title={`Tiến độ dự kiến: ${Math.round(expectedPercent)}%`}
                            />

                            {/* Actual Progress */}
                            <div
                                className={`absolute h-full rounded-full transition-all duration-1000 z-10 ${isBehind ? "bg-blue-400" : "bg-[#C5A059]"}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                            <span>0%</span>
                            <span>Mục tiêu: 100%</span>
                        </div>
                    </div>

                    {/* Status Message */}
                    <div className={`p-3 rounded-lg text-xs font-medium flex gap-2 items-start
                        ${isBehind ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}
                    `}>
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                            {isBehind ? (
                                <p>Bạn đang học chậm hơn kế hoạch. Phải cố gắng hơn nữa để đạt được mục tiêu đấy!</p>
                            ) : (
                                <p>Bạn đang theo kịp tiến độ rất tốt! Giữ vững phong độ nhé.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mascot Area */}
            <div className="bg-gradient-to-b from-white to-[#F9F8F4] min-h-[320px] relative">
                <Mascot status={status} />
            </div>

            <div className={`p-4 text-center font-bold text-white text-sm
                 ${isBehind ? "bg-blue-500" : "bg-[#C5A059]"}
            `}>
                {isBehind ? "Hôm nay bạn cần bứt phá! 🏃" : "Hôm nay là một ngày tuyệt vời! 🌟"}
            </div>
        </div>
    );
}
