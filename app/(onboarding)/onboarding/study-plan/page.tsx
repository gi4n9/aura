import StudyTimeline from "@/app/components/study-plan/StudyTimeline";
import ProgressCard from "@/app/components/study-plan/ProgressCard";
import { getMyStudyPlan } from "@/app/actions/study-plan";
import { differenceInDays } from "date-fns";

export default async function StudyPlanPage() {
    const schedule = await getMyStudyPlan();

    // Calculate Progress Stats
    let totalSessions = 0;
    let completedSessions = 0;
    let daysLeft = 0;
    let totalDays = 0;

    if (schedule) {
        totalSessions = schedule.items.length;
        completedSessions = schedule.items.filter((i: any) => i.isCompleted).length;

        // Calculate remaining duration
        if (schedule.targetEndDate) {
            // If plan has hard target
            daysLeft = differenceInDays(new Date(schedule.targetEndDate), new Date());
        } else if (schedule.items.length > 0) {
            // Else based on last scheduled item
            const lastItem = schedule.items[schedule.items.length - 1];
            daysLeft = differenceInDays(new Date(lastItem.scheduledAt), new Date());
            totalDays = differenceInDays(new Date(lastItem.scheduledAt), new Date(schedule.startDate));
        }
    }

    // Fallback if daysLeft is negative (overdue) or zero
    if (daysLeft < 0) daysLeft = 0;

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
                    {/* Pass fetched schedule to Client Component */}
                    <StudyTimeline initialSchedule={schedule} />
                </div>

                {/* RIGHT COLUMN: PROGRESS & MASCOT (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <ProgressCard
                        totalSessions={totalSessions}
                        completedSessions={completedSessions}
                        daysLeft={daysLeft}
                        totalDays={totalDays || 30}
                    />
                </div>
            </div>
        </div>
    );
}