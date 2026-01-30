import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
    ArrowLeft,
    Video,
    FileQuestion,
    MoreVertical,
    PlusCircle,
    GripVertical
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function ChapterPage({
    params,
}: {
    params: Promise<{ courseId: string; chapterId: string }>;
}) {
    const { courseId, chapterId } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirect("/");

    const chapter = await prisma.chapter.findUnique({
        where: {
            id: chapterId,
            courseId: courseId,
        },
        include: {
            lessons: {
                orderBy: {
                    position: "asc",
                },
                include: {
                    _count: {
                        select: { questions: { where: { isArchived: false } } }
                    }
                }
            },
        },
    });

    if (!chapter) return redirect(`/instructor/courses/${courseId}/settings`);

    return (
        <div className="p-6 max-w-5xl mx-auto bg-[#F9F8F4] min-h-screen">
            <div className="mb-8">
                <Link
                    href={`/instructor/courses/${courseId}/settings`}
                    className="flex items-center text-sm text-stone-500 hover:text-stone-800 transition mb-4"
                >
                    <ArrowLeft size={16} className="mr-2" /> Quay lại Cài đặt khóa học
                </Link>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-serif font-bold text-stone-800">
                            {chapter.title}
                        </h1>
                        <p className="text-stone-500 text-sm mt-1">
                            Quản lý các bài học trong chương này
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition shadow-sm">
                        <PlusCircle size={18} /> Thêm bài học mới
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {chapter.lessons.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-stone-300">
                        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
                            <Video size={24} />
                        </div>
                        <p className="text-stone-500">Chưa có bài học nào trong chương này.</p>
                    </div>
                ) : (
                    chapter.lessons.map((lesson) => (
                        <Link
                            key={lesson.id}
                            href={`/instructor/courses/${courseId}/chapters/${chapterId}/lesson/${lesson.id}`}
                            className="group block"
                        >
                            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:border-[#C5A059] hover:shadow-md transition flex items-center gap-4">
                                <div className="cursor-grab text-stone-400 hover:text-stone-600">
                                    <GripVertical size={20} />
                                </div>

                                <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 group-hover:bg-[#C5A059]/10 group-hover:text-[#C5A059] transition">
                                    <Video size={24} />
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-bold text-stone-800 group-hover:text-[#C5A059] transition">
                                        {lesson.title}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                                        <span className={`flex items-center gap-1 ${lesson.youtubeVideoId ? "text-green-600" : ""}`}>
                                            {lesson.youtubeVideoId ? "● Đã có Video" : "○ Chưa có Video"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <FileQuestion size={12} /> {lesson._count.questions} câu hỏi
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2 text-stone-400 hover:text-stone-800">
                                    <MoreVertical size={20} />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
