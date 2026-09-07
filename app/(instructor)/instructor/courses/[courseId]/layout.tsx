import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";


export default async function CourseLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;

    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            chapters: {
                orderBy: { position: "asc" },
                include: {
                    lessons: {
                        orderBy: { position: "asc" },
                    },
                },
            },
        },
    });

    if (!course) {
        return redirect("/instructor/courses");
    }

    const serializedCourse = {
        ...course,
        price: course.price ? course.price.toNumber() : null,
    };

    return (
        <div className="h-full">
            <main className="h-full bg-[#F9F8F4]">
                {children}
            </main>
        </div>
    );
}