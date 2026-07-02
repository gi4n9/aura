import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import RoadmapView from "@/app/components/RoadmapView";
import Link from "next/link";
import { ArrowLeft, Compass, ArrowRight } from "lucide-react";
import { skipRoadmapNode } from "@/app/actions/roadmap";

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

    if (!roadmap) {
        return (
            <div className="min-h-screen bg-[#F9F8F4] flex items-center justify-center p-4">
                <div className="text-center max-w-md bg-white p-10 rounded-3xl shadow-sm border border-stone-100">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                        <Compass size={48} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-2xl font-bold text-stone-900 mb-3">Hành trình chưa bắt đầu</h1>
                    <p className="text-stone-500 mb-8 leading-relaxed">
                        Hãy hoàn thành bài đánh giá ngắn để hệ thống thiết lập lộ trình học tập tối ưu nhất dành riêng cho bạn.
                    </p>
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-indigo-200"
                    >
                        Bắt đầu thiết lập
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Minimalist Header */}
            <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-stone-200/50 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link
                        href="/onboarding/study-plan"
                        className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-semibold text-sm"
                    >
                        <ArrowLeft size={18} />
                        Quay lại
                    </Link>

                    <div className="font-bold text-stone-900">
                        Lộ trình học tập của bạn
                    </div>

                    <div className="w-20" /> {/* Spacer to balance flex */}
                </div>
            </header>

            <main className="p-4 sm:p-6 mt-6">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Main Roadmap Component */}
                    <RoadmapView
                        nodes={roadmap.nodes.map(node => ({
                            ...node,
                            course: {
                                ...node.course,
                                price: Number(node.course.price)
                            }
                        })) as any}
                        title="Hành trình Cốt lõi"
                        description="Các khóa học được hệ thống tự động tính toán dựa trên sở thích của bạn."
                        progressPercentage={roadmap.progressPercentage}
                        onSkipNode={skipRoadmapNode}
                    />

                    <div className="flex justify-center py-6">
                        <Link
                            href="/onboarding/study-plan/create"
                            className="bg-[#1a1a1a] text-white px-10 py-4 rounded-xl font-bold hover:bg-stone-800 transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 text-lg hover:scale-105"
                        >
                            Bắt đầu tạo lịch học mỗi ngày <ArrowRight size={24} />
                        </Link>
                    </div>

                    {/* Modern Stats Footer */}
                    <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
                        {[
                            { label: "Chủ đề", value: roadmap.totalCourses, color: "text-stone-800" },
                            { label: "Tiến độ", value: `${roadmap.progressPercentage}%`, color: "text-indigo-600" },
                            { label: "Lĩnh vực", value: profile?.interests?.length || 0, color: "text-emerald-600" }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm text-center">
                                <div className={`text-2xl sm:text-3xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
                                <div className="text-[11px] uppercase tracking-widest font-bold text-stone-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}