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
    const schedule = await db.studySchedule.findFirst({
        where: { userId: user.id, isActive: true },
        include: {
            items: {
                orderBy: { scheduledAt: 'asc' },
                include: {
                    lesson: {
                        select: {
                            id: true,
                            title: true,
                            chapter: {
                                select: {
                                    course: { select: { id: true, title: true, thumbnailUrl: true } }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!schedule) {
        return <OnboardingWizard />;
    }

    // Fetch Profile & Learning Path
    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: {
            fullName: true,
            learningPath: true,
            interests: true,
            avatarUrl: true,
        }
    });

    const learningPath = profile?.learningPath as any;

    if (!learningPath?.roadmapId) {
        return <OnboardingWizard />;
    }

    const roadmap = getRoadmapById(learningPath.roadmapId);

    if (!roadmap) {
        return <OnboardingWizard />;
    }

    // Calculate Dashboard Stats
    const totalItems = schedule.items.length;
    const completedItems = schedule.items.filter((i: any) => i.isCompleted).length;

    // Find next scheduled lesson
    const nextItem = schedule.items.find((i: any) => !i.isCompleted);

    // Get enrolled courses (max 4 for preview)
    const enrollments = await db.enrollment.findMany({
        where: { userId: user.id },
        take: 4,
        orderBy: { joinedAt: 'desc' },
        include: {
            course: {
                select: {
                    id: true,
                    title: true,
                    thumbnailUrl: true,
                    instructor: { select: { fullName: true } },
                    chapters: {
                        select: {
                            lessons: { select: { id: true } }
                        }
                    }
                }
            }
        }
    });

    const totalEnrollments = await db.enrollment.count({ where: { userId: user.id } });

    // Calculate cups (3 cups per completed lesson)
    const totalCups = completedItems * 3;

    // Study hours this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekCompleted = schedule.items.filter((i: any) => {
        if (!i.isCompleted || !i.completedAt) return false;
        return new Date(i.completedAt) >= weekStart;
    }).length;

    return (
        <LearningDashboard
            userName={profile?.fullName || "Người dùng"}
            roadmapTitle={roadmap.title}
            totalHours={roadmap.totalEstimatedHours}
            completedItems={completedItems}
            totalItems={totalItems || 1}
            totalCups={totalCups}
            weeklyCompletedLessons={thisWeekCompleted}
            nextLesson={nextItem ? {
                id: nextItem.lesson.id,
                title: nextItem.lesson.title,
                courseTitle: nextItem.lesson.chapter.course.title,
                courseId: nextItem.lesson.chapter.course.id
            } : null}
            courses={enrollments.map(e => ({
                id: e.course.id,
                title: e.course.title,
                thumbnailUrl: e.course.thumbnailUrl,
                instructorName: e.course.instructor?.fullName || "Aura",
                totalLessons: e.course.chapters.reduce((a: number, c: any) => a + c.lessons.length, 0),
                progress: e.progress,
            }))}
            totalCoursesCount={totalEnrollments}
            interests={profile?.interests || []}
        />
    );
}