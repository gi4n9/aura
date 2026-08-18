'use server';

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
    calculateLevelFromXp,
    getUnlockedItemIdsForLevel,
    getXpRequiredForLevel,
    AVATAR_FRAMES,
    BANNER_THEMES,
    USER_TITLES
} from "@/lib/gamification";

const XP_PER_LESSON = 100;

export async function recordLessonCompletion(userId?: string, lessonId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Fetch or create UserStats
        let userStats = await db.userStats.findUnique({
            where: { userId: targetUserId }
        });

        if (!userStats) {
            userStats = await db.userStats.create({
                data: {
                    userId: targetUserId,
                    currentStreak: 0,
                    longestStreak: 0,
                    totalXp: 0,
                    level: 1,
                    unlockedItems: ["frame_default", "banner_default", "title_newbie"],
                    equippedFrame: "frame_default",
                    equippedBanner: "banner_default",
                    equippedTitle: "Tân binh Aura"
                }
            });
        }

        const now = new Date();
        const lastDate = userStats.lastStudyDate ? new Date(userStats.lastStudyDate) : null;

        let newStreak = userStats.currentStreak;
        let isStreakUpdated = false;

        if (!lastDate) {
            newStreak = 1;
            isStreakUpdated = true;
        } else {
            const isSameDay =
                now.getFullYear() === lastDate.getFullYear() &&
                now.getMonth() === lastDate.getMonth() &&
                now.getDate() === lastDate.getDate();

            if (!isSameDay) {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);

                const isYesterday =
                    yesterday.getFullYear() === lastDate.getFullYear() &&
                    yesterday.getMonth() === lastDate.getMonth() &&
                    yesterday.getDate() === lastDate.getDate();

                if (isYesterday) {
                    newStreak += 1;
                } else {
                    newStreak = 1;
                }
                isStreakUpdated = true;
            }
        }

        const newLongestStreak = Math.max(userStats.longestStreak, newStreak);
        const newTotalXp = userStats.totalXp + XP_PER_LESSON;
        const newLevel = calculateLevelFromXp(newTotalXp);

        const isLevelUp = newLevel > userStats.level;

        // Calculate unlocked items
        const allUnlockedForNewLevel = getUnlockedItemIdsForLevel(newLevel);
        const updatedUnlockedItems = Array.from(new Set([...userStats.unlockedItems, ...allUnlockedForNewLevel]));

        // Determine newly unlocked items for notification
        const newlyUnlocked = allUnlockedForNewLevel.filter(
            itemId => !userStats!.unlockedItems.includes(itemId)
        );

        const updatedStats = await db.userStats.update({
            where: { userId: targetUserId },
            data: {
                totalXp: newTotalXp,
                level: newLevel,
                currentStreak: newStreak,
                longestStreak: newLongestStreak,
                lastStudyDate: now,
                unlockedItems: updatedUnlockedItems
            }
        });

        revalidatePath("/profile");
        revalidatePath("/community");

        return {
            success: true,
            xpGained: XP_PER_LESSON,
            totalXp: updatedStats.totalXp,
            level: updatedStats.level,
            isLevelUp,
            currentStreak: updatedStats.currentStreak,
            newlyUnlocked
        };
    } catch (error) {
        console.error("Lỗi ghi nhận hoàn thành bài học:", error);
        return { success: false, error: "Có lỗi xảy ra" };
    }
}

export async function equipProfileItem(itemType: 'frame' | 'banner' | 'title', itemId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const stats = await db.userStats.findUnique({
            where: { userId: user.id }
        });

        if (!stats) return { success: false, error: "Không tìm thấy hồ sơ người dùng" };

        if (!stats.unlockedItems.includes(itemId)) {
            return { success: false, error: "Bạn chưa mở khóa vật phẩm này" };
        }

        const updateData: any = {};

        if (itemType === 'frame') {
            updateData.equippedFrame = itemId;
        } else if (itemType === 'banner') {
            updateData.equippedBanner = itemId;
        } else if (itemType === 'title') {
            const titleObj = USER_TITLES.find(t => t.id === itemId);
            updateData.equippedTitle = titleObj ? titleObj.name : itemId;
        }

        await db.userStats.update({
            where: { userId: user.id },
            data: updateData
        });

        revalidatePath("/profile");
        revalidatePath("/community");

        return { success: true };
    } catch (error) {
        console.error("Lỗi trang bị item:", error);
        return { success: false, error: "Có lỗi xảy ra" };
    }
}

