import { getCachedCourse } from "@/lib/courses";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PlanGenerator from "@/app/components/study-plan/PlanGenerator";
import Link from "next/link";
import { ArrowLeft, CalendarRange } from "lucide-react";

interface PageProps {
    params: Promise<{ courseId: string }>;
}

export default async function StudyPlanPage({ params }: PageProps) {
    const { courseId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const course = await getCachedCourse(courseId);
    if (!course) return redirect("/courses");

    // Flatten lessons for the generator
    const allLessons = course.chapters.flatMap(ch =>
        ch.lessons.map(l => ({
            id: l.id,
            title: l.title,
            duration: l.duration,
            chapterTitle: ch.title
        }))
    );

    return (
        <div className="min-h-screen bg-[#F9F8F4] pb-20 pt-20">
            <div className="container mx-auto px-6">

                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/courses/${courseId}`}
                        className="inline-flex items-center text-xs font-bold text-stone-400 hover:text-[#C5A059] uppercase tracking-wider mb-4 transition-colors"
                    >
                        <ArrowLeft size={14} className="mr-1" /> Quay lại khóa học
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-[#C5A059] shadow-lg">
                            <CalendarRange size={24} />
                        </div>
                        <div>
                            <h1 className="font-serif text-3xl font-bold text-stone-800">Lộ Trình Học Tập</h1>
                            <p className="text-stone-500 text-sm">Tự động thiết kế lịch học cá nhân hóa cho khóa: <span className="font-bold text-stone-700">{course.title}</span></p>
                        </div>
                    </div>
                </div>

                <PlanGenerator courseId={courseId} lessons={allLessons} />

            </div>
        </div>
    );
}
