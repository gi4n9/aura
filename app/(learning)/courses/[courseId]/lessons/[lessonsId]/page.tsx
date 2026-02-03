import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LessonLayout from "@/app/(learning)/courses/[courseId]/lessons/LessonLayout";
import { createClient } from "@/utils/supabase/server";
import { getCachedCourse } from "@/lib/courses";

interface LessonPageProps {
    params: Promise<{
        courseId: string;
        lessonsId: string;
    }>;
}

export default async function LessonIdPage({ params }: LessonPageProps) {
    const { courseId, lessonsId } = await params;

    // Optimized: Parallel Fetching
    const supabasePromise = createClient();
    const coursePromise = getCachedCourse(courseId);
    const lessonPromise = prisma.lesson.findUnique({
        where: { id: lessonsId },
        select: {
            id: true,
            title: true,
            youtubeVideoId: true,
            transcript: true,
            timeline: true,
            duration: true,
            questions: {
                where: { isArchived: false },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    content: true,
                    options: true,
                    correctAnswer: true,
                    aiExplanation: true,
                }
            }
        }
    });

    const [supabase, course, lesson] = await Promise.all([
        supabasePromise,
        coursePromise,
        lessonPromise
    ]);

    const { data: { user } } = await supabase.auth.getUser();

    // Validate Fetch Results
    if (!course) return redirect("/courses");
    if (!lesson) return redirect(`/courses/${courseId}`);

    const serializedCourse = {
        ...course,
        price: course.price ? Number(course.price) : 0,
    };

    // 1.5 Auto-Enroll if Free and not enrolled
    if (user && serializedCourse.price === 0) {
        // We can't cache enrollment status easily as it's per-user.
        const existing = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId: course.id } }
        });
        if (!existing) {
            await prisma.enrollment.create({
                data: { userId: user.id, courseId: course.id, progress: 0 }
            });
        }
    }

    // 2. Fetch User Submissions (Parallelable? No, dependent on lesson questions, but could be)
    // Actually we know lessonId, so we can fetch submissions by lessonId directly if we didn't need Q mapping
    // But we map Qs.

    let userAnswers: Record<string, string> = {};
    let initialResult = null;

    if (user && lesson.questions.length > 0) {
        const questionsIds = lesson.questions.map(q => q.id);

        const submissions = await prisma.submission.findMany({
            where: {
                userId: user.id,
                questionId: { in: questionsIds }
            }
        });

        if (submissions.length > 0) {
            submissions.forEach(sub => {
                userAnswers[sub.questionId] = sub.answerText || "";
            });

            // Calculate Result
            let correctCount = 0;
            const feedback = lesson.questions.map(q => {
                const userAns = userAnswers[q.id];
                const isCorrect = userAns === q.correctAnswer;
                if (isCorrect) correctCount++;
                return {
                    questionId: q.id,
                    isCorrect,
                    correctAnswer: q.correctAnswer,
                    explanation: q.aiExplanation
                };
            });

            initialResult = {
                success: true,
                score: Math.round((correctCount / lesson.questions.length) * 100),
                correctCount,
                total: lesson.questions.length,
                feedback
            };
        }
    }

    // 3. Format Questions
    const formattedQuestions = lesson.questions.map((q) => ({
        id: q.id,
        content: q.content,
        options: q.options as string[],
        userAnswer: userAnswers[q.id] || null
    }));

    // 4. Serialize lesson với proper types
    type TimelineItem = { time: number; label: string };
    const serializedLesson = {
        ...lesson,
        timeline: lesson.timeline as TimelineItem[] | null,
    };

    return (
        <LessonLayout
            course={serializedCourse}
            lesson={serializedLesson}
            formattedQuestions={formattedQuestions}
            initialResult={initialResult}
            userAnswers={userAnswers}
        />
    );
}