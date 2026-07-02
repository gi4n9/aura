import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProgressDetailsList from "@/app/components/courseComponents/ProgressDetailsList";

export default async function CourseProgressPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // 1. Fetch Course Structure (Chapters -> Lessons -> Questions)
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

    // 2. Fetch User Submissions for this Course
    // We fetch all submissions by this user related to questions in this course
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

    // 2.5 Fetch Video Progress for this Course
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

    // 3. Process Data
    // Create a map of LessonID -> { totalQuestions, correctAnswers, submittedCount }
    const lessonProgressMap = new Map<string, {
        totalQuestions: number;
        correctCount: number;
        submittedCount: number;
        isCompleted: boolean;
        videoCompleted: boolean;
        videoPercentage: number;
    }>();

    // Initialize from structure
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

    // Fill with submission data
    const answeredQuestions = new Set<string>(); // avoid double counting if multiple subs

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

    // Determine Lesson Completion
    let completedLessonsCount = 0;
    let totalLessonsCount = 0;

    course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
            totalLessonsCount++;
            const stats = lessonProgressMap.get(lesson.id)!;
            const hasQuiz = stats.totalQuestions > 0;

            if (hasQuiz) {
                // Done if video watched AND all questions submitted
                if (stats.videoCompleted && stats.submittedCount >= stats.totalQuestions) {
                    stats.isCompleted = true;
                }
            } else {
                // Done if video watched (since no quiz)
                if (stats.videoCompleted) {
                    stats.isCompleted = true;
                }
            }

            if (stats.isCompleted) {
                completedLessonsCount++;
            }
        });
    });

    // Calculate Overall Percentage (all lessons completed / total lessons)
    const progressPercent = totalLessonsCount > 0
        ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
        : 0;


    const lessonProgressObj: { [key: string]: any } = {};
    lessonProgressMap.forEach((v, k) => {
        lessonProgressObj[k] = v;
    });

    return (
        <div className="min-h-screen bg-[#F9F8F4] p-6 font-sans pt-[80px]">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* HEADER */}
                <div>
                    <Link href={`/courses/${courseId}`} className="inline-flex items-center text-sm text-stone-500 hover:text-[#C5A059] mb-4 transition-colors">
                        <ArrowLeft size={16} className="mr-2" /> Quay lại khóa học
                    </Link>
                    <h1 className="text-3xl font-serif font-bold text-stone-800">{course.title}</h1>
                    <p className="text-stone-500 mt-1">Kết quả học tập & Tiến độ làm bài</p>
                </div>

                {/* OVERALL PROGRESS CARD */}
                <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        {/* Circular Progress (Simple SVG) */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="#E7E5E4" strokeWidth="12" fill="transparent" />
                            <circle
                                cx="64" cy="64" r="56"
                                stroke="#C5A059" strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={351}
                                strokeDashoffset={351 - (351 * progressPercent) / 100}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-stone-800">{progressPercent}%</span>
                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Hoàn thành</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-2 text-center md:text-left">
                        <h3 className="text-xl font-bold text-stone-700">Tổng quan kết quả</h3>
                        <p className="text-stone-500 text-sm">
                            Bạn đã hoàn thành <strong>{completedLessonsCount}</strong> trên tổng số <strong>{totalLessonsCount}</strong> bài học của khóa học.
                            Hãy tiếp tục cố gắng!
                        </p>
                    </div>
                </div>

                {/* DETAILS LIST WITH PAGINATION & CHAPTER SELECTOR */}
                <ProgressDetailsList
                    chapters={course.chapters as any}
                    lessonProgress={lessonProgressObj}
                />
            </div>
        </div>
    );
}
