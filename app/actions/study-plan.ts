"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { addDays, format, getDay, parseISO } from "date-fns";

type CreateStudyPlanInput = {
    // Support both single courseId and array of courseIds
    courseId?: string;
    courseIds?: string[];
    // Support both field naming conventions
    startDate: string | Date;
    availableDays?: number[];
    daysOfWeek?: number[];
    dailyMinutes: number;
    targetEndDate?: string;
    name?: string;
};

export async function createStudyPlan(input: CreateStudyPlanInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // Normalize input
        const courseIds = input.courseIds || (input.courseId ? [input.courseId] : []);
        const availableDays = input.availableDays || input.daysOfWeek || [1, 3, 5];
        const startDate = typeof input.startDate === 'string' ? parseISO(input.startDate) : input.startDate;

        if (courseIds.length === 0) return { success: false, error: "No courses selected" };

        // Get all courses content
        const courses = await db.course.findMany({
            where: { id: { in: courseIds } },
            include: {
                chapters: {
                    where: { status: "PUBLISHED" },
                    orderBy: { position: "asc" },
                    include: {
                        lessons: {
                            orderBy: { position: "asc" },
                            select: { id: true, title: true, duration: true }
                        }
                    }
                }
            }
        });

        if (courses.length === 0) return { success: false, error: "Courses not found" };

        // Flatten lessons from all courses
        const allLessons = courses.flatMap(course => 
            course.chapters.flatMap(c => c.lessons)
        );
        if (allLessons.length === 0) return { success: false, error: "Courses have no content" };

        // Calculate Schedule (Algorithm)
        let currentDate = startDate;
        const planItems = [];
        let currentDayMinutes = 0;
        let lessonIndex = 0;

        let safetyCounter = 0;
        const MAX_DAYS = 365 * 2; 

        while (lessonIndex < allLessons.length && safetyCounter < MAX_DAYS) {
            const dayOfWeek = getDay(currentDate);
            
            if (availableDays.includes(dayOfWeek)) {
                while (lessonIndex < allLessons.length) {
                    const lesson = allLessons[lessonIndex];
                    const duration = lesson.duration ? Math.ceil(lesson.duration / 60) : 10; 

                    if (currentDayMinutes > 0 && currentDayMinutes + duration > input.dailyMinutes * 1.2) {
                        break;
                    }

                    planItems.push({
                        lessonId: lesson.id,
                        scheduledAt: currentDate,
                        note: `Day ${safetyCounter + 1}`
                    });

                    currentDayMinutes += duration;
                    lessonIndex++;
                }
            }

            currentDate = addDays(currentDate, 1);
            currentDayMinutes = 0;
            safetyCounter++;
        }

        // Create StudySchedule
        const planName = input.name || `Plan for ${courses.map(c => c.title).join(', ')}`;
        
        const schedule = await db.studySchedule.create({
            data: {
                userId: user.id,
                name: planName,
                startDate: startDate,
                availableDays: availableDays,
                dailyLearningMinutes: input.dailyMinutes,
                courses: {
                    create: courseIds.map((cId, idx) => ({
                        courseId: cId,
                        priority: idx + 1
                    }))
                },
                items: {
                    create: planItems.map(item => ({
                        userId: user.id,
                        lessonId: item.lessonId,
                        scheduledAt: item.scheduledAt,
                        note: item.note
                    }))
                }
            }
        });

        return { success: true, scheduleId: schedule.id };

    } catch (error: any) {
        console.error("Create Plan Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getStudyPlan(courseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    // Find active schedule that includes this course
    const schedule = await db.studySchedule.findFirst({
        where: {
            userId: user.id,
            isActive: true,
            courses: {
                some: { courseId: courseId }
            }
        },
        include: {
            items: {
                where: {
                    lesson: { chapter: { courseId: courseId } }
                },
                include: {
                    lesson: {
                        select: { id: true, title: true, duration: true }
                    }
                },
                orderBy: { scheduledAt: 'asc' }
            }
        }
    });

    return { success: true, data: schedule };
}

export async function getEnrolledCourses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized", data: [] };

    try {
        const enrollments = await db.enrollment.findMany({
            where: { userId: user.id },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        thumbnailUrl: true,
                        chapters: {
                            where: { status: "PUBLISHED" },
                            select: {
                                id: true,
                                lessons: {
                                    select: { id: true, duration: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const courses = enrollments.map(e => {
            const totalLessons = e.course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
            const totalDuration = e.course.chapters.reduce((acc, ch) => 
                acc + ch.lessons.reduce((sum, l) => sum + (l.duration || 0), 0), 0
            );
            return {
                id: e.course.id,
                title: e.course.title,
                thumbnailUrl: e.course.thumbnailUrl,
                totalLessons,
                totalDuration, // in seconds
                progress: e.progress
            };
        });

        return { success: true, data: courses };

    } catch (error: any) {
        console.error("Get Enrolled Courses Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}

// Alternative save function used by PlanGenerator component
export async function saveStudyPlan(
    courseId: string,
    items: { lessonId: string; date: string }[],
    settings: { days: number[]; lessonsPerDay: number }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const course = await db.course.findUnique({
            where: { id: courseId },
            select: { title: true }
        });

        if (!course) return { success: false, error: "Course not found" };

        // Create schedule
        const schedule = await db.studySchedule.create({
            data: {
                userId: user.id,
                name: `Plan for ${course.title}`,
                startDate: items.length > 0 ? new Date(items[0].date) : new Date(),
                availableDays: settings.days,
                dailyLearningMinutes: settings.lessonsPerDay * 15, // Estimate 15 mins per lesson
                courses: {
                    create: { courseId, priority: 1 }
                },
                items: {
                    create: items.map(item => ({
                        userId: user.id,
                        lessonId: item.lessonId,
                        scheduledAt: new Date(item.date)
                    }))
                }
            }
        });

        return { success: true, scheduleId: schedule.id };

    } catch (error: any) {
        console.error("Save Study Plan Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getRoadmapCoursesForStudyPlan() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized", data: [] };

    try {
        const roadmap = await db.userRoadmap.findUnique({
            where: { userId: user.id },
            include: {
                nodes: {
                    include: {
                        course: {
                            include: {
                                category: true,
                                chapters: {
                                    include: {
                                        lessons: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!roadmap) return { success: false, error: "No roadmap found", data: [] };

        // Lấy danh sách khóa học user đã đăng ký
        const enrollments = await db.enrollment.findMany({
            where: { userId: user.id, courseId: { in: roadmap.nodes.map(n => n.courseId) } },
            select: { courseId: true }
        });
        const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));

        const courses = roadmap.nodes.map(n => {
            const c = n.course;
            const totalDuration = c.chapters.reduce((acc, ch) => 
                acc + ch.lessons.reduce((sum, l) => sum + (l.duration || 0), 0), 0
            );
            return {
                id: c.id,
                title: c.title,
                thumbnailUrl: c.thumbnailUrl,
                category: c.category,
                totalDuration,
                price: Number(c.price),
                isFree: c.isFree || Number(c.price) === 0,
                isOwned: enrolledCourseIds.has(c.id)
            };
        });

        return { success: true, data: courses, roadmapId: roadmap.id };
    } catch (error: any) {
        console.error("Get Roadmap Courses Error:", error);
        return { success: false, error: error.message, data: [] };
    }
}
