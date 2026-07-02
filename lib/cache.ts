import { db } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// === CACHED QUERIES ===

// Cache user profile cho mỗi user
export const getCachedProfile = unstable_cache(
  async (userId: string) => {
    return await db.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        interests: true,
      },
    });
  },
  ["user-profile"],
  {
    revalidate: 300, // 5 phút
    tags: ["profiles"],
  }
);

// Cache categories cho homepage
export const getCachedCategories = unstable_cache(
  async () => {
    return await db.category.findMany({
      where: { parentId: null },
      include: {
        children: true,
        _count: { select: { courses: true } },
      },
      orderBy: { name: "asc" },
    });
  },
  ["categories"],
  {
    revalidate: 3600, // 1 giờ
    tags: ["categories"],
  }
);

// Cache featured courses cho homepage
export const getCachedFeaturedCourses = unstable_cache(
  async (limit: number = 8) => {
    return await db.course.findMany({
      where: { status: "PUBLISHED" },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        instructor: {
          select: { fullName: true, avatarUrl: true },
        },
        organization: {
          select: { name: true },
        },
        category: {
          select: { name: true, slug: true },
        },
        _count: {
          select: { chapters: true },
        },
      },
    });
  },
  ["featured-courses"],
  {
    revalidate: 1800, // 30 phút
    tags: ["courses"],
  }
);

// Cache study plan - revalidate thường xuyên hơn vì có thể thay đổi
export const getCachedStudyPlan = unstable_cache(
  async (userId: string) => {
    return await db.studySchedule.findFirst({
      where: { userId, isActive: true },
      include: {
        items: {
          orderBy: { scheduledAt: "asc" },
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                duration: true,
                _count: {
                  select: { questions: true }
                },
                chapter: {
                  select: {
                    id: true,
                    course: {
                      select: {
                        id: true,
                        title: true,
                        category: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });
  },
  ["study-plan"],
  {
    revalidate: 60, // 1 phút - cần fresh data
    tags: ["study-plans"],
  }
);
