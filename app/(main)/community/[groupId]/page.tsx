import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/prisma';
import GroupDetailClient from '@/app/components/client/GroupDetailClient';

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;

    const group = await db.conversation.findUnique({
        where: { id: groupId },
        include: {
            _count: {
                select: { participants: true }
            }
        }
    });

    if (!group) {
        notFound();
    }

    return (
        <GroupDetailClient group={group} />
    );
}
