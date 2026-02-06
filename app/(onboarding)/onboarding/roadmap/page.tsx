import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getRoadmapById } from "@/services/roadmap-data";
import RoadmapView from "@/app/components/RoadmapView";
import Link from "next/link";
import { ArrowLeft, Calendar, BookOpen } from "lucide-react";

export default async function RoadmapPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Get user's learning path
    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: { learningPath: true, interests: true }
    });

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
                        Bạn chưa chọn lộ trình học tập. Hãy hoàn thành bài đánh giá để chúng tôi tạo lộ trình phù hợp với bạn.
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

    const roadmap = getRoadmapById(learningPath.roadmapId);

    if (!roadmap) {
        redirect("/onboarding");
    }

    // Get completed lessons to mark on roadmap
    const completedProgress = await db.videoProgress.findMany({
        where: { userId: user.id, isCompleted: true },
        select: { lessonId: true }
    });

    // Map completed lessons to roadmap nodes (simplified - in real app, would need more logic)
    const completedNodeIds: string[] = [];
    // This would require more complex mapping logic based on your course structure

    return (
        <div className="min-h-screen bg-[#F9F8F4]">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-stone-200 z-50 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link
                        href="/onboarding/study-plan"
                        className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition font-medium"
                    >
                        <ArrowLeft size={20} />
                        Quay lại
                    </Link>

                    <div className="text-center">
                        <h1 className="font-serif font-bold text-lg text-stone-900">{roadmap.title}</h1>
                        <p className="text-xs text-stone-500">{profile?.interests?.join(", ")}</p>
                    </div>

                    <Link
                        href="/onboarding/study-plan"
                        className="flex items-center gap-2 bg-[#C5A059] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#b08d4b] transition"
                    >
                        <Calendar size={16} />
                        Lịch học
                    </Link>
                </div>
            </header>

            {/* Roadmap View */}
            <main className="pt-20 p-4">
                <div className="max-w-7xl mx-auto">
                    <RoadmapView
                        initialNodes={roadmap.nodes}
                        initialEdges={roadmap.edges}
                        title={roadmap.title}
                        description={roadmap.description}
                        completedNodeIds={completedNodeIds}
                    />

                    {/* Stats */}
                    <div className="mt-8 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
                            <div className="text-3xl font-bold text-stone-900">{roadmap.nodes.length}</div>
                            <div className="text-xs text-stone-500 font-medium">Chủ đề</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
                            <div className="text-3xl font-bold text-[#C5A059]">{roadmap.totalEstimatedHours}h</div>
                            <div className="text-xs text-stone-500 font-medium">Thời lượng</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center">
                            <div className="text-3xl font-bold text-green-600">{completedNodeIds.length}</div>
                            <div className="text-xs text-stone-500 font-medium">Hoàn thành</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
