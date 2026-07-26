import { getCachedStudyPlan } from "@/lib/cache";
import { createClient } from "@/utils/supabase/server";
import { differenceInDays } from "date-fns";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import StudyPlanClient from "@/app/components/client/StudyPlanClient";

export default async function StudyPlanPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const schedule = await getCachedStudyPlan(user.id);

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

    let totalSessions = 0;
    let completedSessions = 0;
    let daysLeft = 0;
    let totalDays = 0;

    let expectedSessions = 0;

    if (schedule) {
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

        if (totalDays <= 0) totalDays = 1;

        const daysElapsed = differenceInDays(new Date(), startDate);
        const safeDaysElapsed = Math.max(0, Math.min(daysElapsed, totalDays));

        expectedSessions = Math.round((safeDaysElapsed / totalDays) * totalSessions);
    }

    if (daysLeft < 0) daysLeft = 0;

    return (
        <StudyPlanClient
            schedule={schedule}
            totalSessions={totalSessions}
            completedSessions={completedSessions}
            expectedSessions={expectedSessions}
            daysLeft={daysLeft}
            totalDays={totalDays}
        />
    );
}