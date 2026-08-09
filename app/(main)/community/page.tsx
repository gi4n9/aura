import React from 'react';
import { getCategories, getMyGroups, getAvailableGroups } from '@/app/actions/community';
import { getLeaderboard, getUserGamificationData } from '@/app/actions/gamification-actions';
import { getGroupQuestions } from '@/app/actions/qa-actions';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';
import CommunityClient from '@/app/components/client/CommunityClient';

export const dynamic = 'force-dynamic';

export default async function CommunityPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    
    // 1. Check User Login
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // 2. Parse Search Params
    const categoryId = typeof searchParams.category === 'string' ? searchParams.category : undefined;
    const tabParam = typeof searchParams.tab === 'string' ? searchParams.tab : 'groups';
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
    const myPage = typeof searchParams.mypage === 'string' ? parseInt(searchParams.mypage) : 1;
    
    // Cursors
    const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined;
    const mycursor = typeof searchParams.mycursor === 'string' ? searchParams.mycursor : undefined;

    // 3. Fetch Data
    const categories = await getCategories();
    const { groups: myGroups, totalPages: myTotalPages, nextCursor: myNextCursor } = userId ? await getMyGroups(userId, myPage, 10, mycursor) : { groups: [], totalPages: 0, nextCursor: null };
    const { groups: availableGroups, totalPages, nextCursor } = await getAvailableGroups(userId, categoryId, page, 10, cursor);

    // 4. Fetch Gamification, Leaderboard & Q&A Data
    const leaderboardUsers = await getLeaderboard('xp');
    const userGamiData = userId ? await getUserGamificationData(userId) : null;
    const qaQuestions = await getGroupQuestions('all');

    // 5. Lấy danh sách khóa học mà user đăng ký (để hiển thị trong modal tạo nhóm)
    let enrolledCourses: { id: string; title: string; thumbnailUrl: string | null }[] = [];
    if (userId) {
        const enrollments = await prisma.enrollment.findMany({
            where: { userId },
            select: {
                course: {
                    select: { id: true, title: true, thumbnailUrl: true }
                }
            }
        });
        enrolledCourses = enrollments.map(e => e.course);

        // Nếu user là giảng viên, thêm cả các khóa học do họ tạo
        const instructorCourses = await prisma.course.findMany({
            where: { instructorId: userId },
            select: { id: true, title: true, thumbnailUrl: true }
        });

        const existingIds = new Set(enrolledCourses.map(c => c.id));
        for (const c of instructorCourses) {
            if (!existingIds.has(c.id)) {
                enrolledCourses.push(c);
            }
        }
    }

    return (
        <CommunityClient
            userId={userId}
            categoryId={categoryId}
            initialTab={tabParam as any}
            page={page}
            myPage={myPage}
            categories={categories}
            myGroups={myGroups}
            myTotalPages={myTotalPages}
            myNextCursor={myNextCursor}
            availableGroups={availableGroups}
            totalPages={totalPages}
            nextCursor={nextCursor}
            enrolledCourses={enrolledCourses}
            leaderboardUsers={leaderboardUsers}
            userGamiData={userGamiData}
            qaQuestions={qaQuestions as any}
        />
    );
}
