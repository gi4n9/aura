import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/prisma";
import CourseProgressClient from "@/app/components/client/CourseProgressClient";

export default async function CourseProgressPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const course = await db.course.findUnique({
        where: { id: courseId },
        include: {
            chapters: {
                orderBy: { position: "asc" },
                include: {
                    lessons: {
                        orderBy: { position: "asc" },
                        include: {
                            _count: { select: { questions: { where: { isArchived: false } } } }
                        }
                    }
                }
            }
        }
    });

    if (!course) return redirect("/courses");

    const submissions = await db.submission.findMany({
        where: {
            userId: user.id,
            question: {
                lesson: {
                    chapter: {
                        courseId: courseId
                    }
                }
            }
        },
        include: {
            question: {
                select: {
                    id: true,
                    lessonId: true,
                    correctAnswer: true
                }
            }
        }
    });

    const videoProgresses = await db.videoProgress.findMany({
        where: {
            userId: user.id,
            lesson: {
                chapter: {
                    courseId: courseId
                }
            }
        },
        select: {
            lessonId: true,
            isCompleted: true,
            percentage: true
        }
    });

    const videoProgressMap = new Map<string, { isCompleted: boolean; percentage: number }>();
    videoProgresses.forEach(vp => {
        videoProgressMap.set(vp.lessonId, {
            isCompleted: vp.isCompleted,
            percentage: vp.percentage
        });
    });

    const lessonProgressMap = new Map<string, {
        totalQuestions: number;
        correctCount: number;
        submittedCount: number;
        isCompleted: boolean;
        videoCompleted: boolean;
        videoPercentage: number;
    }>();

    course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
            const videoProg = videoProgressMap.get(lesson.id);
            lessonProgressMap.set(lesson.id, {
                totalQuestions: lesson._count.questions,
                correctCount: 0,
                submittedCount: 0,
                isCompleted: false,
                videoCompleted: videoProg?.isCompleted ?? false,
                videoPercentage: videoProg?.percentage ?? 0
            });
        });
    });

    const answeredQuestions = new Set<string>();

    submissions.forEach(sub => {
        if (answeredQuestions.has(sub.questionId)) return;
        answeredQuestions.add(sub.questionId);

        const lessonId = sub.question.lessonId;
        const stats = lessonProgressMap.get(lessonId);
        if (stats) {
            stats.submittedCount += 1;
            if (sub.answerText === sub.question.correctAnswer) {
                stats.correctCount += 1;
            }
        }
    });

    let completedLessonsCount = 0;
    let totalLessonsCount = 0;

    course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
            totalLessonsCount++;
            const stats = lessonProgressMap.get(lesson.id)!;
            const hasQuiz = stats.totalQuestions > 0;

            if (hasQuiz) {
                if (stats.videoCompleted && stats.submittedCount >= stats.totalQuestions) {
                    stats.isCompleted = true;
                }
            } else {
                if (stats.videoCompleted) {
                    stats.isCompleted = true;
                }
            }

            if (stats.isCompleted) {
                completedLessonsCount++;
            }
        });
    });

    const progressPercent = totalLessonsCount > 0
        ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
        : 0;

    const lessonProgressObj: { [key: string]: any } = {};
    lessonProgressMap.forEach((v, k) => {
        lessonProgressObj[k] = v;
    });

    return (
        <CourseProgressClient
            courseId={courseId}
            courseTitle={course.title}
            chapters={course.chapters as any}
            progressPercent={progressPercent}
            completedLessonsCount={completedLessonsCount}
            totalLessonsCount={totalLessonsCount}
            lessonProgressObj={lessonProgressObj}
        />
    );
}
