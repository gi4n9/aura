import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import GroupDetailClient from '@/app/components/client/GroupDetailClient';

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;

    // 1. Kiểm duyệt người dùng đã Đăng nhập chưa
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Chưa đăng nhập -> Chuyển hướng tới login kèm return URL
        return redirect(`/login?redirectTo=/community/${groupId}`);
    }

    // 2. Lấy thông tin nhóm & kiểm tra Role/Thành viên
    const group = await db.conversation.findUnique({
        where: { id: groupId },
        include: {
            _count: {
                select: { participants: true }
            },
            participants: {
                where: { userId: user.id },
                select: { id: true, role: true }
            }
        }
    });

    if (!group) {
        notFound();
    }

    const participant = group.participants[0] || null;
    const isParticipant = !!participant;
    const userRole = participant?.role || null;

    return (
        <GroupDetailClient 
            group={group} 
            currentUserId={user.id}
            isParticipant={isParticipant}
            userRole={userRole}
        />
    );
}

