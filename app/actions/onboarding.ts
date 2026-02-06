"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { 
    generateMergedRoadmap, 
    getRoadmapCourseKeywords, 
    getRoadmapById,
    RoadmapData 
} from "@/services/roadmap-data";
import { revalidatePath } from "next/cache";

// ===== TYPES =====
export interface MatchedCourse {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    description: string | null;
    price: number | string;
    instructor: { fullName: string | null } | null;
    category: { name: string } | null;
    matchedKeywords: string[];
    roadmapNodeId: string;
    roadmapNodeLabel: string;
}

export interface RoadmapWithCourses {
    roadmap: RoadmapData;
    matchedCourses: MatchedCourse[];
    unmatchedNodes: { id: string; label: string }[];
    coursesByNode: Record<string, MatchedCourse[]>; // Group courses by node
}

// ===== STEP 1: Save interests & Generate Roadmap =====
export async function saveOnboardingInterests(interests: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    if (interests.length === 0) {
        return { success: false, error: "Please select at least one interest" };
    }

    try {
        // Generate merged roadmap from ALL interests
        const roadmapData = generateMergedRoadmap(interests);

        // Update Profile
        await db.profile.update({
            where: { id: user.id },
            data: {
                interests: interests,
                learningPath: {
                    roadmapId: roadmapData.id,
                    selectedInterests: interests,
                    selectedAt: new Date().toISOString(),
                    totalEstimatedHours: roadmapData.totalEstimatedHours
                }
            } as any
        });

        revalidatePath("/");
        return { 
            success: true, 
            roadmapId: roadmapData.id,
            roadmapTitle: roadmapData.title,
            totalHours: roadmapData.totalEstimatedHours
        };
    } catch (error) {
        console.error("Onboarding Error:", error);
        return { success: false, error: "Failed to save profile" };
    }
}

// ===== STEP 2: Get Roadmap with Matched Courses =====
export async function getRoadmapWithMatchedCourses(roadmapId: string): Promise<RoadmapWithCourses | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Get roadmap data
    const roadmap = getRoadmapById(roadmapId);
    if (!roadmap) return null;

    // Get all keywords from roadmap
    const allKeywords = getRoadmapCourseKeywords(roadmap);

    // Search courses matching these keywords
    const courses = await db.course.findMany({
        where: {
            status: "PUBLISHED",
            OR: allKeywords.flatMap(keyword => [
                { title: { contains: keyword, mode: 'insensitive' } },
                { description: { contains: keyword, mode: 'insensitive' } },
                { category: { name: { contains: keyword, mode: 'insensitive' } } }
            ])
        },
        select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            description: true,
            price: true,
            instructor: { select: { fullName: true } },
            category: { select: { name: true } }
        },
        take: 100
    });

    // Match courses to roadmap nodes
    const matchedCourses: MatchedCourse[] = [];
    const coursesByNode: Record<string, MatchedCourse[]> = {};
    const matchedNodeIds = new Set<string>();

    for (const course of courses) {
        const courseText = `${course.title} ${course.description || ''} ${course.category?.name || ''}`.toLowerCase();

        for (const node of roadmap.nodes) {
            const nodeKeywords = node.data.courseKeywords || [];
            const matchedKeywords = nodeKeywords.filter(kw => courseText.includes(kw.toLowerCase()));

            if (matchedKeywords.length > 0) {
                const matchedCourse: MatchedCourse = {
                    ...course,
                    price: Number(course.price) || 0,
                    matchedKeywords,
                    roadmapNodeId: node.id,
                    roadmapNodeLabel: node.data.label
                };

                // Avoid duplicates for same course-node pair
                const isDuplicate = matchedCourses.some(
                    mc => mc.id === course.id && mc.roadmapNodeId === node.id
                );

                if (!isDuplicate) {
                    matchedCourses.push(matchedCourse);
                    matchedNodeIds.add(node.id);

                    // Group by node
                    if (!coursesByNode[node.id]) coursesByNode[node.id] = [];
                    coursesByNode[node.id].push(matchedCourse);
                }
            }
        }
    }

    // Find nodes without matching courses
    const unmatchedNodes = roadmap.nodes
        .filter(node => 
            node.data.courseKeywords && 
            node.data.courseKeywords.length > 0 && 
            !matchedNodeIds.has(node.id)
        )
        .map(node => ({ id: node.id, label: node.data.label }));

    return {
        roadmap,
        matchedCourses,
        unmatchedNodes,
        coursesByNode
    };
}

