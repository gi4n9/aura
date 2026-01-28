"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function enrollFreeCourse(courseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "User not logged in" };
    }

    // Check course existence data
    const course = await db.course.findUnique({
        where: { id: courseId },
        select: { price: true, chapters: { include: { lessons: true } } }
    });

    if (!course) {
        return { error: "Course not found" };
    }

    // Only allow auto-enroll for FREE courses
    if (Number(course.price) > 0) {
        return { error: "This course requires payment." };
    }

    // Create Enrollment if not exists
    const existing = await db.enrollment.findUnique({
        where: {
            userId_courseId: {
                userId: user.id,
                courseId: courseId
            }
        }
    });

    if (!existing) {
        await db.enrollment.create({
            data: {
                userId: user.id,
                courseId: courseId,
                progress: 0
            }
        });
    }

    // Revalidate course page to update UI (show Progress bar instead of Enroll button)
    revalidatePath(`/courses/${courseId}`);
    
    // Find first lesson to redirect to
    const firstLesson = course.chapters[0]?.lessons[0];
    if (firstLesson) {
        return { success: true, redirectUrl: `/courses/${courseId}/lessons/${firstLesson.id}` };
    }

    return { success: true, redirectUrl: `/courses/${courseId}` }; 
}
