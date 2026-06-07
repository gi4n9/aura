---
title: Implement AI Flashcards & Semantic Search
status: done
created: 2026-02-05
references: 
  - knowledge/ai-video-architecture.md
---

# Implement AI Flashcards & Semantic Search

## Context
See [Architecture Doc](../knowledge/ai-video-architecture.md). 
We want to enhance learning retention and discovery.
1. **Flashcards:** Auto-generate review cards (Term/Definition) from video content.
2. **Semantic Search:** Allow searching across all courses/lessons using natural language.

## Acceptance Criteria

### 1. Flashcards (Auto-generated)
- [x] Add `flashcards` (Json) field to `Lesson` model in `prisma/schema.prisma`.
- [x] Implement `generateFlashcards(transcript)` action using Gemini.
    - [x] Extract key terms and definitions.
    - [x] Output JSON `[{ front: string, back: string, time?: number }]`.
- [x] Frontend:
    - [x] Create `FlashcardDeck` component (Review mode).
    - [x] Add "Flashcards" Tab in `LessonLayout`.

### 2. Semantic Search (Global)
- [x] Create `search` page (`app/(main)/search/page.tsx`).
- [x] Implement `searchContent(query)` action.
    - [x] Use `video_embeddings` table.
    - [x] RPC `match_video_segments` across ALL lessons (remove `filter_lesson_id`).
- [x] Display results with:
    - [x] Video Thumbnail.
    - [x] Course/Lesson Title.
    - [x] Relevant Text Highlight.
    - [x] Click -> Navigate to Lesson at exact timestamp.

## Technical Notes
- **Flashcards**: Use `generateObject` with Zod schema for stability.
- **Search**: Re-use the existing RPC but update it to allow null `filter_lesson_id` for global search.
