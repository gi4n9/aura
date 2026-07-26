import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { skipRoadmapNode } from "@/app/actions/roadmap";
import RoadmapClientPage from "./RoadmapClientPage";

export default async function RoadmapPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const existingStudyPlan = await db.studyPlanItem.findFirst({
        where: { userId: user.id }
    });

    if (existingStudyPlan) {
        redirect("/onboarding/study-plan");
    }

    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: { interests: true }
    });

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