export async function getUserGamificationData(targetUserId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = targetUserId || user?.id;

    if (!userId) return null;

    let stats = await db.userStats.findUnique({
        where: { userId }
    });

    if (!stats) {
        stats = await db.userStats.create({
            data: {
                userId,
                currentStreak: 0,
                longestStreak: 0,
                totalXp: 0,
                level: 1,
                unlockedItems: ["frame_default", "banner_default", "title_newbie"],
                equippedFrame: "frame_default",
                equippedBanner: "banner_default",
                equippedTitle: "Tân binh Aura"
            }
        });
    }

    const level = stats.level;
    const currentXp = stats.totalXp;
    const currentLevelXp = getXpRequiredForLevel(level);
    const nextLevelXp = getXpRequiredForLevel(level + 1);

    const levelProgressXp = currentXp - currentLevelXp;
    const xpNeededForNextLevel = Math.max(1, nextLevelXp - currentLevelXp);
    const progressPercentage = Math.min(100, Math.round((levelProgressXp / xpNeededForNextLevel) * 100));

    return {
        stats,
        levelProgress: {
            currentLevel: level,
            currentXp,
            currentLevelXp,
            nextLevelXp,
            levelProgressXp,
            xpNeededForNextLevel,
            progressPercentage
        },
        catalog: {
            frames: AVATAR_FRAMES,
            banners: BANNER_THEMES,
            titles: USER_TITLES
        }
    };
}

export async function getLeaderboard(period: 'xp' | 'streak' | 'mins' = 'xp', page: number = 1, limit: number = 10) {
    let orderBy: any = { totalXp: 'desc' };
    if (period === 'streak') orderBy = { currentStreak: 'desc' };
    if (period === 'mins') orderBy = { totalStudyMins: 'desc' };

    const total = await db.userStats.count();
    const totalPages = Math.ceil(total / limit) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));

    const selectUser = {
        select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            createdAt: true
        }
    };

    // Fetch Top 3 for Podium and paginated stats for table
    const [top3Stats, pageStats] = await Promise.all([
        db.userStats.findMany({
            take: 3,
            orderBy,
            include: { user: selectUser }
        }),
        db.userStats.findMany({
            skip: (safePage - 1) * limit,
            take: limit,
            orderBy,
            include: { user: selectUser }
        })
    ]);

    // Unique user IDs for batch queries
    const allUserIds = Array.from(new Set([...top3Stats.map(s => s.userId), ...pageStats.map(s => s.userId)]));

    // BATCH QUERY 1: Aggregated question counts
    const questionCountGroups = allUserIds.length > 0 ? await db.groupQuestion.groupBy({
        by: ['authorId'],
        where: { authorId: { in: allUserIds } },
        _count: { id: true }
    }) : [];
    const questionCountMap = new Map<string, number>();
    questionCountGroups.forEach(g => questionCountMap.set(g.authorId, g._count.id));

    // BATCH QUERY 2: Aggregated group membership counts
    const groupCountGroups = allUserIds.length > 0 ? await db.conversationParticipant.groupBy({
        by: ['userId'],
        where: { userId: { in: allUserIds } },
        _count: { id: true }
    }) : [];
    const groupCountMap = new Map<string, number>();
    groupCountGroups.forEach(g => groupCountMap.set(g.userId, g._count.id));

    const mapStatToUser = (stat: typeof pageStats[0], rank: number) => {
        const equippedFrame = stat.equippedFrame || "frame_default";
        const equippedBanner = stat.equippedBanner || "banner_default";
        const equippedTitle = stat.equippedTitle || "Tân binh Aura";

        const bannerObj = BANNER_THEMES.find(b => b.id === equippedBanner) || BANNER_THEMES[0];
        const frameObj = AVATAR_FRAMES.find(f => f.id === equippedFrame) || AVATAR_FRAMES[0];
        const titleObj = USER_TITLES.find(t => t.name === equippedTitle || t.id === equippedTitle) || USER_TITLES[0];

        const name = stat.user.fullName || stat.user.email?.split('@')[0] || "Học viên Aura";

        const userSummary = {
            user: {
                id: stat.userId,
                fullName: stat.user.fullName,
                email: stat.user.email,
                avatarUrl: stat.user.avatarUrl,
                createdAt: stat.user.createdAt
            },
            stats: {
                level: stat.level,
                totalXp: stat.totalXp,
                currentStreak: stat.currentStreak,
                equippedFrame,
                equippedBanner,
                equippedTitle
            },
            questionsCount: questionCountMap.get(stat.userId) || 0,
            groupsCount: groupCountMap.get(stat.userId) || 0,
            bannerStyle: bannerObj.previewStyle,
            frameStyle: frameObj.previewStyle,
            titleStyle: titleObj.previewStyle,
            titleName: titleObj.name || equippedTitle
        };

        return {
            rank,
            userId: stat.userId,
            name,
            avatarUrl: stat.user.avatarUrl,
            level: stat.level,
            totalXp: stat.totalXp,
            currentStreak: stat.currentStreak,
            totalStudyMins: stat.totalStudyMins,
            equippedFrame,
            equippedBanner,
            equippedTitle,
            userSummary
        };
    };

    const top3 = top3Stats.map((stat, idx) => mapStatToUser(stat, idx + 1));
    const users = pageStats.map((stat, idx) => mapStatToUser(stat, (safePage - 1) * limit + idx + 1));

    return {
        users,
        top3,
        total,
        totalPages,
        page: safePage,
        limit
    };
}

