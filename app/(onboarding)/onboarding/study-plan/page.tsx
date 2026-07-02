import StudyTimeline from "@/app/components/study-plan/StudyTimelineClient";
import ProgressCard from "@/app/components/study-plan/ProgressCard";
import { getCachedStudyPlan } from "@/lib/cache";
import { createClient } from "@/utils/supabase/server";
import { differenceInDays } from "date-fns";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";

export default async function StudyPlanPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Sử dụng cached query
    const schedule = await getCachedStudyPlan(user.id);

    // Lấy tiến độ xem video thực tế của user
    const completedProgress = await db.videoProgress.findMany({
        where: {
            userId: user.id,
            isCompleted: true
        },
        select: {
            lessonId: true
        }
    });
    const completedLessonIds = new Set(completedProgress.map(p => p.lessonId));

    // Lấy tiến độ làm bài tập thực tế của user
    const quizResults = await db.quizResult.findMany({
        where: {
            userId: user.id,
            isPassed: true
        },
        select: {
            lessonId: true
        }
    });
    const completedQuizLessonIds = new Set(quizResults.map(q => q.lessonId));

    // Calculate Progress Stats
    let totalSessions = 0;
    let completedSessions = 0;
    let daysLeft = 0;
    let totalDays = 0;

    let expectedSessions = 0;

    if (schedule) {
        // Cập nhật trạng thái isCompleted dựa trên video progress thực tế
        schedule.items = schedule.items.map((i: any) => ({
            ...i,
            isCompleted: i.isCompleted || completedLessonIds.has(i.lessonId),
            hasQuiz: (i.lesson?._count?.questions ?? 0) > 0,
            quizCompleted: completedQuizLessonIds.has(i.lessonId)
        }));

        totalSessions = schedule.items.length;
        completedSessions = schedule.items.filter((i: any) => i.isCompleted).length;

        const endDate = schedule.targetEndDate
            ? new Date(schedule.targetEndDate)
            : (schedule.items.length > 0 ? new Date(schedule.items[schedule.items.length - 1].scheduledAt) : new Date());

        const startDate = new Date(schedule.startDate);

        daysLeft = differenceInDays(endDate, new Date());
        totalDays = differenceInDays(endDate, startDate) + 1;

        // Safety check
        if (totalDays <= 0) totalDays = 1;

        const daysElapsed = differenceInDays(new Date(), startDate);
        // Clamp daysElapsed
        const safeDaysElapsed = Math.max(0, Math.min(daysElapsed, totalDays));

        expectedSessions = Math.round((safeDaysElapsed / totalDays) * totalSessions);
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
                        expectedSessions={expectedSessions}
                        daysLeft={daysLeft}
                        totalDays={totalDays || 30}
                    />
                </div>
            </div>
        </div>
    );
}