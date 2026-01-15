import CourseSidebar from "@/app/components/CourseSidebar";
import VideoPlayer from "@/app/components/VideoPlayer";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

interface LessonIdPageProps {
    params: Promise<{
        courseId: string;
        lessonId: string;
    }>;
}

export default async function LessonIdPage({ params }: LessonIdPageProps) {
    const { courseId, lessonId } = await params;

    // 1. Fetch Course & Chapters & Lessons (Để render Sidebar)
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

    // 2. Fetch Lesson hiện tại
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
    });

    if (!lesson) return redirect(`/courses/${courseId}`);

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-[#F9F8F4] overflow-hidden pt-80px">

            {/* MAIN CONTENT (Video + Description) */}
            <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col pt-4 lg:pt-0">
                <div className="flex-1 p-6 lg:p-10 flex flex-col overflow-y-auto custom-scrollbar">

                    {/* Back Button Mobile Only */}
                    <div className="lg:hidden mb-4">
                        <a href={`/courses/${courseId}`} className="text-sm font-bold text-stone-500 hover:text-[#C5A059]">
                            ← Back to Course
                        </a>
                    </div>

                    <div className="max-w-5xl mx-auto w-full">
                        <VideoPlayer
                            videoId={lesson.youtubeVideoId || ""}
                            title={lesson.title}
                            description={lesson.transcript || ""}
                        />

                        {/* Lesson Info */}
                        <div className="mt-8 pb-20">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="font-serif text-2xl md:text-3xl text-stone-900 leading-tight">
                                    {lesson.title}
                                </h1>
                            </div>
                            <div className="w-16 h-1 bg-[#C5A059] mb-6"></div>

                            {/* Transcript / Content Area */}
                            <div className="prose prose-stone max-w-none">
                                <h3 className="font-serif text-lg mb-2 text-stone-800">Transcript & Notes</h3>
                                <div className="p-6 bg-white border border-stone-200 rounded-xl text-stone-600 leading-relaxed shadow-sm text-sm">
                                    {lesson.transcript ? (
                                        <p className="whitespace-pre-line">{lesson.transcript}</p>
                                    ) : (
                                        <p className="italic text-stone-400">No transcript available for this lesson.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SIDEBAR - Fix props ở đây */}
            <div className="w-full lg:w-96 flex-shrink-0 h-auto lg:h-full border-t lg:border-t-0 bg-white z-10 lg:border-l border-stone-200">
                <CourseSidebar
                    courseId={course.id}          // Truyền ID riêng
                    chapters={course.chapters}    // Truyền danh sách chương
                    currentVideoId={lesson.youtubeVideoId || ""} // Truyền ID video để highlight
                />
            </div>

        </div>
    );
}