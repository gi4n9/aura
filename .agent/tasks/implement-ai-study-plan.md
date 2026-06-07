---
title: Implement AI Study Plan Generator
status: done
created: 2026-02-05
references: 
  - knowledge/ai-video-architecture.md
---

# Implement AI Study Plan Generator

## Context
Help students complete courses by generating personalized study schedules based on their availability.

## Acceptance Criteria

### 1. Database Schema
- [x] Review `StudySchedule` model (if exists) or create one.
    - [x] Link `User` (Profile) and `Course`.
    - [x] Store `startDate`, `endDate`, `dailyCommitment` (minutes), `availability` (e.g. weekends only).
    - [x] Store generated events/milestones.

### 2. Backend / AI Actions
- [x] Implement `generateStudyPlan(courseId, userPreferences)`:
    - [x] Input: Course structure (chapters, lessons, durations) + User constraints.
    - [x] Prompt Gemini to distribute lessons into a calendar schedule.
    - [x] Output: JSON list of `{ date: string, lessons: lessonId[] }`.
    - [x] Save to DB.

### 3. Frontend (UI)
- [x] Create "Generate Study Plan" Modal on Course Page.
    - [x] Inputs: "Hours per day", "Days of week", "Target End Date".
- [x] Create `StudyPlanView` (Calendar or List view).
    - [x] Show what to study today.
    - [x] Track progress against plan.

## Technical Notes
- **Prompt:** "Given course total duration X, 10 chapters... and user has 30 mins/day... create a schedule."
- **Edge Cases:** Missed days (Recalculation feature?).
