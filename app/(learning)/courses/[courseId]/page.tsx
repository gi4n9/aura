import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock, Users, PlayCircle, CheckCircle2 } from "lucide-react";
import CourseDescription from "@/app/components/courseComponents/CourseDescription";
import CourseActionButtons from "@/app/components/courseComponents/CourseActionButtons";
import CourseSyllabusList from "@/app/components/courseComponents/CourseSyllabusList";
import { createClient } from "@/utils/supabase/server";

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
    let totalCourseDurationSeconds = 0; // NEW: Total duration

    const lessonCompletionMap = new Map<string, boolean>(); // lessonId -> isCompleted
    const chapterProgressMap = new Map<string, number>(); // chapterId -> % completed

    // Calculate total duration from all lessons
    course.chapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
            if (lesson.duration) {
                totalCourseDurationSeconds += lesson.duration;
            }
        });
    });

    // Maps for UI rendering
    const videoProgressMap = new Map<string, number>(); // lessonId -> percentage
    const quizPassMap = new Map<string, boolean>(); // lessonId -> isPassed

    if (user) {
        const enroll = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId: course.id } }
        });

        if (enroll) {
            isEnrolled = true;
            progressPercent = enroll.progress; // Use stored progress

            // Fetch Video Progress
            const vpRecords = await prisma.videoProgress.findMany({
                where: { userId: user.id, lesson: { chapter: { courseId: course.id } } },
                select: { lessonId: true, percentage: true }
            });
            vpRecords.forEach(vp => videoProgressMap.set(vp.lessonId, vp.percentage));

            // Fetch Quiz Results
            const qrRecords = await prisma.quizResult.findMany({
                where: { userId: user.id, courseId: course.id },
                select: { lessonId: true, isPassed: true }
            });
            qrRecords.forEach(qr => quizPassMap.set(qr.lessonId, qr.isPassed));

            // Legacy Check for Lesson Completion & Chapter Progress
            // We consider a lesson 'completed' if Video >= 90% AND Quiz is Passed (if exists)
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

    return (
        <div className="min-h-screen bg-[#F9F8F4] text-stone-900 pb-20">

            {/* Hero Section */}
            <div className="bg-white border-b border-stone-200 pb-24 pt-20">
                {/* ... (Hero content same as before) ... */}
                <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    <div className="lg:col-span-7">
                        {/* Title & Desc */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold tracking-widest uppercase rounded-full mb-6 border border-stone-200">
                            {course.organization?.name || "Professional Course"}
                        </div>
                        <h1 className="font-serif text-4xl md:text-6xl text-stone-900 mb-6 leading-tight">
                            {course.title}
                        </h1>
                        <CourseDescription description={course.description || "Khóa học chuyên sâu giúp bạn làm chủ kiến thức từ cơ bản đến nâng cao."} />

                        {/* Author Metadata */}
                        <div className="flex items-center gap-6 pt-6 border-t border-stone-100">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-stone-200">
                                    <Image
                                        src={course.instructor?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                        alt="Instructor" fill className="object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Instructor</div>
                                    <div className="font-serif text-base font-medium">{course.instructor?.fullName}</div>
                                </div>
                            </div>
                            {/* ... Ratings ... */}
                        </div>
                    </div>

                    {/* Right Card */}
                    <div className="lg:col-span-5 sticky top-24">
                        <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-xl">
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-stone-900 mb-4 group cursor-pointer">
                                <Image
                                    src={course.thumbnailUrl || "/placeholder-course.jpg"}
                                    alt="Thumbnail" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                                />
                                {firstLesson && (
                                    <Link
                                        href={`/courses/${course.id}/lessons/${firstLesson.id}`}
                                        className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-[#C5A059] rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                            <PlayCircle size={32} className="text-white fill-white" />
                                        </div>
                                    </Link>
                                )}
                            </div>

                            <div className="px-4 pb-4">
                                {isEnrolled ? (
                                    <div className="text-center py-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-stone-500 font-bold text-xs uppercase flex items-center gap-1">
                                                <Clock size={14} />
                                                {totalCourseDurationSeconds > 0 ? Math.floor(totalCourseDurationSeconds / 60) + " phút" : "N/A"}
                                            </span>
                                            <span className="text-stone-800 font-bold text-sm">Đã học {progressPercent}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden mb-6">
                                            <div
                                                className="h-full bg-[#C5A059]"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>

                                        {firstLesson ? (
                                            <Link
                                                href={`/courses/${course.id}/lessons/${firstLesson.id}`}
                                                className="block w-full py-4 bg-[#1a1a1a] text-white text-center font-bold tracking-widest uppercase text-sm rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg"
                                            >
                                                Tiếp tục học
                                            </Link>
                                        ) : null}
                                    </div>
                                ) : (
                                    <CourseActionButtons
                                        courseId={course.id}
                                        price={Number(course.price)}
                                        isFree={!!course.isFree}
                                        firstLessonId={firstLesson?.id}
                                    />
                                )}
                                <p className="text-center text-xs text-stone-400 mt-3 font-serif italic">
                                    Truy cập trọn đời • Hoàn tiền trong 30 ngày
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Syllabus */}
            <div className="container mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8">
                    <div className="mb-8 flex items-end gap-4">
                        <h2 className="font-serif text-3xl text-stone-900">Nội dung khóa học</h2>
                        <div className="flex-1 h-[1px] bg-stone-200 mb-2"></div>
                    </div>

                    <CourseSyllabusList
                        courseId={course.id}
                        chapters={course.chapters as any}
                        lessonCompletionMap={lessonCompletionObj}
                        videoProgressMap={videoProgressObj}
                        quizPassMap={quizPassObj}
                        isEnrolled={isEnrolled}
                    />
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-6 rounded-xl border border-stone-200">
                        <h3 className="font-serif text-lg font-bold mb-4">Khóa học này bao gồm:</h3>
                        <ul className="space-y-4 text-sm text-stone-600">
                            <li className="flex items-center gap-3">
                                <Clock size={18} className="text-[#C5A059]" />
                                <span>Thời lượng {totalCourseDurationSeconds > 0 ? Math.floor(totalCourseDurationSeconds / 60) + " phút" : "N/A"}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <BookOpen size={18} className="text-[#C5A059]" />
                                <span>{course.chapters.length} chương chuyên sâu</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <PlayCircle size={18} className="text-[#C5A059]" />
                                <span>Video chất lượng Full HD</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle2 size={18} className="text-[#C5A059]" />
                                <span>Truy cập trên Mobile và TV</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Users size={18} className="text-[#C5A059]" />
                                <span>Cộng đồng học tập riêng</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}