export async function getUserProfileSummary(targetUserId: string) {
    if (!targetUserId) return null;

    try {
        const userProfile = await db.profile.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                createdAt: true
            }
        });

        if (!userProfile) return null;

        let stats = await db.userStats.findUnique({
            where: { userId: targetUserId }
        });

        if (!stats) {
            stats = {
                id: "default",
                userId: targetUserId,
                currentStreak: 0,
                longestStreak: 0,
                totalXp: 0,
                level: 1,
                totalPomodoros: 0,
                totalStudyMins: 0,
                unlockedItems: ["frame_default", "banner_default", "title_newbie"],
                equippedFrame: "frame_default",
                equippedBanner: "banner_default",
                equippedTitle: "Tân binh Aura",
                lastStudyDate: null,
                updatedAt: new Date()
            };
        }

        const questionsCount = await db.groupQuestion.count({
            where: { authorId: targetUserId }
        });

        const groupsCount = await db.conversationParticipant.count({
            where: { userId: targetUserId }
        });

        const equippedFrame = stats?.equippedFrame || "frame_default";
        const equippedBanner = stats?.equippedBanner || "banner_default";
        const equippedTitle = stats?.equippedTitle || "Tân binh Aura";

        const bannerObj = BANNER_THEMES.find(b => b.id === equippedBanner) || BANNER_THEMES[0];
        const frameObj = AVATAR_FRAMES.find(f => f.id === equippedFrame) || AVATAR_FRAMES[0];
        const titleObj = USER_TITLES.find(t => t.name === equippedTitle || t.id === equippedTitle) || USER_TITLES[0];

        return {
            user: userProfile,
            stats: {
                level: stats?.level || 1,
                totalXp: stats?.totalXp || 0,
                currentStreak: stats?.currentStreak || 0,
                equippedFrame,
                equippedBanner,
                equippedTitle
            },
            questionsCount,
            groupsCount,
            bannerStyle: bannerObj.previewStyle,
            frameStyle: frameObj.previewStyle,
            titleStyle: titleObj.previewStyle,
            titleName: titleObj.name || equippedTitle
        };
    } catch (error) {
        console.error("Lỗi lấy tóm tắt hồ sơ người dùng:", error);
        return null;
    }
}

