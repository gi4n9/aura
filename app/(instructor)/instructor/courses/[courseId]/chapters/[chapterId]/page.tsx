import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import ChapterLessonsManager from "@/app/components/courseComponents/ChapterLessonsManager";

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
        <ChapterLessonsManager
            courseId={courseId}
            chapterId={chapterId}
            chapterTitle={chapter.title}
            initialLessons={chapter.lessons}
        />
    );
}
