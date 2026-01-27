import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InstructorSidebar from "@/app/components/InstructorSidebar";


export default async function CourseLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ courseId: string }>;
}) {
    const { courseId } = await params;

    // Fetch dữ liệu cây thư mục
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
        price: course.price ? course.price.toNumber() : null, // Chuyển Decimal -> Number
    };

    return (
        <div className="h-full">
            {/* SIDEBAR CỐ ĐỊNH (Cột 2)
         - width: 80 (320px)
         - left: 64 (256px) -> ĐỂ TRÁNH DashboardSidebar (Cột 1)
      */}
            <div className="hidden md:flex h-full w-80 flex-col fixed inset-y-0 left-64 z-40 border-r border-stone-200 bg-white">
                <InstructorSidebar course={serializedCourse} />
            </div>

            {/* NỘI DUNG CHÍNH (Cột 3)
         - padding-left: 80 (320px) -> Để tránh InstructorSidebar
      */}
            <main className="md:pl-80 h-full bg-[#FAFAFA]">
                {children}
            </main>
        </div>
    );
}