import { prisma } from "@/lib/prisma";
import CoursesClient from "@/app/components/client/CoursesClient";

export default async function CoursesPage() {
    const courses = await prisma.course.findMany({
        where: { status: "PUBLISHED" },
        include: {
            instructor: true,
            organization: true,
            _count: { select: { chapters: true } }
        },
        orderBy: { createdAt: "desc" },
    });

    const serializedCourses = courses.map(course => ({
        ...course,
        price: Number(course.price)
    }));

    return (
        <CoursesClient courses={serializedCourses} />
    );
}