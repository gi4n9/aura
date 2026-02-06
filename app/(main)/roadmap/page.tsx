import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import RoadmapView from "@/app/components/RoadmapView";
import { getRoadmapById } from "@/services/roadmap-data";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export default async function RoadmapPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch Profile
    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: { learningPath: true, interests: true }
    });

    // Check if onboarding is needed
    const learningPath = profile?.learningPath as any;

    if (!learningPath?.roadmapId) {
        // User hasn't completed onboarding
        return (
            <div className="min-h-screen bg-[#F9F8F4] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-400">
                        <BookOpen size={40} />
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-stone-900 mb-4">Chưa có lộ trình</h1>
                    <p className="text-stone-500 mb-8">
                        Bạn chưa hoàn thành bài đánh giá. Hãy hoàn thành để chúng tôi tạo lộ trình học tập phù hợp với bạn.
                    </p>
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#C5A059] transition shadow-lg"
                    >
                        Bắt đầu đánh giá
                    </Link>
                </div>
            </div>
        );
    }

    // Get roadmap data from ID
    const roadmapData = getRoadmapById(learningPath.roadmapId);

    if (!roadmapData) {
        redirect("/onboarding");
    }

    return (
        <div className="min-h-screen bg-[#F9F8F4]">
            {/* Header */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-stone-200 z-50 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link
                        href="/onboarding/study-plan"
                        className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition font-medium"
                    >
                        <ArrowLeft size={20} />
                        Quay lại
                    </Link>

                    <div className="text-center">
                        <h1 className="font-serif font-bold text-lg text-stone-900">{roadmapData.title}</h1>
                        <p className="text-xs text-stone-500">
                            {profile?.interests?.join(", ")}
                        </p>
                    </div>

                    <div className="w-24" /> {/* Spacer */}
                </div>
            </header>

            {/* Roadmap View */}
            <main className="p-4">
                <div className="max-w-7xl mx-auto">
                    <RoadmapView
                        initialNodes={roadmapData.nodes}
                        initialEdges={roadmapData.edges}
                        title={roadmapData.title}
                        description={roadmapData.description}
                    />

                    {/* Stats */}
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
                            <div className="text-3xl font-bold text-stone-900">{roadmapData.nodes.length}</div>
                            <div className="text-xs text-stone-500 font-medium">Chủ đề</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
                            <div className="text-3xl font-bold text-[#C5A059]">{roadmapData.totalEstimatedHours}h</div>
                            <div className="text-xs text-stone-500 font-medium">Thời lượng</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center col-span-2 md:col-span-1">
                            <div className="text-3xl font-bold text-green-600">{profile?.interests?.length || 0}</div>
                            <div className="text-xs text-stone-500 font-medium">Lĩnh vực</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
