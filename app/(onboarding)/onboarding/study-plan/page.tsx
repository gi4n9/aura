import StudyTimeline from "@/app/components/study-plan/StudyTimeline";
import ProgressCard from "@/app/components/study-plan/ProgressCard";

export default function StudyPlanPage() {
    return (
        <div className="min-h-screen pt-[80px]">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">
                    Kế hoạch học tập
                </h1>
                <p className="text-stone-500">
                    Theo dõi lộ trình và bám sát mục tiêu của bạn từng ngày.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: TIMELINE (8 cols) */}
                <div className="lg:col-span-8">
                    <StudyTimeline />
                </div>

                {/* RIGHT COLUMN: PROGRESS & MASCOT (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <ProgressCard
                        totalSessions={30}
                        completedSessions={12} // Example data
                        daysLeft={15}
                        totalDays={110}
                    />
                </div>
            </div>
        </div>
    );
}