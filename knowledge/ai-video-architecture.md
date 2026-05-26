---
title: AI Interactive Video Architecture
description: Technical architecture for implementing Chat-with-Video, Semantic Search, and Smart Chapters using Supabase pgvector.
created: 2026-02-05
tags: [ai, vector-db, supabase, architecture]
---

# AI Interactive Video Architecture

## 1. Overview
The goal is to transform passive video watching into an active learning experience. This requires moving beyond simple text storage to semantic understanding of video content.

**Core Features Enabled:**
1.  **Chat-with-Video:** Q&A with context-aware answers and deep-links to timestamps.
2.  **Semantic Search:** Finding concepts across the entire course library.
3.  **Smart Features:** Auto-generated flashcards, mindmaps, and chapters.

## 2. Technical Stack Recommendation

### Database: Supabase + pgvector
-   **Why:** We are already using Supabase (PostgreSQL). Using `pgvector` allows us to keep vector data alongside relational data (users, courses, lessons) without managing a separate vector DB like Pinecone or Weaviate.
-   **Performance:** Sufficient for the scale of an LMS.

### Embedding Model
-   **Model:** `text-embedding-3-small` (OpenAI) or `gemini-embedding-001`.
-   **Dimension:** 1536 (OpenAI) or 768 (Gemini).
-   **Strategy:** Chunk transcripts into segments (e.g., 30-60 seconds or semantic chunks) to ensure precise timestamp retrieval.

### Processing Pipeline (Background Jobs)
Video processing is long-running. We cannot do this in a standard API route.
1.  **Upload:** Video uploaded to Storage.
2.  **Transcription:** Use OpenAI Whisper or Google Gemini 1.5 Pro (multimodal) to generate transcript with timestamps.
3.  **Chunking:** Split transcript into meaningful segments.
4.  **Embedding:** Generate vectors for each chunk.
5.  **Storage:** Store chunks + vectors in `video_embeddings` table.

## 3. Database Schema Design

We need a dedicated table to store transcript chunks and their vector representations.

```sql
-- Enable the extension
create extension if not exists vector;

-- Table for storing transcript embeddings
create table video_embeddings (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references "Lesson"(id) on delete cascade,
  content text not null,                -- The actual text segment
  embedding vector(1536),               -- Vector data (dimension depends on model)
  start_time float not null,            -- Start timestamp in seconds
  end_time float not null,              -- End timestamp in seconds
  metadata jsonb,                       -- Extra info (e.g., specific topics)
  created_at timestamptz default now()
);

-- Index for fast similarity search
create index on video_embeddings using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
```

## 4. Feature Implementation Details

### A. Chat-with-Video (RAG Pipeline)
1.  **User Query:** "Đoạn nào nói về useEffect?"
2.  **Vector Search:** Convert query to vector $\rightarrow$ Query `video_embeddings` for nearest neighbors (cosine similarity) filtering by `current_lesson_id`.
3.  **Synthesis:** Send relevant chunks + timestamps + User Query to LLM.
4.  **Response:** LLM generates answer citing the specific timestamp (e.g., "Tại 05:30, giảng viên giải thích...").
5.  **UI:** Clickable timestamp seeks the video player.

### B. Smart Mindmap & Flashcards
-   **Mindmap:** Instead of RAG, use a "Summary & Hierarchy Extraction" prompt on the full transcript. Structure the JSON output to map `Topic Node` -> `Timestamp`.
-   **Flashcards:** Identify key terms in the transcript, generate Definitions, and link back to the occurrence time.

## 5. Potential Challenges & Solutions
-   **Processing Time:** Processing a 1-hour video takes time.
    -   *Solution:* Use optimistic UI (show "Processing AI features..."). Implementation via Vercel Functions (max duration) or external triggers.
-   **Cost:** Vector storage and embedding generation cost.
    -   *Solution:* `text-embedding-3-small` is extremely cheap. `pgvector` on Supabase has no extra cost beyond storage.
