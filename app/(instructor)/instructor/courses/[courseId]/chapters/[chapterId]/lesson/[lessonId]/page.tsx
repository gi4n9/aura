import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import LessonManagerClient from "@/app/components/courseComponents/LessonManagerClient";

export default async function LessonEditPage({ params }: { params: Promise<{ lessonId: string, courseId: string }> }) {
    const { lessonId, courseId } = await params;

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { questions: true },
    });

    if (!lesson) return redirect("/instructor/dashboard");

    const formattedQuestions = lesson.questions.map(q => ({
        id: q.id,
        content: q.content,
        options: q.options as string[],
        correctAnswer: (q.correctAnswer as "A" | "B" | "C" | "D") || "A",
        aiExplanation: q.aiExplanation || ""
    }));

    return (
        <div className="min-h-screen bg-[#F9F8F4] p-6">
            <div className="max-w-4xl mx-auto mb-6">
                <Link href={`/instructor/courses/${courseId}/settings`} className="text-stone-500 flex items-center gap-1 mb-4 hover:text-stone-800">
                    <ArrowLeft size={16} /> Quay lại khóa học
                </Link>
                <h1 className="text-3xl font-serif font-bold text-stone-800">{lesson.title}</h1>
                <p className="text-stone-500">Quản lý nội dung bài học và video.</p>
            </div>

            <div className="max-w-4xl mx-auto">
                <LessonManagerClient
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                    initialQuestions={formattedQuestions}
                />
            </div>
        </div>
    );
}