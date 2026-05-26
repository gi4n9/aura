---
title: Implement Course-wide AI Chat (RAG)
status: todo
created: 2026-02-05
references: 
  - knowledge/ai-video-architecture.md
---

# Implement Course-wide AI Chat (RAG)

## Context
Allow students to ask questions about the ENTIRE course content, not just the current video.
The AI should retrieve relevant segments from any lesson in the course and synthesize an answer.

## Acceptance Criteria

### 1. Backend / RAG Logic
- [ ] Create `chatWithCourse(courseId, query)` server action.
    - [ ] Retrieve embeddings for query.
    - [ ] Search `video_embeddings` filtered by `courseId` (join Lesson -> Chapter -> Course).
    - [ ] Rerank results? (Optional).
    - [ ] Send context to High-level LLM (Gemini 1.5 Pro).

### 2. Frontend (UI)
- [ ] Create `app/(learning)/courses/[courseId]/chat/page.tsx`.
    - [ ] Full-height chat interface.
    - [ ] Sidebar with "Chat History" (Saved user sessions).
- [ ] Support "Citations": Click citation -> Navigate to Lesson & Timestamp.

### 3. Integration
- [ ] Add "Ask AI" button in Course Header or Navigation.
