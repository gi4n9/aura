import { getCachedFeaturedCourses } from "@/lib/cache";
import FeaturedCoursesClient from "./FeaturedCoursesClient";

export default async function FeaturedCourses() {
    // Sử dụng cached query cho performance
    const rawCourses = await getCachedFeaturedCourses(4);

    // Chuyển đổi Prisma Decimal/Date thành plain objects để truyền qua Client Component
    const courses = rawCourses.map((course) => ({
        ...course,
        price: Number(course.price),
        createdAt: course.createdAt ? new Date(course.createdAt).toISOString() : null,
        updatedAt: course.updatedAt ? new Date(course.updatedAt).toISOString() : null,
    }));

    return <FeaturedCoursesClient courses={courses as any} />;
}