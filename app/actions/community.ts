'use server';

import { db } from "@/lib/prisma";

export async function getCategories() {
    return await db.category.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getMyGroups(userId: string, page = 1, limit = 10, cursor?: string) {
    if (!userId) return { total: 0, totalPages: 0, groups: [], nextCursor: null };

    const where = {
        isGroup: true,
        participants: {
            some: { userId }
        }
    };

    const [total, conversations] = await Promise.all([
        db.conversation.count({ where }),
        cursor ? db.conversation.findMany({
            where,
            include: { participants: true, course: { select: { title: true } } },
            take: limit,
            orderBy: { id: 'desc' },
            cursor: { id: cursor },
            skip: 1, // Bỏ qua bản ghi trùng với cursor
        }) : db.conversation.findMany({
            where,
            include: { participants: true, course: { select: { title: true } } },
            take: limit,
            orderBy: { id: 'desc' },
            skip: (page - 1) * limit,
        })
    ]);

    const nextCursor = conversations.length === limit ? conversations[conversations.length - 1].id : null;

    return {
        total,
        totalPages: Math.ceil(total / limit),
        nextCursor,
        groups: conversations.map(c => ({
            id: c.id,
            name: c.name || 'Unnamed Group',
            description: c.description,
            avatar: c.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${c.id}`,
            membersCount: c.participants.length,
            maxMembers: c.maxMembers,
            isPublic: c.isPublic,
            courseName: c.course?.title || 'Chung',
        }))
    };
}

export async function getAvailableGroups(userId: string | null, categoryId?: string, page = 1, limit = 10, cursor?: string) {
    const whereClause: any = {
        isGroup: true,
        isPublic: true,
        ...(userId ? {
            participants: {
                none: { userId }
            }
        } : {})
    };

    if (categoryId) {
        whereClause.course = {
            categoryId: categoryId
        };
    }

    const [total, conversations] = await Promise.all([
        db.conversation.count({ where: whereClause }),
        cursor ? db.conversation.findMany({
            where: whereClause,
            include: { participants: true, course: { select: { title: true } } },
            take: limit,
            orderBy: { id: 'desc' },
            cursor: { id: cursor },
            skip: 1,
        }) : db.conversation.findMany({
            where: whereClause,
            include: { participants: true, course: { select: { title: true } } },
            take: limit,
            orderBy: { id: 'desc' },
            skip: (page - 1) * limit,
        })
    ]);

    const nextCursor = conversations.length === limit ? conversations[conversations.length - 1].id : null;

    return {
        total,
        totalPages: Math.ceil(total / limit),
        nextCursor,
        groups: conversations.map(c => ({
            id: c.id,
            name: c.name || 'Unnamed Group',
            description: c.description,
            avatar: c.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${c.id}`,
            membersCount: c.participants.length,
            maxMembers: c.maxMembers,
            isPublic: c.isPublic,
            courseName: c.course?.title || 'Chung',
        }))
    };
}
