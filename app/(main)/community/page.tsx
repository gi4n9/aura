import React from 'react';
import { getCategories, getMyGroups, getAvailableGroups } from '@/app/actions/community';
import { createClient } from '@/utils/supabase/server';
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
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
    const myPage = typeof searchParams.mypage === 'string' ? parseInt(searchParams.mypage) : 1;
    
    // Cursors
    const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined;
    const mycursor = typeof searchParams.mycursor === 'string' ? searchParams.mycursor : undefined;

    // 3. Fetch Data
    const categories = await getCategories();
    const { groups: myGroups, totalPages: myTotalPages, nextCursor: myNextCursor } = userId ? await getMyGroups(userId, myPage, 10, mycursor) : { groups: [], totalPages: 0, nextCursor: null };
    const { groups: availableGroups, totalPages, nextCursor } = await getAvailableGroups(userId, categoryId, page, 10, cursor);

    return (
        <CommunityClient
            userId={userId}
            categoryId={categoryId}
            page={page}
            myPage={myPage}
            categories={categories}
            myGroups={myGroups}
            myTotalPages={myTotalPages}
            myNextCursor={myNextCursor}
            availableGroups={availableGroups}
            totalPages={totalPages}
            nextCursor={nextCursor}
        />
    );
}
