"use client";

import dynamic from "next/dynamic";

const StudyTimeline = dynamic(() => import("./StudyTimeline"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-48 flex items-center justify-center bg-white rounded-2xl border border-stone-200 shadow-sm">
            <div className="animate-pulse text-stone-400 font-medium">Đang tải lịch học...</div>
        </div>
    )
});

export default StudyTimeline;
