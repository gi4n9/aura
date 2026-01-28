"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getRoadmapByInterest } from "@/services/roadmap-data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
        // 1. Generate Learning Path based on primary interest (first one for now)
        const primaryInterest = interests[0];
        const roadmapData = getRoadmapByInterest(primaryInterest);
        
        // 2. Update Profile
        await prisma.profile.update({
            where: { id: user.id },
            data: {
                interests: interests,
                learningPath: roadmapData,
            } as any
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Onboarding Error:", error);
        return { success: false, error: "Failed to save profile" };
    }
}
