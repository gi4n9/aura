"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { prisma } from "@/lib/prisma";
import { UserRole, CourseStatus } from "@prisma/client";

// ============================================================
// GUARD: Chỉ Admin mới được gọi các actions này
// ============================================================
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== "ADMIN") {
    throw new Error("Forbidden: Admin only");
  }

  return user;
}

// ============================================================
// 1. STATS - Thống kê tổng quan
// ============================================================
export async function getAdminStats() {
  try {
    await requireAdmin();

    const [totalUsers, totalCourses, totalEnrollments, totalRevenue, recentUsers] = await Promise.all([
      prisma.profile.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED" },
      }),
      // Users mới 6 tháng gần nhất (theo tháng)
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'MM/YYYY') as month,
          COUNT(*)::bigint as count
        FROM "Profile"
        WHERE "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,
    ]);

    // Role distribution
    const roleDistribution = await prisma.profile.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    // Course status distribution
    const courseStatusDist = await prisma.course.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    return {
      success: true,
      data: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        usersByMonth: recentUsers.map((r) => ({
          month: r.month,
          count: Number(r.count),
        })),
        roleDistribution: roleDistribution.map((r) => ({
          role: r.role,
          count: r._count.role,
        })),
        courseStatusDist: courseStatusDist.map((r) => ({
          status: r.status,
          count: r._count.status,
        })),
      },
    };
  } catch (error) {
    console.error("getAdminStats error:", error);
    return { success: false, error: "Không thể tải thống kê" };
  }
}

// ============================================================
// 2. USER MANAGEMENT
// ============================================================

export async function getAllUsers(params?: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}) {
  try {
    await requireAdmin();

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params?.role && params.role !== "ALL") {
      where.role = params.role as UserRole;
    }

    const [users, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              submissions: true,
              coursesCreated: true,
            },
          },
        },
      }),
      prisma.profile.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("getAllUsers error:", error);
    return { success: false, error: "Không thể tải danh sách users" };
  }
}

