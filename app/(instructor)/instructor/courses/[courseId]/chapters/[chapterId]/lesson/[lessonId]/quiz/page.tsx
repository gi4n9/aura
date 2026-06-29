import QuizEditor from "@/app/components/courseComponents/QuizEditor";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

interface QuizPageProps {
    params: {
        courseId: string;
        chapterId: string;
        lessonId: string;
    };
}

export default async function QuizPage({ params }: QuizPageProps) {
    const { lessonId } = await params;

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            questions: {
                where: { isArchived: false },
                orderBy: { createdAt: "asc" },
                include: {
                    subItems: {
                        orderBy: { position: "asc" }
                    },
                    passage: true
                }
            },
        },
    });

    if (!lesson) {
        return redirect("/instructor/courses");
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-4xl mx-auto mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Biên tập câu hỏi
                </h1>
                <p className="text-slate-500">
                    Bài học: <span className="font-semibold">{lesson.title}</span>
                </p>
            </div>

            <QuizEditor
                lessonId={lesson.id}
                initialQuestions={lesson.questions}
                initialDisplayMode={lesson.quizDisplayMode}
            />
        </div>
    );
}