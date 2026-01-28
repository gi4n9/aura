import { db } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// Cache course structure (heavy query) for 1 hour or until invalidated
export const getCachedCourse = unstable_cache(
  async (courseId: string) => {
    return await db.course.findUnique({
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
  },
  ["course-data"], // Cache Key prefix
  { 
    revalidate: 3600, // 1 Hour
    tags: ["courses"] 
  }
);
