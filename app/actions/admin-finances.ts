"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { PurchaseStatus } from "@prisma/client";

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

export async function getFinancialOverview(params?: {
  status?: string;
  provider?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    await requireAdmin();

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params?.status && params.status !== "ALL") {
      where.status = params.status as PurchaseStatus;
    }

    if (params?.provider && params.provider !== "ALL") {
      where.provider = params.provider;
    }

    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { transactionId: { contains: q, mode: "insensitive" } },
        { user: { fullName: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { course: { title: { contains: q, mode: "insensitive" } } },
      ];
    }

    // 1. Total revenue & stats
    const [totalCompletedVnd, totalCompletedUsd, totalCount, purchases] = await Promise.all([
      prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", currency: "VND" },
      }),
      prisma.purchase.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", currency: "USD" },
      }),
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          course: { select: { id: true, title: true, thumbnailUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Status breakdown count
    const statusCounts = await prisma.purchase.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusMap = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        totalRevenueVnd: Number(totalCompletedVnd._sum.amount || 0),
        totalRevenueUsd: Number(totalCompletedUsd._sum.amount || 0),
        totalCount,
        statusMap,
        purchases: purchases.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
        page,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error: any) {
    console.error("getFinancialOverview error:", error);
    return { success: false, error: error?.message || "Không thể tải dữ liệu tài chính" };
  }
}

export async function updatePurchaseStatus(purchaseId: string, newStatus: PurchaseStatus, notes?: string) {
  try {
    await requireAdmin();

    const updated = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        status: newStatus,
        ...(notes ? { errorLog: `[Admin Action]: ${notes}` } : {}),
      },
    });

    revalidatePath("/admin/finances");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("updatePurchaseStatus error:", error);
    return { success: false, error: error?.message || "Không thể cập nhật trạng thái đơn hàng" };
  }
}
