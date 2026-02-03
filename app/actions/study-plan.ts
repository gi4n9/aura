"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- HELPERS ---

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// --- ACTIONS ---

export async function getEnrolledCourses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          category: { select: { name: true } }
        }
      }
    }
  });

  return enrollments.map(e => e.course);
}

export async function createStudyPlan(data: {
  name: string;
  courseIds: string[];
  daysOfWeek: number[]; // 0=Sun, 1=Mon...
  dailyMinutes: number;
  startDate: Date;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // 0. Deactivate old plans
    await db.studySchedule.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false }
    });

    // 1. Create Schedule Container
    const schedule = await db.studySchedule.create({
      data: {
        userId: user.id,
        name: data.name,
        availableDays: data.daysOfWeek,
        dailyLearningMinutes: data.dailyMinutes,
        startDate: data.startDate,
        isActive: true,
      }
    });

    // 2. Link Courses
    await db.studyScheduleCourse.createMany({
      data: data.courseIds.map((cid, idx) => ({
        studyScheduleId: schedule.id,
        courseId: cid,
        priority: idx + 1
      }))
    });

    // 3. FETCH LESSONS & GENERATE ITEMS (The Algorithm)
    console.log("Generating plan algorithm...");
    
    // Fetch lessons for all selected courses
    // We fetch them essentially flatted, but maybe we want to round-robin them?
    // Let's fetch them grouped by course first.
    const coursesWithLessons = await Promise.all(
        data.courseIds.map(cid => 
            db.course.findUnique({
                where: { id: cid },
                select: {
                    id: true,
                    chapters: {
                        orderBy: { position: 'asc' },
                        include: {
                            lessons: {
                                orderBy: { position: 'asc' }
                            }
                        }
                    }
                }
            })
        )
    );

    // Flatten lessons into a single queue
    // Strategy: Interleave courses. 
    // Lesson 1 from Course A, Lesson 1 from Course B, Lesson 2 from Course A...
    let lessonQueue: { id: string, duration: number, courseId: string }[] = [];
    
    // Determine max number of lessons in any course to iterate
    // This is a simplified Round Robin. 
    // Realistically you might want to finish Chapter 1 of A, then Chapter 1 of B.
    // But let's do simple Lesson interleaving for variety.
    
    const allCourseLessonLists = coursesWithLessons.map(c => {
        // Flatten chapters to lessons
        return c?.chapters.flatMap(ch => ch.lessons) || [];
    });

    const maxLen = Math.max(...allCourseLessonLists.map(l => l.length));

    for (let i = 0; i < maxLen; i++) {
        for (const list of allCourseLessonLists) {
            if (i < list.length) {
                const l = list[i];
                lessonQueue.push({
                    id: l.id,
                    duration: l.duration || 15 * 60, // default 15 mins if null, db is seconds? usually.
                    courseId: queryCourseIdByLesson(l, coursesWithLessons) // helper or just assume context
                });
            }
        }
    }

    // Now distribute lessons onto dates
    let currentDate = new Date(data.startDate);
    // Normalize to start of day
    currentDate.setHours(0,0,0,0);

    const planItemsData = [];
    let queueIndex = 0;

    // Safety break to prevent infinite loops (e.g. 1 year max plan)
    let safetyCounter = 0;
    
    while (queueIndex < lessonQueue.length && safetyCounter < 365) {
        // Check if current date is a learning day
        // getDay(): 0=Sun, 1=Mon...
        if (data.daysOfWeek.includes(currentDate.getDay())) {
            let minutesUsedToday = 0;
            
            // Try to fit lessons into today
            while (queueIndex < lessonQueue.length) {
                const nextLesson = lessonQueue[queueIndex];
                const lessonDurationMin = Math.max(5, Math.ceil(nextLesson.duration / 60)); // Convert sec to min, min 5 min
                
                // If adding this lesson exceeds daily limit AND we have already scheduled at least one lesson today
                // then stop for today. (Always allow at least 1 lesson even if it exceeds limit slightly)
                if (minutesUsedToday > 0 && (minutesUsedToday + lessonDurationMin) > data.dailyMinutes) {
                    break; 
                }

                planItemsData.push({
                    userId: user.id,
                    lessonId: nextLesson.id,
                    studyScheduleId: schedule.id,
                    scheduledAt: new Date(currentDate),
                    isCompleted: false
                });

                minutesUsedToday += lessonDurationMin;
                queueIndex++;
            }
        }
        
        // Move to next day
        currentDate = addDays(currentDate, 1);
        safetyCounter++;
    }

    // Bulk insert items
    if (planItemsData.length > 0) {
        await db.studyPlanItem.createMany({
            data: planItemsData
        });
    }

    revalidatePath("/onboarding/study-plan");
    return { success: true, scheduleId: schedule.id };

  } catch (error) {
    console.error("Create Plan Error:", error);
    return { success: false, error: "Failed to generate plan" };
  }
}

