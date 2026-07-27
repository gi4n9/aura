"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

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

export async function getOrganizations() {
  try {
    await requireAdmin();

    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            members: true,
            courses: true,
          },
        },
        members: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
          take: 5,
        },
        courses: {
          select: { id: true, title: true, status: true, thumbnailUrl: true },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: organizations };
  } catch (error: any) {
    console.error("getOrganizations error:", error);
    return { success: false, error: error?.message || "Không thể tải danh sách Tổ chức" };
  }
}

export async function createOrganization(data: { name: string; description?: string; logoUrl?: string }) {
  try {
    await requireAdmin();

    if (!data.name.trim()) {
      return { success: false, error: "Tên tổ chức không được để trống" };
    }

    const org = await prisma.organization.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        logoUrl: data.logoUrl?.trim() || null,
      },
    });

    revalidatePath("/admin/organizations");
    return { success: true, data: org };
  } catch (error: any) {
    console.error("createOrganization error:", error);
    return { success: false, error: error?.message || "Không thể tạo Tổ chức" };
  }
}

export async function updateOrganization(id: string, data: { name?: string; description?: string; logoUrl?: string }) {
  try {
    await requireAdmin();

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl.trim() || null : undefined,
      },
    });

    revalidatePath("/admin/organizations");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updateOrganization error:", error);
    return { success: false, error: error?.message || "Không thể cập nhật Tổ chức" };
  }
}

export async function deleteOrganization(id: string) {
  try {
    await requireAdmin();

    // Gỡ liên kết members & courses trước khi xóa
    await prisma.$transaction([
      prisma.profile.updateMany({
        where: { organizationId: id },
        data: { organizationId: null },
      }),
      prisma.course.updateMany({
        where: { organizationId: id },
        data: { organizationId: null },
      }),
      prisma.organization.delete({
        where: { id },
      }),
    ]);

    revalidatePath("/admin/organizations");
    return { success: true, message: "Đã xóa Tổ chức thành công" };
  } catch (error: any) {
    console.error("deleteOrganization error:", error);
    return { success: false, error: error?.message || "Không thể xóa Tổ chức" };
  }
}

export async function assignUserToOrganization(userId: string, organizationId: string | null) {
  try {
    await requireAdmin();

    await prisma.profile.update({
      where: { id: userId },
      data: { organizationId },
    });

    revalidatePath("/admin/organizations");
    return { success: true, message: "Đã cập nhật tổ chức cho người dùng" };
  } catch (error: any) {
    console.error("assignUserToOrganization error:", error);
    return { success: false, error: error?.message || "Lỗi gán người dùng vào tổ chức" };
  }
}

export async function assignCourseToOrganization(courseId: string, organizationId: string | null) {
  try {
    await requireAdmin();

    await prisma.course.update({
      where: { id: courseId },
      data: { organizationId },
    });

    revalidatePath("/admin/organizations");
    return { success: true, message: "Đã cập nhật tổ chức cho khóa học" };
  } catch (error: any) {
    console.error("assignCourseToOrganization error:", error);
    return { success: false, error: error?.message || "Lỗi gán khóa học vào tổ chức" };
  }
}

export async function getCandidatesForOrganization() {
  try {
    await requireAdmin();

    const users = await prisma.profile.findMany({
      select: { id: true, fullName: true, email: true, organizationId: true },
      take: 100,
    });

    const courses = await prisma.course.findMany({
      select: { id: true, title: true, organizationId: true },
      take: 100,
    });

    return { success: true, data: { users, courses } };
  } catch (error: any) {
    return { success: false, error: error?.message || "Không thể lấy danh sách ứng viên" };
  }
}
