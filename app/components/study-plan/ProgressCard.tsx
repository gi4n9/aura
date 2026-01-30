"use client";

import { Crown, AlertCircle, Clock, CalendarDays } from "lucide-react";
import Mascot from "./Mascot";

interface ProgressCardProps {
    totalSessions: number;
    completedSessions: number;
    daysLeft: number;
    totalDays: number;
}

export default function ProgressCard({
    totalSessions,
    completedSessions,
    daysLeft,
    totalDays
}: ProgressCardProps) {

    // Calculate status logic
    const progressPercent = (completedSessions / totalSessions) * 100;
    const expectedProgress = ((totalDays - daysLeft) / totalDays) * 100;

    // Determination: if actual progress is < expected progress - 10%, then behind
    const isBehind = progressPercent < (expectedProgress - 10);
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
                            <Crown size={16} className="text-[#C5A059]" /> Số buổi đã đạt
                        </span>
                        <span className="font-bold text-[#C5A059]">
                            {completedSessions}/{totalSessions}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1 text-stone-400">
                            <span>Hoàn thành: {Math.round(progressPercent)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${isBehind ? "bg-blue-400" : "bg-[#C5A059]"
                                    }`}
                                style={{ width: `${progressPercent}%` }}
                            />
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
