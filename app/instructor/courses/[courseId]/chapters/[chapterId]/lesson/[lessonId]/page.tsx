import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import QuestionEditor from "@/app/components/courseComponents/QuestionEditor";

export default async function LessonEditPage({ params }: { params: Promise<{ lessonId: string }> }) {
    const { lessonId } = await params;

    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { questions: true }, // Load câu hỏi ra
    });

    if (!lesson) return redirect("/instructor/dashboard");

    // Format lại dữ liệu cho Component (vì Prisma trả về Json object, cần ép kiểu)
    const formattedQuestions = lesson.questions.map(q => ({
        id: q.id,
        content: q.content,
        options: q.options as string[], // Ép kiểu JSON thành mảng string
        correctAnswer: q.correctAnswer || "A",
        aiExplanation: q.aiExplanation || ""
    }));

    return (
        <div className="min-h-screen bg-[#F9F8F4] p-6">
            <div className="max-w-4xl mx-auto mb-6">
                <Link href={`/instructor/courses/${lesson.chapterId /*Cần query thêm chapter để biết courseId*/}`} className="text-stone-500 flex items-center gap-1 mb-4 hover:text-stone-800">
                    <ArrowLeft size={16} /> Quay lại khóa học
                </Link>
                <h1 className="text-3xl font-serif font-bold text-stone-800">{lesson.title}</h1>
                <p className="text-stone-500">Video đã tải lên. Hãy xem lại các câu hỏi AI tạo ra bên dưới.</p>
            </div>

            {/* Render Component Editor */}
            <QuestionEditor lessonId={lesson.id} initialQuestions={formattedQuestions} />
        </div>
    );
}