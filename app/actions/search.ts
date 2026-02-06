"use server";

import { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/lib/ai/embedding";
import { db } from "@/lib/prisma";

export type SearchResult = {
    id: string; // Video Embedding ID
    content: string;
    startTime: number;
    endTime: number;
    similarity: number;
    lesson: {
        id: string;
        title: string;
        slug: string; // If lesson has slug? Check schema. Lesson usually has ID. Access via course slug?
        // Let's check Lesson structure. Usually we need course slug to build URL.
        chapter: {
            course: {
                id: string;
                title: string;
                instructor: {
                    fullName: string | null;
                    avatarUrl: string | null;
                } | null;
            }
        }
    }
};

export async function searchContent(query: string) {
    const supabase = await createClient();

    try {
        // 1. Generate Query Embedding
        const embedding = await generateEmbedding(query);

        // 2. Vector Search (Global)
        const { data: segments, error } = await supabase.rpc('match_video_segments', {
            query_embedding: embedding,
            match_threshold: 0.6, // Higher threshold for relevant search results
            match_count: 10,
            filter_lesson_id: null // Search all lessons
        });

        if (error) throw new Error(error.message);

        // 3. Hydrate with Prisma (Get Lesson & Course Info)
        // Segments only give lesson_id. We need full context.
        const lessonIds = [...new Set((segments as any[]).map(s => s.lesson_id))];
        
        const lessons = await db.lesson.findMany({
            where: { id: { in: lessonIds } },
            select: {
                id: true,
                title: true,
                chapter: {
                    select: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                instructor: {
                                    select: { fullName: true, avatarUrl: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const lessonMap = new Map(lessons.map(l => [l.id, l]));

        // 4. Transform Results
        const results: SearchResult[] = (segments as any[]).map(s => {
            const lesson = lessonMap.get(s.lesson_id);
            if (!lesson) return null;

            return {
                id: s.id,
                content: s.content,
                startTime: s.start_time,
                endTime: s.end_time,
                similarity: s.similarity,
                lesson: lesson
            };
        }).filter(Boolean) as SearchResult[];

        return { success: true, data: results };

    } catch (error: any) {
        console.error("Search Error:", error);
        return { success: false, error: error.message };
    }
}
