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
            mindMapData: true,
            flashcards: true,
            duration: true,
            quizDisplayMode: true,
            questions: {
                where: { isArchived: false },
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    content: true,
                    type: true,
                    options: true,
                    correctAnswer: true,
                    aiExplanation: true,
                    timestamp: true,
                    quizSource: true,
                    contentImageUrl: true,
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

    // 1.5 Access Control & Auto-Enroll
    if (!user) {
        // Require login to view lessons
        return redirect(`/login?next=/courses/${courseId}/lessons/${lessonsId}`);
    }

    const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } }
    });

    if (!enrollment) {
        // If course is FREE -> Auto Enroll
        if (serializedCourse.price === 0) {
            await prisma.enrollment.create({
                data: { userId: user.id, courseId: course.id, progress: 0 }
            });
            // Continue loading lesson...
        } else {
            // If course is PAID and not enrolled -> Redirect to Course Detail Page for purchase
            return redirect(`/courses/${courseId}`);
        }
    }

    // 2. Fetch User Submissions (Parallelable? No, dependent on lesson questions, but could be)
    // Actually we know lessonId, so we can fetch submissions by lessonId directly if we didn't need Q mapping
    // But we map Qs.

    let userAnswers: Record<string, { selectedOption?: string, answerText?: string, fileUrl?: string }> = {};
    let initialResult = null;

    // Filter questions based on displayMode
    let displayQuestions = lesson.questions;
    if (lesson.quizDisplayMode === "AI_ONLY") {
        displayQuestions = lesson.questions.filter(q => q.quizSource === "AI_VIDEO");
    } else if (lesson.quizDisplayMode === "WORKSHEET_ONLY") {
        displayQuestions = lesson.questions.filter(q => q.quizSource === "WORKSHEET");
    }

    if (user && displayQuestions.length > 0) {
        const questionsIds = displayQuestions.map(q => q.id);

        const submissions = await prisma.submission.findMany({
            where: {
                userId: user.id,
                questionId: { in: questionsIds }
            }
        });

        if (submissions.length > 0) {
            submissions.forEach(sub => {
                const isMC = displayQuestions.find(q => q.id === sub.questionId)?.type === "MULTIPLE_CHOICE";
                userAnswers[sub.questionId] = {
                    selectedOption: isMC ? sub.answerText || undefined : undefined,
                    answerText: !isMC ? sub.answerText || undefined : undefined,
                    fileUrl: sub.fileUrl || undefined
                };
            });

            // Calculate Result
            let correctCount = 0;
            const mcQuestions = displayQuestions.filter(q => q.type === "MULTIPLE_CHOICE");
            const totalMcQuestions = mcQuestions.length;

            const feedback = displayQuestions.map(q => {
                const userAns = userAnswers[q.id];
                const isMC = q.type === "MULTIPLE_CHOICE";
                
                let isCorrect = true;
                if (isMC) {
                    isCorrect = userAns?.selectedOption === q.correctAnswer;
                    if (isCorrect) correctCount++;
                }

                return {
                    questionId: q.id,
                    isCorrect,
                    correctAnswer: q.correctAnswer,
                    explanation: q.aiExplanation
                };
            });

            initialResult = {
                success: true,
                score: totalMcQuestions > 0 ? Math.round((correctCount / totalMcQuestions) * 100) : 100,
                correctCount,
                total: totalMcQuestions,
                feedback
            };
        }
    }

    // 3. Format Questions
    const formattedQuestions = displayQuestions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        options: q.options as string[],
        contentImageUrl: q.contentImageUrl,
        timestamp: q.timestamp,
        quizSource: q.quizSource
    }));

    // 4. Fetch all user progress for this course to display in Sidebar
    let allVideoProgress: any[] = [];
    let allQuizResults: any[] = [];

    if (user) {
        allVideoProgress = await prisma.videoProgress.findMany({
            where: {
                userId: user.id,
                lesson: { chapter: { courseId: course.id } }
            },
            select: { lessonId: true, percentage: true }
        });

        allQuizResults = await prisma.quizResult.findMany({
            where: {
                userId: user.id,
                courseId: course.id
            },
            select: { lessonId: true, isPassed: true }
        });
    }

    // 5. Serialize lesson với proper types
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
            allVideoProgress={allVideoProgress}
            allQuizResults={allQuizResults}
        />
    );
}