// ===== STEP 3: Enroll & Create Study Plan =====
export async function enrollAndCreateStudyPlan(data: {
    courseIds: string[];
    roadmapId: string;
    daysOfWeek: number[];
    dailyMinutes: number;
    startDate: Date;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // 1. Auto-enroll in free courses
        const enrollmentPromises = data.courseIds.map(async (courseId) => {
            const existing = await db.enrollment.findUnique({
                where: { userId_courseId: { userId: user.id, courseId } }
            });

            if (!existing) {
                const course = await db.course.findUnique({
                    where: { id: courseId },
                    select: { price: true }
                });

                const isFree = !course?.price || Number(course.price) === 0;
                if (isFree) {
                    await db.enrollment.create({
                        data: { userId: user.id, courseId, progress: 0 }
                    });
                }
            }
        });
        await Promise.all(enrollmentPromises);

        // 2. Deactivate old study plans
        await db.studySchedule.updateMany({
            where: { userId: user.id, isActive: true },
            data: { isActive: false }
        });

        // 3. Create new Study Schedule
        const roadmap = getRoadmapById(data.roadmapId);
        const schedule = await db.studySchedule.create({
            data: {
                userId: user.id,
                name: roadmap?.title || "Lộ trình học tập",
                availableDays: data.daysOfWeek,
                dailyLearningMinutes: data.dailyMinutes,
                startDate: data.startDate,
                isActive: true
            }
        });

        // 4. Link courses to schedule
        await db.studyScheduleCourse.createMany({
            data: data.courseIds.map((courseId, idx) => ({
                studyScheduleId: schedule.id,
                courseId,
                priority: idx + 1
            }))
        });

        // 5. Generate study plan items
        const coursesWithLessons = await db.course.findMany({
            where: { id: { in: data.courseIds } },
            include: {
                chapters: {
                    orderBy: { position: 'asc' },
                    include: {
                        lessons: { orderBy: { position: 'asc' } }
                    }
                }
            }
        });

        // Order courses by user selection
        const orderedCourses = data.courseIds
            .map(id => coursesWithLessons.find(c => c.id === id))
            .filter(Boolean);

        const allLessons: { lessonId: string; duration: number }[] = [];
        for (const course of orderedCourses) {
            for (const chapter of course!.chapters) {
                for (const lesson of chapter.lessons) {
                    allLessons.push({
                        lessonId: lesson.id,
                        duration: lesson.duration || 15 * 60
                    });
                }
            }
        }

        // Distribute lessons onto study days
        let currentDate = new Date(data.startDate);
        currentDate.setHours(0, 0, 0, 0);

        const planItems: {
            userId: string;
            lessonId: string;
            studyScheduleId: string;
            scheduledAt: Date;
            isCompleted: boolean;
        }[] = [];

        let lessonIndex = 0;
        let safetyCounter = 0;

        while (lessonIndex < allLessons.length && safetyCounter < 365) {
            if (data.daysOfWeek.includes(currentDate.getDay())) {
                let minutesUsedToday = 0;

                while (lessonIndex < allLessons.length) {
                    const lesson = allLessons[lessonIndex];
                    const lessonDurationMin = Math.max(5, Math.ceil(lesson.duration / 60));

                    if (minutesUsedToday > 0 && (minutesUsedToday + lessonDurationMin) > data.dailyMinutes) {
                        break;
                    }

                    planItems.push({
                        userId: user.id,
                        lessonId: lesson.lessonId,
                        studyScheduleId: schedule.id,
                        scheduledAt: new Date(currentDate),
                        isCompleted: false
                    });

                    minutesUsedToday += lessonDurationMin;
                    lessonIndex++;
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
            safetyCounter++;
        }

        if (planItems.length > 0) {
            await db.studyPlanItem.createMany({ data: planItems });

            await db.studySchedule.update({
                where: { id: schedule.id },
                data: { targetEndDate: planItems[planItems.length - 1].scheduledAt }
            });
        }

        revalidatePath("/onboarding/study-plan");
        revalidatePath("/dashboard");

        return { success: true, scheduleId: schedule.id };

    } catch (error) {
        console.error("Enroll & Create Plan Error:", error);
        return { success: false, error: "Failed to create study plan" };
    }
}

// ===== Get User's Current Roadmap =====
export async function getUserRoadmap() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: { learningPath: true, interests: true }
    });

    if (!profile?.learningPath) return null;

    const learningPath = profile.learningPath as any;

    return {
        roadmap: getRoadmapById(learningPath.roadmapId),
        interests: profile.interests,
        selectedAt: learningPath.selectedAt,
        totalEstimatedHours: learningPath.totalEstimatedHours
    };
}
