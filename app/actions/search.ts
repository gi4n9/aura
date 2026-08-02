"use server";

import { createClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/lib/ai/embedding";
import { db } from "@/lib/prisma";

export type SearchResult = {
    id: string;
    content: string;
    startTime: number;
    endTime: number;
    similarity: number;
    lesson: {
        id: string;
        title: string;
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
    if (!query || !query.trim()) {
        return { success: true, data: [] };
    }

    const trimmedQuery = query.trim();
    const resultsMap = new Map<string, SearchResult>();

    try {
        const supabase = await createClient();

        // 1. Vector Semantic Search via Supabase RPC (Threshold lowered from 0.6 to 0.2)
        try {
            const embedding = await generateEmbedding(trimmedQuery);
            if (embedding && embedding.length > 0) {
                let { data: segments } = await supabase.rpc('match_video_segments', {
                    query_embedding: embedding,
                    match_threshold: 0.2,
                    match_count: 15,
                    filter_lesson_id: null
                });

                if (!segments || segments.length === 0) {
                    const { data: chunks } = await supabase.rpc('match_video_chunks', {
                        query_embedding: embedding,
                        match_threshold: 0.2,
                        match_count: 15,
                        filter_lesson_id: null
                    });
                    segments = chunks;
                }

                if (segments && Array.isArray(segments) && segments.length > 0) {
                    const lessonIds = [...new Set(segments.map((s: any) => s.lesson_id).filter(Boolean))];
                    if (lessonIds.length > 0) {
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

                        for (const s of segments) {
                            const lesson = lessonMap.get(s.lesson_id);
                            if (lesson) {
                                const key = `${s.lesson_id}_${Math.floor(s.start_time || 0)}`;
                                resultsMap.set(key, {
                                    id: s.id || key,
                                    content: s.content || lesson.title,
                                    startTime: s.start_time || 0,
                                    endTime: s.end_time || 0,
                                    similarity: s.similarity || 0.8,
                                    lesson
                                });
                            }
                        }
                    }
                }
            }
        } catch (vecErr) {
            console.warn("Vector search warning, continuing with keyword search:", vecErr);
        }

        // 2. Keyword & Full-Text Search via Prisma DB (Fallback & Complement)
        const matchedLessons = await db.lesson.findMany({
            where: {
                OR: [
                    { title: { contains: trimmedQuery, mode: 'insensitive' } },
                    { transcript: { contains: trimmedQuery, mode: 'insensitive' } },
                    { chapter: { title: { contains: trimmedQuery, mode: 'insensitive' } } },
                    { chapter: { course: { title: { contains: trimmedQuery, mode: 'insensitive' } } } },
                    { chapter: { course: { description: { contains: trimmedQuery, mode: 'insensitive' } } } }
                ]
            },
            take: 15,
            select: {
                id: true,
                title: true,
                transcript: true,
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

        for (const lesson of matchedLessons) {
            const key = `${lesson.id}_0`;
            if (!resultsMap.has(key)) {
                let snippet = lesson.title;
                if (lesson.transcript && lesson.transcript.toLowerCase().includes(trimmedQuery.toLowerCase())) {
                    const idx = lesson.transcript.toLowerCase().indexOf(trimmedQuery.toLowerCase());
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(lesson.transcript.length, idx + 100);
                    snippet = lesson.transcript.substring(start, end);
                }

                resultsMap.set(key, {
                    id: key,
                    content: snippet,
                    startTime: 0,
                    endTime: 0,
                    similarity: 0.9,
                    lesson: {
                        id: lesson.id,
                        title: lesson.title,
                        chapter: lesson.chapter
                    }
                });
            }
        }

        const finalResults = Array.from(resultsMap.values());
        return { success: true, data: finalResults };

    } catch (error: any) {
        console.error("Search Error:", error);
        return { success: false, error: error.message };
    }
}
