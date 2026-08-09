"use client";

import dynamic from "next/dynamic";

const StudyTimeline = dynamic(() => import("./StudyTimeline"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-64 flex flex-col items-center justify-center rounded-3xl p-8 border border-white/10 bg-[#0e0e0e] space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#C5A059] border-t-transparent animate-spin" />
            <div className="animate-pulse text-xs font-bold uppercase tracking-widest text-[#C5A059]">Đang tải lịch học...</div>
        </div>
    )
});

export default StudyTimeline;
