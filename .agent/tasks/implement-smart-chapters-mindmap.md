---
title: Implement Smart Chapters & Interactive Mindmap
status: done
created: 2026-02-05
references: 
  - knowledge/ai-video-architecture.md
---

# Implement Smart Chapters & Interactive Mindmap

## Context
See [Architecture Doc](../knowledge/ai-video-architecture.md). 
We want to visually structure the video content.
1. **Smart Chapters:** Break down the video into logical sections with timestamps.
2. **Interactive Mindmap:** A visual graph of concepts linked to video timestamps.

## Acceptance Criteria

### 1. Database Schema
- [x] Add `mindMapData` (Json) field to `Lesson` model in `prisma/schema.prisma`.
- [x] Run migration/db push.

### 2. Backend / AI Actions
- [x] Implement `generateSmartChapters(transcript)`:
    - [x] Prompt Gemini to analyze transcript and output JSON `[{ time: number, label: string }]`.
    - [x] Save to `Lesson.timeline`.
- [x] Implement `generateMindmap(transcript)`:
    - [x] Prompt Gemini to extract hierarchical concepts `Root -> Topics -> Sub-concepts -> Timestamp`.
    - [x] Output JSON structure (React Flow compatible or generic tree).
    - [x] Save to `Lesson.mindMapData`.

### 3. Frontend (UI)
- [x] **Smart Chapters**: Review `TranscriptTimeline` component to ensure it renders `Lesson.timeline` correctly.
- [x] **Interactive Mindmap**:
    - [x] Create `MindmapView` component using `React Flow` or just CSS Tree.
    - [x] Nodes should be clickable -> Seek video to timestamp.
    - [x] Add "Mindmap" Tab in `LessonLayout` (beside Quiz & AI Chat).

## Technical Notes
- **Prompt Engineering**: Key challenge is getting stable JSON from LLM. Use `json_object` mode or strict prompt instructions.
- **React Flow**: Use for Mindmap visualization. Nodes need customized styling.
