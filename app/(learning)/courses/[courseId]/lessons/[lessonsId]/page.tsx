import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LessonLayout from "@/app/components/lesson/LessonLayout";


interface LessonPageProps {
    params: Promise<{
        courseId: string;
        lessonsId: string;
    }>;
}

export default async function LessonIdPage({ params }: LessonPageProps) {
    const { courseId, lessonsId } = await params;

    // 1. Fetch Course & Chapters (Cho Sidebar)
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            chapters: {
                orderBy: { position: "asc" },
                include: {
                    lessons: { orderBy: { position: "asc" } },
                },
            },
        },
    });

    if (!course) return redirect("/courses");

    const serializedCourse = {
        ...course,
        price: course.price ? Number(course.price) : 0, // Ép kiểu Decimal -> Number
        // Nếu có các trường Decimal khác (như rating), bạn cũng phải ép kiểu tương tự
    };

    // 2. Fetch Lesson & Questions (Cho Content)
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonsId },
        include: {
            questions: {
                where: { isArchived: false },
                orderBy: { createdAt: "asc" }
            }
        }
    });

    if (!lesson) return redirect(`/courses/${courseId}`);

    // 3. Format Questions
    const formattedQuestions = lesson.questions.map((q) => ({
        id: q.id,
        content: q.content,
        options: q.options as string[],
    }));

    // 4. Render Layout Client
    return (
        <LessonLayout
            course={serializedCourse}
            lesson={lesson}
            formattedQuestions={formattedQuestions}
        />
    );
}