"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveStudyPlan(courseId: string, planItems: { lessonId: string, date: string }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { success: false, error: "Unauthorized" };
    
    try {
        await db.$transaction(async (tx) => {
             // 1. Find existing items for this course to clear old plan
             // Note: We might want to keep "completed" items? 
             // For simplicity in "Generate New Plan", we usually overwrite future items. 
             // But if user has history, maybe keep it?
             // Let's assume "Reset Plan" behavior: Clear all uncompleted?
             // Or clear ALL related to this course to ensure clean slate based on user request.
             
             const oldItems = await tx.studyPlanItem.findMany({
                 where: {
                     userId: user.id,
                     lesson: { chapter: { courseId: courseId } }
                 },
                 select: { id: true }
             });
             
             if (oldItems.length > 0) {
                 await tx.studyPlanItem.deleteMany({
                     where: { id: { in: oldItems.map(i => i.id) } }
                 });
             }
             
             // 2. Insert new plan
             if (planItems.length > 0) {
                await tx.studyPlanItem.createMany({
                    data: planItems.map(item => ({
                        userId: user.id,
                        lessonId: item.lessonId,
                        scheduledAt: new Date(item.date),
                        isCompleted: false
                    }))
                });
             }
        });
        
        revalidatePath(`/courses/${courseId}`);
        return { success: true };
    } catch (e: any) {
        console.error("Save Plan Error:", e);
        return { success: false, error: e.message };
    }
}
