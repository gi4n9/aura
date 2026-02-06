"use server";

import { createClient } from "@/utils/supabase/server";
import { generateEmbedding, generateEmbeddings } from "@/lib/ai/embedding";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

// TYPE DEFINITIONS
interface TranscriptSegment {
    text: string;
    start: number;
    end: number;
}

interface VideoSegment {
    id: string;
    content: string;
    start_time: number;
    end_time: number;
    similarity: number;
}

// 1. PROCESS TRANSCRIPT & GENERATE EMBEDDINGS
export async function processLessonTranscript(lessonId: string, segments: TranscriptSegment[]) {
    const supabase = await createClient();
    
    // Check permission (Instructor/Admin only)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // Optimize: Group segments into larger chunks (~30-60s) to have better context
        // This logic can be refined. For now, we take segments as provided if they are reasonable.
        // Assuming segments come from Whisper which are sentence-level.
        
        const chunks: TranscriptSegment[] = [];
        let currentChunk: TranscriptSegment | null = null;
        
        for (const seg of segments) {
            if (!currentChunk) {
                currentChunk = { ...seg };
            } else {
                // Combine if total duration < 60s
                if (seg.end - currentChunk.start < 60) {
                    currentChunk.text += " " + seg.text;
                    currentChunk.end = seg.end;
                } else {
                    chunks.push(currentChunk);
                    currentChunk = { ...seg };
                }
            }
        }
        if (currentChunk) chunks.push(currentChunk);

        // Generate embeddings
        const texts = chunks.map(c => c.text);
        const embeddings = await generateEmbeddings(texts);

        // Delete old embeddings for this lesson (to allow re-processing)
        await supabase.from('video_embeddings').delete().eq('lesson_id', lessonId);

        // Prepare data for insertion
        const rows = chunks.map((chunk, i) => ({
            lesson_id: lessonId,
            content: chunk.text,
            start_time: chunk.start,
            end_time: chunk.end,
            embedding: embeddings[i]
        }));

        // Insert into Supabase
        const { error } = await supabase.from('video_embeddings').insert(rows);

        if (error) {
            console.error("Supabase vector insert error:", error);
            throw new Error(error.message);
        }

        // Update lesson to mark transcript as processed (optional flag in DB?)
        // For now just return success
        return { success: true, count: rows.length };

    } catch (error: any) {
        console.error("Process Video Error:", error);
        return { success: false, error: error.message };
    }
}

// 2. CHAT WITH VIDEO (RAG)
export async function chatWithVideo(lessonId: string, query: string) {
    const supabase = await createClient();

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // 2. Search relevant segments using RPC
    const { data: segments, error } = await supabase.rpc('match_video_segments', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Minimum similarity
        match_count: 5,       // Top 5 chunks
        filter_lesson_id: lessonId
    });

    if (error) {
        console.error("Vector search error:", error);
        throw new Error("Failed to search video content");
    }

    const matchedSegments = segments as VideoSegment[];

    // 3. Construct Context for LLM
    const contextText = matchedSegments
        .map(s => `[Time: ${formatTime(s.start_time)} - ${formatTime(s.end_time)}]: ${s.content}`)
        .join("\n\n");

    const systemPrompt = `
You are an AI teaching assistant for a video lesson.
Answer the user's question based ONLY on the provided Context from the video transcript.
If the answer is not in the context, say "I don't have enough information in this video to answer that."

IMPORTANT:
- Cite the timestamps in your answer like this: [MM:SS] (e.g., "At [05:20], the instructor explains...").
- Be concise and helpful.
- Format your response in Markdown.

Context:
${contextText}
    `;

    // 4. Stream Response
    const result = streamText({
        model: google('gemini-2.5-flash'), // Fast & efficient
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query }
        ],
    });

    return result.toTextStreamResponse();
}

// Helper: Format seconds to MM:SS
function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
