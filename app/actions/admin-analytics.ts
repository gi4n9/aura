"use server";

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

export async function getAnalyticsData() {
  try {
    await requireAdmin();

    const [userStatsLeaderboard, conversationSummaries, platformTotals] = await Promise.all([
      // 1. UserStats Leaderboard top XP & Study time
      prisma.userStats.findMany({
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        },
        orderBy: { totalXp: "desc" },
        take: 20,
      }),
      // 2. Conversation Summaries (Automated reports)
      prisma.conversationSummary.findMany({
        include: {
          conversation: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // 3. Platform totals
      Promise.all([
        prisma.userStats.aggregate({
          _sum: { totalXp: true, totalStudyMins: true, totalPomodoros: true },
        }),
        prisma.conversationSummary.aggregate({
          _sum: { messageCount: true, activeMembers: true },
        }),
      ]),
    ]);

    return {
      success: true,
      data: {
        userStatsLeaderboard,
        conversationSummaries,
        totalXp: platformTotals[0]._sum.totalXp || 0,
        totalStudyMins: platformTotals[0]._sum.totalStudyMins || 0,
        totalPomodoros: platformTotals[0]._sum.totalPomodoros || 0,
        totalGroupMessages: platformTotals[1]._sum.messageCount || 0,
      },
    };
  } catch (error: any) {
    console.error("getAnalyticsData error:", error);
    return { success: false, error: error?.message || "Không thể tải dữ liệu báo cáo" };
  }
}
