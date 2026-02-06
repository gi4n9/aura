import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getRoadmapById } from "@/services/roadmap-data";
import OnboardingWizard from "../_components/OnboardingWizard";
import LearningDashboard from "../_components/LearningDashboard";

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check if user has an active study schedule
    // This is the true indicator that they have completed the FULL onboarding process
    const schedule = await db.studySchedule.findFirst({
        where: { userId: user.id, isActive: true },
        include: {
            items: {
                where: { isCompleted: true }
            }
        }
    });

    // If no active schedule, always show Wizard to let them finish setup
    // even if they have selected interests before.
    if (!schedule) {
        return <OnboardingWizard />;
    }

    // Fetch Profile & Learning Path
    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: { learningPath: true }
    });

    const learningPath = profile?.learningPath as any;

    if (!learningPath?.roadmapId) {
        return <OnboardingWizard />;
    }

    const roadmap = getRoadmapById(learningPath.roadmapId);

    if (!roadmap) {
        // Fallback if roadmap data is missing/invalid
        return <OnboardingWizard />;
    }

    // Calculate Dashboard Stats
    const totalItemsCount = await db.studyPlanItem.count({
        where: { studyScheduleId: schedule.id }
    });

    const completedItemsCount = schedule.items.length; // items only includes completed ones due to filter above

    // Find next scheduled lesson
    const nextItem = await db.studyPlanItem.findFirst({
        where: {
            studyScheduleId: schedule.id,
            isCompleted: false
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
            lesson: {
                select: {
                    id: true,
                    title: true,
                    chapter: {
                        select: {
                            course: { select: { title: true } }
                        }
                    }
                }
            }
        }
    });

    return (
        <LearningDashboard
            roadmapTitle={roadmap.title}
            totalHours={roadmap.totalEstimatedHours}
            completedItems={completedItemsCount}
            totalItems={totalItemsCount || 1}
            nextLesson={nextItem ? {
                id: nextItem.lesson.id,
                title: nextItem.lesson.title,
                courseTitle: nextItem.lesson.chapter.course.title
            } : null}
        />
    );
}