export async function getUserDetail(userId: string) {
  try {
    await requireAdmin();

    const user = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: { course: { select: { id: true, title: true, thumbnailUrl: true } } },
          orderBy: { joinedAt: "desc" },
          take: 10,
        },
        submissions: {
          include: {
            question: { select: { content: true, type: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        coursesCreated: {
          select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } },
        },
        quizResults: {
          orderBy: { lastAttemptAt: "desc" },
          take: 10,
        },
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error("getUserDetail error:", error);
    return { success: false, error: "Không thể tải chi tiết user" };
  }
}

export async function updateUserRole(userId: string, newRole: UserRole) {
  try {
    await requireAdmin();

    const updatedUser = await prisma.profile.update({
      where: { id: userId },
      data: { role: newRole },
      select: { id: true, email: true, role: true, fullName: true },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/users");

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("updateUserRole error:", error);
    return { success: false, error: "Không thể cập nhật role" };
  }
}

export async function deleteUser(userId: string) {
  try {
    const admin = await requireAdmin();

    // Không cho xóa chính mình
    if (admin.id === userId) {
      return { success: false, error: "Không thể tự xóa tài khoản của mình" };
    }

    // Xóa tất cả dữ liệu liên quan đến User trong transaction để tránh lỗi Foreign Key Constraint (P2003)
    await prisma.$transaction(async (tx) => {
      await tx.enrollment.deleteMany({ where: { userId } });
      await tx.submission.deleteMany({ where: { userId } });
      await tx.studyPlanItem.deleteMany({ where: { userId } });
      await tx.studySchedule.deleteMany({ where: { userId } });
      await tx.userRoadmap.deleteMany({ where: { userId } });
      await tx.chatSession.deleteMany({ where: { userId } });
      await tx.videoProgress.deleteMany({ where: { userId } });
      await tx.quizResult.deleteMany({ where: { userId } });
      await tx.directMessage.deleteMany({ where: { senderId: userId } });
      await tx.conversationParticipant.deleteMany({ where: { userId } });
      await tx.userStats.deleteMany({ where: { userId } });
      await tx.groupQuestion.deleteMany({ where: { authorId: userId } });
      await tx.groupInvitation.deleteMany({
        where: { OR: [{ inviterId: userId }, { inviteeId: userId }] }
      });
      await tx.purchase.deleteMany({ where: { userId } });

      // Nếu user là Giảng viên có khóa học, chuyển quyền sở hữu khóa học về cho Admin để không mất dữ liệu khóa học
      const userCourses = await tx.course.findMany({ where: { instructorId: userId } });
      if (userCourses.length > 0) {
        await tx.course.updateMany({
          where: { instructorId: userId },
          data: { instructorId: admin.id }
        });
      }

      // Cuối cùng xóa Profile
      await tx.profile.delete({ where: { id: userId } });
    });

    // Xóa user khỏi Supabase Authentication (auth.users)
    try {
      const supabaseAdmin = await createAdminClient();
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.warn("Lỗi xóa user ở Supabase Auth (auth.users):", authDeleteError.message);
      }
    } catch (authErr) {
      console.warn("Không thể kết nối Supabase Admin để xóa auth.users:", authErr);
    }

    revalidatePath("/admin/users");

    return { success: true, message: "Đã xóa người dùng thành công" };
  } catch (error: any) {
    console.error("deleteUser error:", error);
    return { success: false, error: error?.message || "Không thể xóa người dùng" };
  }
}

// ============================================================
// 3. COURSE MANAGEMENT (Admin Override)
// ============================================================

export async function getAllCoursesAdmin(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    await requireAdmin();

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.search) {
      where.title = { contains: params.search, mode: "insensitive" };
    }
    if (params?.status && params.status !== "ALL") {
      where.status = params.status as CourseStatus;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          instructor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, chapters: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      success: true,
      data: courses.map((c) => ({ ...c, price: Number(c.price) })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("getAllCoursesAdmin error:", error);
    return { success: false, error: "Không thể tải danh sách khóa học" };
  }
}

export async function adminUpdateCourseStatus(courseId: string, status: CourseStatus) {
  try {
    await requireAdmin();

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { status },
    });

    revalidatePath("/admin/courses");

    return { success: true, data: { ...course, price: Number(course.price) } };
  } catch (error) {
    console.error("adminUpdateCourseStatus error:", error);
    return { success: false, error: "Không thể cập nhật trạng thái khóa học" };
  }
}

// ============================================================
// 4. CATEGORY MANAGEMENT
// ============================================================

export async function getCategoriesAdmin() {
  try {
    await requireAdmin();

    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { courses: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error("getCategoriesAdmin error:", error);
    return { success: false, error: "Không thể tải danh mục" };
  }
}

export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
}) {
  try {
    await requireAdmin();

    // Validate slug uniqueness
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return { success: false, error: "Slug này đã tồn tại" };
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        parentId: data.parentId || null,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/");

    return { success: true, data: category };
  } catch (error) {
    console.error("createCategory error:", error);
    return { success: false, error: "Không thể tạo danh mục" };
  }
}

export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    parentId?: string | null;
  }
) {
  try {
    await requireAdmin();

    // Check slug conflict
    if (data.slug) {
      const existing = await prisma.category.findFirst({
        where: { slug: data.slug, NOT: { id: categoryId } },
      });
      if (existing) {
        return { success: false, error: "Slug này đã tồn tại" };
      }
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/");

    return { success: true, data: category };
  } catch (error) {
    console.error("updateCategory error:", error);
    return { success: false, error: "Không thể cập nhật danh mục" };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    await requireAdmin();

    // Check if category has courses
    const coursesCount = await prisma.course.count({ where: { categoryId } });
    if (coursesCount > 0) {
      return {
        success: false,
        error: `Không thể xóa: danh mục này đang có ${coursesCount} khóa học. Hãy chuyển các khóa học sang danh mục khác trước.`,
      };
    }

    await prisma.category.delete({ where: { id: categoryId } });

    revalidatePath("/admin/categories");
    revalidatePath("/");

    return { success: true, message: "Đã xóa danh mục thành công" };
  } catch (error) {
    console.error("deleteCategory error:", error);
    return { success: false, error: "Không thể xóa danh mục" };
  }
}
