import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import LessonManagerClient from "@/app/components/courseComponents/LessonManagerClient";

export default async function LessonEditPage({ params }: { params: Promise<{ lessonId: string, courseId: string }> }) {
    const { lessonId, courseId } = await params;

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { questions: true, flashcards: true },

    });

    if (!lesson) return redirect("/instructor/dashboard");

    const formattedQuestions = lesson.questions.map(q => ({
        id: q.id,
        content: q.content,
        options: q.options as string[],
        correctAnswer: (q.correctAnswer as "A" | "B" | "C" | "D") || "A",
        aiExplanation: q.aiExplanation || "",
        quizSource: q.quizSource,
        contentImageUrl: q.contentImageUrl,
        timestamp: q.timestamp,
        type: q.type
    }));

    const formattedFlashcards = lesson.flashcards.map(fc => ({
        id: fc.id,
        front: fc.front,
        back: fc.back,
        timestamp: fc.timestamp
    }));

    const isProcessing = lesson.youtubeVideoId === null;

    return (
        <div className="min-h-screen bg-[#F9F8F4] p-6">
            <div className="max-w-4xl mx-auto mb-6">
                <Link href={`/instructor/courses/${courseId}/settings`} className="text-stone-500 flex items-center gap-1 mb-4 hover:text-stone-800">
                    <ArrowLeft size={16} /> Quay lại khóa học
                </Link>
                <div className="flex flex-col gap-2 mb-2">
                    <h1 className="text-3xl font-serif font-bold text-stone-800 flex items-center flex-wrap gap-3">
                        {lesson.title}
                        {isProcessing && (
                            <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full animate-pulse flex items-center gap-2 font-medium">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                                ⏳ AI đang phân tích bài giảng (Vui lòng tải lại trang sau 5-10p)
                            </span>
                        )}
                    </h1>
                </div>
                <p className="text-stone-500">Quản lý nội dung bài học và video.</p>
            </div>

            <div className="max-w-4xl mx-auto">
                <LessonManagerClient
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                    initialQuestions={formattedQuestions}
                    initialTranscript={lesson.transcript}
                    initialMindMap={lesson.mindMapData}
                    initialFlashcards={formattedFlashcards}
                    initialDisplayMode={lesson.quizDisplayMode}
                />
            </div>
        </div>
    );
}