import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { getUserGamificationData } from '@/app/actions/gamification-actions';
import GroupDetailClient from '@/app/components/client/GroupDetailClient';

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;

    // 1. Kiểm duyệt người dùng đã Đăng nhập chưa
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect(`/login?redirectTo=/community/${groupId}`);
    }

    // 2. Lấy thông tin nhóm & kiểm tra Role/Thành viên
    const group = await db.conversation.findUnique({
        where: { id: groupId },
        include: {
            _count: {
                select: { participants: true, questions: true }
            },
            participants: {
                select: {
                    id: true,
                    role: true,
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            avatarUrl: true,
                            userStats: {
                                select: {
                                    level: true,
                                    totalXp: true,
                                    currentStreak: true,
                                    equippedFrame: true,
                                    equippedTitle: true
                                }
                            }
                        }
                    }
                }
            },
            questions: {
                include: {
                    author: {
                        select: {
                            fullName: true,
                            avatarUrl: true,
                            userStats: {
                                select: { level: true, equippedFrame: true, equippedTitle: true }
                            }
                        }
                    },
                    answers: true,
                    upvotes: true
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!group) {
        notFound();
    }

    const currentParticipant = group.participants.find(p => p.user.id === user.id);
    const isParticipant = !!currentParticipant;
    const userRole = currentParticipant?.role || null;

    // 3. Get Real User Stats for Sidebar
    const userGami = await getUserGamificationData(user.id);

    // 4. Build Group Member Leaderboard
    const groupLeaderboard = group.participants
        .map(p => ({
            id: p.user.id,
            name: p.user.fullName || 'Học viên Aura',
            avatar: p.user.avatarUrl,
            xp: p.user.userStats?.totalXp || 0,
            level: p.user.userStats?.level || 1,
            streak: p.user.userStats?.currentStreak || 0,
            equippedFrame: p.user.userStats?.equippedFrame || 'frame_default',
            equippedTitle: p.user.userStats?.equippedTitle || 'Tân binh Aura'
        }))
        .sort((a, b) => b.xp - a.xp)
        .map((u, idx) => ({ ...u, rank: idx + 1 }));

    return (
        <GroupDetailClient 
            group={group} 
            currentUserId={user.id}
            isParticipant={isParticipant}
            userRole={userRole}
            userStats={userGami?.stats || null}
            groupLeaderboard={groupLeaderboard}
            groupQuestions={group.questions as any}
        />
    );
}