// Simple helper to find course ID (not strictly needed for insert but good for debug)
function queryCourseIdByLesson(lesson: any, courses: any[]) {
    // This is inefficient but okay for small scale server action
    for (const c of courses) {
        if (!c) continue;
        for (const ch of c.chapters) {
            if (ch.lessons.some((l: any) => l.id === lesson.id)) return c.id;
        }
    }
    return "";
}

// --- FETCHING FOR UI ---

export async function getMyStudyPlan() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get active schedule
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
                            duration: true,
                            chapter: { 
                                select: { 
                                    id: true, // Needed for link
                                    course: { 
                                        select: { 
                                            id: true, // Needed for link
                                            title: true, 
                                            category: { select: { name: true } } 
                                        } 
                                    } 
                                } 
                            }
                        }
                    }
                }
            },
            courses: {
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            thumbnailUrl: true,
                        }
                    }
                }
            }
        }
    });

    return schedule;
}

export async function saveStudyPlan(
    courseId: string, 
    items: { lessonId: string; date: string }[],
    config?: { days: number[]; lessonsPerDay: number }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // 1. Fetch Course Info
        const course = await db.course.findUnique({
            where: { id: courseId },
            select: { title: true }
        });

        if (!course) return { success: false, error: "Course not found" };

        // 2. Deactivate old plans
        await db.studySchedule.updateMany({
            where: { userId: user.id, isActive: true },
            data: { isActive: false }
        });

        const startDate = items.length > 0 ? new Date(items[0].date) : new Date();
        const targetEndDate = items.length > 0 ? new Date(items[items.length - 1].date) : startDate;

        // Fallback for days if not provided (though should be provided)
        const days = config?.days && config.days.length > 0 ? config.days : [1, 3, 5]; 

        // 3. Create Schedule
        const schedule = await db.studySchedule.create({
            data: {
                userId: user.id,
                name: `Lộ trình: ${course.title}`,
                startDate: startDate,
                targetEndDate: targetEndDate,
                isActive: true,
                availableDays: days,
                dailyLearningMinutes: (config?.lessonsPerDay || 2) * 20, // Rough estimate: 20 mins per lesson
            }
        });

        // 4. Link Course
        await db.studyScheduleCourse.create({
            data: {
                studyScheduleId: schedule.id,
                courseId: courseId,
                priority: 1
            }
        });

        // 5. Create Plan Items
        if (items.length > 0) {
            const planItemsData = items.map(item => ({
                userId: user.id,
                lessonId: item.lessonId,
                studyScheduleId: schedule.id,
                scheduledAt: new Date(item.date),
                isCompleted: false
            }));

            await db.studyPlanItem.createMany({
                data: planItemsData
            });
        }

        revalidatePath("/(learning)/courses/[courseId]/progress", "page");
        revalidatePath("/onboarding/study-plan");

        return { success: true, scheduleId: schedule.id };

    } catch (error) {
        console.error("Save Plan Error:", error);
        return { success: false, error: "Failed to save plan" };
    }
}
