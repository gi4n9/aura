import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CourseDetailClient from "@/app/components/client/CourseDetailClient";

interface PageProps {
    params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: PageProps) {
    const { courseId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch Course with Question Counts
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            instructor: true,
            organization: true,
            chapters: {
                orderBy: { position: "asc" },
                include: {
                    lessons: {
                        orderBy: { position: "asc" },
                        include: {
                            _count: {
                                select: { questions: { where: { isArchived: false } } }
                            }
                        }
                    },
                },
            },
        },
    });

    if (!course) return notFound();

    // 2. Calculate Progress & Duration
    let isEnrolled = false;
    let progressPercent = 0;
    let totalCourseDurationSeconds = 0;

    const lessonCompletionMap = new Map<string, boolean>();
    const chapterProgressMap = new Map<string, number>();

    course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
            if (lesson.duration) {
                totalCourseDurationSeconds += lesson.duration;
            }
        });
    });

    const videoProgressMap = new Map<string, number>();
    const quizPassMap = new Map<string, boolean>();

    if (user) {
        const enroll = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId: course.id } }
        });

        if (enroll) {
            isEnrolled = true;
            progressPercent = enroll.progress;

            const vpRecords = await prisma.videoProgress.findMany({
                where: { userId: user.id, lesson: { chapter: { courseId: course.id } } },
                select: { lessonId: true, percentage: true }
            });
            vpRecords.forEach(vp => videoProgressMap.set(vp.lessonId, vp.percentage));

            const qrRecords = await prisma.quizResult.findMany({
                where: { userId: user.id, courseId: course.id },
                select: { lessonId: true, isPassed: true }
            });
            qrRecords.forEach(qr => quizPassMap.set(qr.lessonId, qr.isPassed));

            course.chapters.forEach(chapter => {
                let chapterProgressAccumulator = 0;

                chapter.lessons.forEach(lesson => {
                    const videoPct = videoProgressMap.get(lesson.id) || 0;
                    const hasQuiz = lesson._count.questions > 0;
                    const isQuizPassed = quizPassMap.get(lesson.id) || false;

                    let lessonProg = 0;
                    if (hasQuiz) {
                        lessonProg = (videoPct * 0.7) + (isQuizPassed ? 30 : 0);
                    } else {
                        lessonProg = videoPct;
                    }

                    if (lessonProg >= 90) {
                        lessonCompletionMap.set(lesson.id, true);
                    }
                    chapterProgressAccumulator += lessonProg;
                });

                const chapProg = chapter.lessons.length > 0
                    ? Math.round(chapterProgressAccumulator / chapter.lessons.length)
                    : 0;
                chapterProgressMap.set(chapter.id, Math.min(chapProg, 100));
            });
        }
    }

    const firstLesson = course.chapters[0]?.lessons[0];

    const lessonCompletionObj: { [key: string]: boolean } = {};
    lessonCompletionMap.forEach((v, k) => {
        lessonCompletionObj[k] = v;
    });

    const videoProgressObj: { [key: string]: number } = {};
    videoProgressMap.forEach((v, k) => {
        videoProgressObj[k] = v;
    });

    const quizPassObj: { [key: string]: boolean } = {};
    quizPassMap.forEach((v, k) => {
        quizPassObj[k] = v;
    });

    const serializedCourse = {
        ...course,
        price: Number(course.price)
    };

    return (
        <CourseDetailClient
            course={serializedCourse}
            isEnrolled={isEnrolled}
            progressPercent={progressPercent}
            totalCourseDurationSeconds={totalCourseDurationSeconds}
            firstLesson={firstLesson}
            lessonCompletionObj={lessonCompletionObj}
            videoProgressObj={videoProgressObj}
            quizPassObj={quizPassObj}
        />
    );
}