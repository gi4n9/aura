---
title: Implement Chat-with-Video using Supabase pgvector
status: done
created: 2026-02-05
references: 
  - knowledge/ai-video-architecture.md
---

# Implement Chat-with-Video

## Context
See [Architecture Doc](../knowledge/ai-video-architecture.md) for full context. 
We need to enable users to chat with the video content. This involves setting up the backend vector storage, a pipeline to process transcripts into embeddings, and a frontend chat interface that can control the video player.

## Acceptance Criteria

### 1. Database Setup
- [x] Enable `vector` extension in Supabase.
- [x] Create `video_embeddings` table with fields: `lesson_id`, `content`, `embedding`, `start_time`, `end_time`.
- [x] Create function/RPC `match_video_segments` for similarly search using cosine distance.

### 2. Backend / Actions
- [x] Implement `generateEmbeddings(text)` utility using OpenAI/Gemini.
- [x] Implement `processLessonTranscript(lessonId, transcript)` action:
    - [x] Split transcript into semantic chunks.
    - [x] Generate embeddings for chunks.
    - [x] Save to `video_embeddings`.
- [x] Implement `chatWithVideo(lessonId, userQuery)` action:
    - [x] Vector search relevant segments.
    - [x] Call LLM (RAG) to answer question with timestamp references.

### 3. Frontend (UI/UX)
- [x] Add "AI Assistant" tab next to the Video Player in `LessonView`.
- [x] Create Chat Interface (History, Input).
- [x] Display responses with **Clickable Timestamps**.
- [x] Clicking a timestamp must seek the video player to that second.

## Technical Notes
- Use `text-embedding-3-small` (or equivalent) for embeddings.
- Ensure the Chunking logic preserves timestamp boundaries correctly.
- UI should handle "Thinking..." state gracefully.
