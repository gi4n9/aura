import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import RoadmapView from "../../components/RoadmapView";
import { RoadmapData } from "@/services/roadmap-data";

export default async function RoadmapPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch Profile
    const profile: any = await prisma.profile.findUnique({
        where: { id: user.id },
    });

    // Check if onboarding is needed
    if (!profile || !profile.learningPath) {
        redirect("/onboarding");
    }

    const roadmapData = profile.learningPath as unknown as RoadmapData;
    const primaryInterest = (profile.interests as string[])?.[0] || "Learning Path";

    // Capitalize title
    const title = primaryInterest.charAt(0).toUpperCase() + primaryInterest.slice(1) + " Roadmap";

    return (
        <div>
            <RoadmapView
                initialNodes={roadmapData.nodes}
                initialEdges={roadmapData.edges}
                title={title}
            />
        </div>
    );
}
