import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import {
    LayoutDashboard,
    ListChecks,
    CircleDollarSign,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { TitleForm } from "@/app/components/courseComponents/TitleForm";
import { DescriptionForm } from "@/app/components/courseComponents/DescriptionForm";
import { PriceForm } from "@/app/components/courseComponents/PriceForm";
import { CourseActions } from "@/app/components/courseComponents/CourseActions";
import { ImageForm } from "@/app/components/courseComponents/ImageForm";
import { ChaptersForm } from "@/app/components/courseComponents/ChaptersForm";

const IconBadge = ({ icon: Icon }: { icon: any }) => (
    <div className="p-2 bg-stone-100 rounded-lg">
        <Icon className="h-6 w-6 text-[#C5A059]" />
    </div>
);

export default async function CourseEditPage({
    params,
}: {
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;
    const supabase = await createClient();

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    // 2. Get Data
    const course = await prisma.course.findUnique({
        where: {
            id: courseId,
            instructorId: user.id
        },
        include: {
            chapters: { orderBy: { position: "asc" } },
        },
    });

    if (!course) return redirect("/instructor");

    const plainCourse = {
        ...course,
        price: course.price ? Number(course.price) : 0,
    };

    const hasPublishedChapter = course.chapters.some(chapter => chapter.status === "PUBLISHED");

    // 3. Validation Logic
    const requiredFields = [
        plainCourse.title,
        plainCourse.description,
        plainCourse.thumbnailUrl,
        plainCourse.price !== undefined,
        hasPublishedChapter,
    ];

    const totalFields = requiredFields.length;
    const completedFields = requiredFields.filter(Boolean).length;
    const completionText = `(${completedFields}/${totalFields})`;
    const isComplete = requiredFields.every(Boolean);



    return (
        <div className="p-6 max-w-7xl mx-auto bg-[#F9F8F4] min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col gap-2">
                    <Link href="/instructor" className="flex items-center text-sm text-stone-500 hover:text-stone-800 transition mb-2">
                        <ArrowLeft size={16} className="mr-2" /> Quay lại Dashboard
                    </Link>
                    <h1 className="text-3xl font-serif font-bold text-stone-800">
                        Thiết lập khóa học
                    </h1>
                    <span className="text-sm text-stone-500">
                        Hoàn thành tất cả các mục {completionText}
                    </span>
                </div>
                <CourseActions
                    disabled={!isComplete}
                    courseId={course.id}
                    isPublished={course.status === "PUBLISHED"}
                />
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* --- CỘT TRÁI --- */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <IconBadge icon={LayoutDashboard} />
                            <h2 className="text-xl font-bold text-stone-800">Thông tin cơ bản</h2>
                        </div>

                        <TitleForm initialData={plainCourse} courseId={course.id} />

                        <DescriptionForm initialData={plainCourse} courseId={course.id} />

                        <ImageForm initialData={plainCourse} courseId={course.id} />
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <IconBadge icon={CircleDollarSign} />
                            <h2 className="text-xl font-bold text-stone-800">Giá khóa học</h2>
                        </div>

                        <PriceForm initialData={plainCourse} courseId={course.id} />
                    </div>
                </div>

                {/* --- CỘT PHẢI --- */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <IconBadge icon={ListChecks} />
                                <h2 className="text-xl font-bold text-stone-800">Nội dung khóa học</h2>
                            </div>

                            <ChaptersForm initialData={plainCourse} courseId={course.id} />
                        </div>
                    </div>
                </div>
            </div>
            <div>

            </div>
        </div>
    );
}