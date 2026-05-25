import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import OnboardingWizard from "../_components/OnboardingWizard";
import LearningDashboard from "../_components/LearningDashboard";

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 1. Kiểm tra xem user đã tạo lộ trình cá nhân hóa chưa
    const roadmap = await db.userRoadmap.findUnique({
        where: { userId: user.id }
    });

    // Nếu chưa có roadmap, hiển thị Wizard để setup
    if (!roadmap) {
        return <OnboardingWizard />;
    }

    // 2. Fetch thông tin Profile
    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: {
            fullName: true,
            interests: true,
            avatarUrl: true,
        }
    });

    // 3. Lấy thông tin Lịch học (Study Schedule) nếu có
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

    // 4. Lấy danh sách khóa học đã đăng ký
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

    // Tính toán thống kê từ schedule
    const scheduleItems = schedule?.items || [];
    const totalItems = scheduleItems.length || 1; // tránh chia 0
    const completedItems = scheduleItems.filter((i: any) => i.isCompleted).length;
    const nextItem = scheduleItems.find((i: any) => !i.isCompleted);
    const totalCups = completedItems * 3;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeekCompleted = scheduleItems.filter((i: any) => {
        if (!i.isCompleted || !i.completedAt) return false;
        return new Date(i.completedAt) >= weekStart;
    }).length;

    return (
        <LearningDashboard
            userName={profile?.fullName || "Người dùng"}
            roadmapTitle="Lộ trình Cá nhân hóa"
            totalHours={roadmap.totalEstimatedHours || 0}
            completedItems={completedItems}
            totalItems={totalItems}
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