import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { skipRoadmapNode } from "@/app/actions/roadmap";
import RoadmapClientPage from "./RoadmapClientPage";

export default async function RoadmapPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: { interests: true, learningPath: true }
    });

    const hasProfileLearningPath = Boolean(
        profile?.learningPath &&
        (typeof profile.learningPath === "object" ? Object.keys(profile.learningPath as object).length > 0 : true)
    );

    const hasActiveSchedule = await db.studySchedule.findFirst({
        where: { userId: user.id, isActive: true },
        select: { id: true }
    });

    const existingStudyPlan = await db.studyPlanItem.findFirst({
        where: { userId: user.id },
        select: { id: true }
    });

    if (hasProfileLearningPath || hasActiveSchedule || existingStudyPlan) {
        redirect("/onboarding/study-plan");
    }

    const roadmap = await db.userRoadmap.findUnique({
        where: { userId: user.id },
        include: {
            nodes: {
                include: {
                    course: {
                        include: { category: true }
                    }
                }
            }
        }
    });

    // Convert Prisma Decimal objects to plain numbers for Next.js Client Component props
    const serializedRoadmap = roadmap ? {
        ...roadmap,
        nodes: roadmap.nodes.map((node) => ({
            ...node,
            course: {
                ...node.course,
                price: Number(node.course.price)
            }
        }))
    } : null;

    return (
        <RoadmapClientPage
            roadmap={serializedRoadmap as any}
            profile={profile}
            skipRoadmapNodeAction={skipRoadmapNode}
        />
    );
}