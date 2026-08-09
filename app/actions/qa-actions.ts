'use server';

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { AVATAR_FRAMES, BANNER_THEMES, USER_TITLES } from "@/lib/gamification";

export async function getGroupQuestions(filter: 'all' | 'resolved' | 'unresolved' = 'all') {
    try {
        let where: any = {};
        if (filter === 'resolved') where.isResolved = true;
        if (filter === 'unresolved') where.isResolved = false;

        const questions = await db.groupQuestion.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        email: true,
                        createdAt: true,
                        userStats: true
                    }
                },
                answers: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                fullName: true,
                                avatarUrl: true,
                                email: true,
                                createdAt: true,
                                userStats: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                upvotes: true
            }
        });

        // Collect unique author IDs
        const authorIds = new Set<string>();
        questions.forEach(q => {
            if (q.authorId) authorIds.add(q.authorId);
            q.answers?.forEach(a => {
                if (a.authorId) authorIds.add(a.authorId);
            });
        });
        const authorIdArr = Array.from(authorIds);

        // Batch question counts
        const questionCountGroups = await db.groupQuestion.groupBy({
            by: ['authorId'],
            where: { authorId: { in: authorIdArr } },
            _count: { id: true }
        });
        const qMap = new Map<string, number>();
        questionCountGroups.forEach(g => qMap.set(g.authorId, g._count.id));

        // Batch group counts
        const groupCountGroups = await db.conversationParticipant.groupBy({
            by: ['userId'],
            where: { userId: { in: authorIdArr } },
            _count: { id: true }
        });
        const gMap = new Map<string, number>();
        groupCountGroups.forEach(g => gMap.set(g.userId, g._count.id));

        const buildSummary = (author: any) => {
            if (!author) return null;
            const stats = author.userStats;
            const equippedFrame = stats?.equippedFrame || "frame_default";
            const equippedBanner = stats?.equippedBanner || "banner_default";
            const equippedTitle = stats?.equippedTitle || "Tân binh Aura";

            const bannerObj = BANNER_THEMES.find(b => b.id === equippedBanner) || BANNER_THEMES[0];
            const frameObj = AVATAR_FRAMES.find(f => f.id === equippedFrame) || AVATAR_FRAMES[0];
            const titleObj = USER_TITLES.find(t => t.name === equippedTitle || t.id === equippedTitle) || USER_TITLES[0];

            return {
                user: {
                    id: author.id,
                    fullName: author.fullName,
                    email: author.email,
                    avatarUrl: author.avatarUrl,
                    createdAt: author.createdAt
                },
                stats: {
                    level: stats?.level || 1,
                    totalXp: stats?.totalXp || 0,
                    currentStreak: stats?.currentStreak || 0,
                    equippedFrame,
                    equippedBanner,
                    equippedTitle
                },
                questionsCount: qMap.get(author.id) || 0,
                groupsCount: gMap.get(author.id) || 0,
                bannerStyle: bannerObj.previewStyle,
                frameStyle: frameObj.previewStyle,
                titleStyle: titleObj.previewStyle,
                titleName: titleObj.name || equippedTitle
            };
        };

        return questions.map(q => ({
            ...q,
            authorSummary: buildSummary(q.author),
            answers: q.answers?.map(a => ({
                ...a,
                authorSummary: buildSummary(a.author)
            }))
        }));
    } catch (error) {
        console.error("Lỗi lấy danh sách câu hỏi Q&A:", error);
        return [];
    }
}

export async function createQuestion(title: string, content: string, categoryId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    if (!title.trim() || !content.trim()) {
        return { success: false, error: "Tiêu đề và nội dung không được để trống" };
    }

    try {
        const question = await db.groupQuestion.create({
            data: {
                title: title.trim(),
                content: content.trim(),
                authorId: user.id,
                categoryId: categoryId || null
            }
        });

        revalidatePath("/community");

        return { success: true, question };
    } catch (error) {
        console.error("Lỗi tạo câu hỏi Q&A:", error);
        return { success: false, error: "Không thể tạo câu hỏi" };
    }
}

export async function answerQuestion(questionId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    if (!content.trim()) {
        return { success: false, error: "Nội dung câu trả lời không được để trống" };
    }

    try {
        const answer = await db.groupQuestionAnswer.create({
            data: {
                questionId,
                authorId: user.id,
                content: content.trim()
            }
        });

        revalidatePath("/community");

        return { success: true, answer };
    } catch (error) {
        console.error("Lỗi gửi câu trả lời Q&A:", error);
        return { success: false, error: "Không thể gửi câu trả lời" };
    }
}

export async function toggleVoteQuestion(questionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const existingVote = await db.questionUpvote.findUnique({
            where: {
                userId_questionId: {
                    userId: user.id,
                    questionId
                }
            }
        });

        if (existingVote) {
            await db.questionUpvote.delete({
                where: { id: existingVote.id }
            });
            await db.groupQuestion.update({
                where: { id: questionId },
                data: { upvotesCount: { decrement: 1 } }
            });
        } else {
            await db.questionUpvote.create({
                data: {
                    userId: user.id,
                    questionId
                }
            });
            await db.groupQuestion.update({
                where: { id: questionId },
                data: { upvotesCount: { increment: 1 } }
            });
        }

        revalidatePath("/community");

        return { success: true };
    } catch (error) {
        console.error("Lỗi upvote câu hỏi:", error);
        return { success: false, error: "Có lỗi xảy ra" };
    }
}

export async function markAnswerAccepted(answerId: string, questionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const question = await db.groupQuestion.findUnique({
            where: { id: questionId }
        });

        if (!question || question.authorId !== user.id) {
            return { success: false, error: "Chỉ người đăng mới có thể đánh dấu câu trả lời đúng" };
        }

        await db.groupQuestionAnswer.updateMany({
            where: { questionId },
            data: { isAccepted: false }
        });

        const acceptedAnswer = await db.groupQuestionAnswer.update({
            where: { id: answerId },
            data: { isAccepted: true }
        });

        await db.groupQuestion.update({
            where: { id: questionId },
            data: { isResolved: true }
        });

        // Award +20 XP to the answer author
        try {
            await db.userStats.update({
                where: { userId: acceptedAnswer.authorId },
                data: { totalXp: { increment: 20 } }
            });
        } catch (e) {
            console.error("Lỗi cộng XP câu trả lời chuẩn:", e);
        }

        revalidatePath("/community");

        return { success: true };
    } catch (error) {
        console.error("Lỗi đánh dấu câu trả lời đúng:", error);
        return { success: false, error: "Có lỗi xảy ra" };
    }
}
