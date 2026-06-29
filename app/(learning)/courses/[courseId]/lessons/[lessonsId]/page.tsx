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
                    modelAnswer: true,
                    modelAnswerFileUrl: true,
                    passage: {
                        select: {
                            id: true,
                            title: true,
                            content: true
                        }
                    },
                    subItems: {
                        orderBy: { position: "asc" },
                        select: {
                            id: true,
                            label: true,
                            content: true,
                            isCorrect: true,
                            position: true
                        }
                    }
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

    let userAnswers: Record<string, any> = {};
    let initialResult = null;
    let submissions: any[] = [];

    // Filter questions based on displayMode
    let displayQuestions = lesson.questions;
    if (lesson.quizDisplayMode === "AI_ONLY") {
        displayQuestions = lesson.questions.filter(q => q.quizSource === "AI_VIDEO");
    } else if (lesson.quizDisplayMode === "WORKSHEET_ONLY") {
        displayQuestions = lesson.questions.filter(q => q.quizSource === "WORKSHEET");
    }

    if (user && displayQuestions.length > 0) {
        const questionsIds = displayQuestions.map(q => q.id);

        submissions = await prisma.submission.findMany({
            where: {
                userId: user.id,
                questionId: { in: questionsIds }
            }
        });

        if (submissions.length > 0) {
            submissions.forEach(sub => {
                const question = displayQuestions.find(q => q.id === sub.questionId);
                if (!question) return;

                if (question.type === "MULTIPLE_CHOICE") {
                    userAnswers[sub.questionId] = {
                        selectedOption: sub.answerText || undefined
                    };
                } else if (question.type === "TRUE_FALSE") {
                    let parsedAnswers = {};
                    try {
                        parsedAnswers = sub.answerText ? JSON.parse(sub.answerText) : {};
                    } catch (e) {
                        console.error("Failed to parse TRUE_FALSE answers:", e);
                    }
                    userAnswers[sub.questionId] = {
                        subItemAnswers: parsedAnswers
                    };
                } else {
                    // FILL_IN_BLANK, ESSAY, READING_COMPREHENSION
                    userAnswers[sub.questionId] = {
                        answerText: sub.answerText || undefined,
                        fileUrl: sub.fileUrl || undefined
                    };
                }
            });

            // Fetch QuizResult
            const quizResult = await prisma.quizResult.findUnique({
                where: {
                    userId_lessonId: { userId: user.id, lessonId: lessonsId }
                }
            });

            const feedback = displayQuestions.map(q => {
                const sub = submissions.find(s => s.questionId === q.id);
                const userAns = userAnswers[q.id];

                if (!sub) return null;

                let isCorrect = false;
                let subItemFeedback = undefined;
                let isPendingGrading = false;
                let essayScore = null;
                let essayFeedback = null;
                let isFinalized = false;

                if (q.type === "MULTIPLE_CHOICE") {
                    isCorrect = sub.score === 1;
                } else if (q.type === "FILL_IN_BLANK") {
                    isCorrect = sub.score === 1;
                } else if (q.type === "TRUE_FALSE") {
                    isCorrect = sub.score === 1;
                    const subItemFeedbackObj: Record<string, { isCorrect: boolean }> = {};
                    const studentAns = userAns?.subItemAnswers;
                    if (q.subItems && studentAns) {
                        q.subItems.forEach((subItem: any) => {
                            const ansVal = studentAns[subItem.id];
                            subItemFeedbackObj[subItem.id] = {
                                isCorrect: ansVal === subItem.isCorrect
                            };
                        });
                        subItemFeedback = subItemFeedbackObj;
                    }
                } else if (q.type === "ESSAY" || q.type === "READING_COMPREHENSION") {
                    isCorrect = true; // Luôn hiển thị pass màu xanh ở viền/icon chính
                    isFinalized = sub.isFinalized;
                    isPendingGrading = !sub.isFinalized;
                    essayScore = sub.score;
                    essayFeedback = sub.feedback;
                }

                return {
                    questionId: q.id,
                    isCorrect,
                    correctAnswer: q.correctAnswer,
                    explanation: q.aiExplanation,
                    subItemFeedback,
                    isPendingGrading,
                    essayScore,
                    essayFeedback,
                    isFinalized,
                    modelAnswer: q.modelAnswer,
                    modelAnswerFileUrl: q.modelAnswerFileUrl
                };
            }).filter(Boolean);

            initialResult = {
                success: true,
                score: quizResult?.score ?? 0,
                correctCount: quizResult?.correctAnswers ?? 0,
                total: quizResult?.totalQuestions ?? 0,
                feedback
            };
        }
    }

    // 3. Format Questions
    const hasSubmitted = submissions && submissions.length > 0;
    const formattedQuestions = displayQuestions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        options: q.options as string[],
        contentImageUrl: q.contentImageUrl,
        timestamp: q.timestamp,
        quizSource: q.quizSource,
        passage: q.passage ? {
            id: q.passage.id,
            title: q.passage.title,
            content: q.passage.content
        } : null,
        subItems: q.subItems ? q.subItems.map((sub: any) => ({
            id: sub.id,
            label: sub.label,
            content: sub.content,
            position: sub.position,
            isCorrect: hasSubmitted ? sub.isCorrect : undefined
        })) : []
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