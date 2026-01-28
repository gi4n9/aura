import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock, CheckCircle2, PlayCircle, Star, Users, Circle, CalendarRange } from "lucide-react";
import CourseDescription from "@/app/components/courseComponents/CourseDescription";
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

    // 2. Calculate Progress
    let isEnrolled = false;
    let progressPercent = 0;
    const lessonCompletionMap = new Map<string, boolean>(); // lessonId -> isCompleted
    const chapterProgressMap = new Map<string, number>(); // chapterId -> % completed

    if (user) {
        const enroll = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId: course.id } }
        });

        if (enroll) {
            isEnrolled = true;
            progressPercent = enroll.progress; // Use stored progress

            // Get all user submissions for this course
            const userSubmissions = await prisma.submission.findMany({
                where: {
                    userId: user.id,
                    question: { lesson: { chapter: { courseId: course.id } } }
                },
                select: {
                    questionId: true,
                    question: { select: { lessonId: true } }
                },
                distinct: ['questionId']
            });

            // Map: LessonID -> Count of User Answered Questions
            const lessonAnsweredCount = new Map<string, number>();
            userSubmissions.forEach(sub => {
                const lid = sub.question.lessonId;
                lessonAnsweredCount.set(lid, (lessonAnsweredCount.get(lid) || 0) + 1);
            });

            // Determine Lesson Completion & Chapter Progress (Question-based)
            course.chapters.forEach(chapter => {
                let totalQuestionsInChapter = 0;
                let answeredQuestionsInChapter = 0;

                chapter.lessons.forEach(lesson => {
                    const totalQ = lesson._count.questions;
                    totalQuestionsInChapter += totalQ;

                    const answered = lessonAnsweredCount.get(lesson.id) || 0;
                    answeredQuestionsInChapter += answered;

                    if (totalQ > 0 && answered >= totalQ) {
                        lessonCompletionMap.set(lesson.id, true);
                    }
                });

                const chapProg = totalQuestionsInChapter > 0
                    ? Math.round((answeredQuestionsInChapter / totalQuestionsInChapter) * 100)
                    : 0;
                chapterProgressMap.set(chapter.id, chapProg);
            });

            // Keep distinct question-based progressPercent calculated above.
        }
    }

    const firstLesson = course.chapters[0]?.lessons[0];

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
                                            <span className="text-stone-500 font-bold text-xs uppercase">Tiến độ khóa học</span>
                                            <span className="text-stone-800 font-bold text-sm">{progressPercent}%</span>
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
                                    <>
                                        <div className="text-3xl font-serif text-stone-900 mb-2 text-center">
                                            {Number(course.price) === 0 ? "Miễn phí" : new Intl.NumberFormat("vi-VN").format(Number(course.price)) + " đ"}
                                        </div>
                                        {/* Enroll Button */}
                                        <Link
                                            href={firstLesson ? `/courses/${course.id}/lessons/${firstLesson.id}` : '#'}
                                            className={`block w-full py-4 bg-[#1a1a1a] text-white text-center font-bold tracking-widest uppercase text-sm rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg ${!firstLesson && "opacity-50 cursor-not-allowed"}`}
                                        >
                                            {firstLesson ? "Vào học ngay" : "Chưa có bài học"}
                                        </Link>
                                    </>
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

                    <div className="space-y-6">
                        {course.chapters.map((chapter) => {
                            const chapterProgress = chapterProgressMap.get(chapter.id) || 0;

                            return (
                                <div key={chapter.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 bg-[#F9F8F4] border-b border-stone-200 flex justify-between items-center">
                                        <h3 className="font-serif text-lg font-bold text-stone-800">{chapter.title}</h3>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-bold tracking-widest text-stone-500 uppercase">
                                                {chapter.lessons.length} Bài
                                            </span>
                                            {isEnrolled && (
                                                <div className="w-20 h-1 bg-stone-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 transition-all duration-500"
                                                        style={{ width: `${chapterProgress}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="divide-y divide-stone-100">
                                        {chapter.lessons.map((lesson) => {
                                            const isCompleted = lessonCompletionMap.get(lesson.id);

                                            return (
                                                <Link
                                                    key={lesson.id}
                                                    href={`/courses/${course.id}/lessons/${lesson.id}`}
                                                    className="px-6 py-4 flex items-center justify-between group hover:bg-stone-50 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${isCompleted
                                                            ? "bg-green-100 text-green-600 border-green-200"
                                                            : "bg-stone-100 text-[#C5A059] border-stone-200 group-hover:border-[#C5A059]"
                                                            }`}>
                                                            {isCompleted ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
                                                        </div>
                                                        <span className={`font-medium transition-colors ${isCompleted ? "text-stone-400 line-through decoration-stone-300" : "text-stone-600 group-hover:text-stone-900"}`}>
                                                            {lesson.title}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {lesson.duration ? Math.floor(lesson.duration / 60) + "p" : "--"}
                                                        </span>
                                                        <span className="text-xs font-bold text-[#C5A059] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                                            {isCompleted ? "Ôn tập" : "Học ngay"}
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white p-6 rounded-xl border border-stone-200">
                        <h3 className="font-serif text-lg font-bold mb-4">Khóa học này bao gồm:</h3>
                        <ul className="space-y-4 text-sm text-stone-600">
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