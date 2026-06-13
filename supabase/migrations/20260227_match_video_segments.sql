-- Enable pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop old function first (return type changed)
DROP FUNCTION IF EXISTS match_video_segments(vector, double precision, integer, text);
DROP FUNCTION IF EXISTS match_video_segments(vector(3072), float, int, text);
-- Function: Tìm kiếm các đoạn video tương tự nhất dựa trên vector embedding
-- Sử dụng cosine similarity (1 - cosine distance)
CREATE OR REPLACE FUNCTION match_video_segments(
    query_embedding vector(3072),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5,
    filter_lesson_id text DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    start_time float,
    end_time float,
    lesson_id text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ve.id,
        ve.content,
        ve.start_time,
        ve.end_time,
        ve.lesson_id,
        1 - (ve.embedding <=> query_embedding) AS similarity
    FROM video_embeddings ve
    WHERE
        (filter_lesson_id IS NULL OR ve.lesson_id = filter_lesson_id)
        AND ve.embedding IS NOT NULL
        AND 1 - (ve.embedding <=> query_embedding) > match_threshold
    ORDER BY ve.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Fix độ dài column vector (nếu Prisma lỡ tạo thành vector chung chung)
ALTER TABLE video_embeddings ALTER COLUMN embedding TYPE vector(3072);

-- Index: lesson_id cho filter nhanh
CREATE INDEX IF NOT EXISTS video_embeddings_lesson_id_idx
ON video_embeddings (lesson_id);
