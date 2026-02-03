import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, XCircle, FileQuestion, PlayCircle } from "lucide-react";

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
                where: { status: "PUBLISHED" },
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

    // 3. Process Data
    // Create a map of LessonID -> { totalQuestions, correctAnswers, submittedCount }
    const lessonProgressMap = new Map<string, {
        totalQuestions: number;
        correctCount: number;
        submittedCount: number;
        isCompleted: boolean;
    }>();

    // Initialize from structure
    course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
            lessonProgressMap.set(lesson.id, {
                totalQuestions: lesson._count.questions,
                correctCount: 0,
                submittedCount: 0,
                isCompleted: false
            });
        });
    });

    // Fill with submission data
    // Note: A user might submit multiple times for one question? 
    // Depending on DB unique constraints. Taking the latest status or just checking existence.
    // Assuming 1 submission per question per user (or just counting unique questions answered).

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

    // Determine Lesson Completion (Simple logic: if submitted > 0 OR video watched? I only have quiz data)
    // Logic: If lesson has questions, must answer all? Or at least one?
    // Let's say: If has Questions, progress = submitted / total.
    // If no Questions, it's a Video lesson -> we don't track 'watched' yet so treat as 'Info'.

    let completedLessonsCount = 0;
    let totalLessonsCount = 0;

    course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
            totalLessonsCount++;
            const stats = lessonProgressMap.get(lesson.id)!;

            if (stats.totalQuestions > 0) {
                // Complete if attempted all questions? Or just some?
                // Let's say complete if submitted >= totalQuestions (Done all)
                if (stats.submittedCount >= stats.totalQuestions) {
                    stats.isCompleted = true;
                    completedLessonsCount++;
                }
            } else {
                // No questions. How to mark complete? 
                // Without 'UserProgress' table, we can't know if they watched.
                // We'll mark as 'N/A' or 'Video Only'. I won't count it in 'Academic Progress' percentage for QUIZ.
                // Or I just assume it's incomplete for now.
            }
        });
    });

    // Calculate Percentage (of Quiz completion)
    const quizEnsuredLessons = course.chapters.flatMap(c => c.lessons).filter(l => l._count.questions > 0).length;
    const quizCompletedLessons = Array.from(lessonProgressMap.values()).filter(s => s.totalQuestions > 0 && s.isCompleted).length;

    const progressPercent = quizEnsuredLessons > 0
        ? Math.round((quizCompletedLessons / quizEnsuredLessons) * 100)
        : 0;


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
                            Bạn đã hoàn thành <strong>{quizCompletedLessons}</strong> trên tổng số <strong>{quizEnsuredLessons}</strong> bài học có bài tập kiểm tra.
                            Hãy tiếp tục cố gắng!
                        </p>
                    </div>
                </div>

                {/* DETAILS LIST */}
                <div className="space-y-6">
                    {course.chapters.map((chapter) => (
                        <div key={chapter.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                            {/* Chapter Header */}
                            <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                                <h2 className="font-bold text-stone-700 text-lg">{chapter.title}</h2>
                                <span className="text-xs font-bold bg-white border border-stone-200 px-3 py-1 rounded-full text-stone-500">
                                    {chapter.lessons.length} bài học
                                </span>
                            </div>

                            {/* Lessons List */}
                            <div className="divide-y divide-stone-100">
                                {chapter.lessons.length === 0 ? (
                                    <div className="p-6 text-center text-stone-400 italic text-sm">Chưa có bài học.</div>
                                ) : (
                                    chapter.lessons.map((lesson) => {
                                        const stats = lessonProgressMap.get(lesson.id)!;
                                        const hasQuiz = stats.totalQuestions > 0;

                                        return (
                                            <div key={lesson.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                                                {/* Lesson Info */}
                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-1 ${stats.isCompleted ? "text-green-500" : "text-stone-300"}`}>
                                                        {stats.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-stone-800 mb-1">{lesson.title}</h4>
                                                        <div className="flex items-center gap-3 text-xs text-stone-500">
                                                            {hasQuiz ? (
                                                                <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                                                                    <FileQuestion size={12} /> {stats.totalQuestions} Câu hỏi
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-stone-400 bg-stone-100 px-2 py-0.5 rounded font-medium">
                                                                    <PlayCircle size={12} /> Bài giảng video
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress Result */}
                                                {hasQuiz && (
                                                    <div className="flex bg-stone-100 rounded-lg p-3 min-w-[140px] justify-between items-center sm:flex-col sm:items-end md:flex-row md:items-center">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Điểm số</span>
                                                            <span className={`font-bold text-lg ${stats.correctCount === stats.totalQuestions ? "text-green-600" : "text-stone-700"
                                                                }`}>
                                                                {stats.correctCount}/{stats.totalQuestions}
                                                            </span>
                                                        </div>

                                                        <div className="h-8 w-[1px] bg-stone-200 hidden md:block mx-3"></div>

                                                        <div className="text-right">
                                                            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Trạng thái</span>
                                                            {stats.isCompleted ? (
                                                                <span className="text-xs font-bold text-green-600">Đã làm xong</span>
                                                            ) : stats.submittedCount > 0 ? (
                                                                <span className="text-xs font-bold text-amber-600">Đang học</span>
                                                            ) : (
                                                                <span className="text-xs font-bold text-stone-400">Chưa làm</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {!hasQuiz && (
                                                    <div className="text-xs text-stone-400 italic">
                                                        (Không có bài tập)
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
