# Implementation Plan: Comprehensive i18n Translation Support

Expand multi-language support (Vietnamese 🇻🇳 & English 🇬🇧) across remaining key pages:
1. **Course Detail Page** (`/courses/[courseId]`)
2. **Video Learning Page & Sidebar** (`/courses/[courseId]/lessons/[lessonId]`)
3. **Course Progress Page** (`/courses/[courseId]/progress`)
4. **Smart Study Plan Onboarding** (`/onboarding/study-plan`)
5. **Instructor & Admin Portals** (`/instructor`, `/admin`)

---

## Proposed Changes

### [Translation Dictionary]
#### [MODIFY] [translations.ts](file:///f:/aura/aura/lib/i18n/translations.ts)
- Add complete translation strings for `courseDetail`, `lessonLearning`, `progressPage`, `studyPlan`, `instructorPortal`, and `adminPortal` in both Vietnamese (`vi`) and English (`en`).

---

### [Learning Pages]

#### [MODIFY] [CourseActionButtons.tsx](file:///f:/aura/aura/app/components/courseComponents/CourseActionButtons.tsx)
- Integrate `useLanguage()` to translate "Buy Now", "Enroll Now (Free)", "Processing...", "Simulated Checkout", etc.

#### [MODIFY] [CourseDetailClient.tsx](file:///f:/aura/aura/app/components/client/CourseDetailClient.tsx) [NEW]
- Create client wrapper for `/courses/[courseId]/page.tsx` to handle dynamic language switching for course metadata (Duration, Chapters count, Instructor label, Enrolled progress, Lifetime access badge, Syllabus header, etc.).

#### [MODIFY] [CourseProgressClient.tsx](file:///f:/aura/aura/app/components/client/CourseProgressClient.tsx) [NEW]
- Create client wrapper for `/courses/[courseId]/progress/page.tsx` and [ProgressDetailsList.tsx](file:///f:/aura/aura/app/components/courseComponents/ProgressDetailsList.tsx) to translate "Back to course", "Overall Progress", "Completed X of Y lessons", "Quiz Result", etc.

---

### [Study Plan Onboarding]

#### [MODIFY] [StudyPlanClient.tsx](file:///f:/aura/aura/app/components/client/StudyPlanClient.tsx) [NEW]
- Wrap `/onboarding/study-plan/page.tsx` and update [StudyTimelineClient.tsx](file:///f:/aura/aura/app/components/study-plan/StudyTimelineClient.tsx), [ProgressCard.tsx](file:///f:/aura/aura/app/components/study-plan/ProgressCard.tsx) to translate "Study Plan", "Track your progress", "Sessions completed", "Days left", etc.

---

### [Instructor & Admin Portals]

#### [MODIFY] [InstructorSidebar.tsx](file:///f:/aura/aura/app/components/InstructorSidebar.tsx)
- Use `useLanguage()` to translate sidebar items: "Course Overview", "Settings", "Curriculum", "Edit Lesson", "Quiz", etc.

#### [MODIFY] [DashboardSidebar.tsx](file:///f:/aura/aura/app/components/DashboardSidebar.tsx)
- Use `useLanguage()` to translate dashboard navigation: "Dashboard", "My Courses", "Analytics", "Manage Students", "System Settings", "Log out", etc.

---

## Verification Plan

### Automated Verification
- Run TypeScript type checks: `npx tsc --noEmit`

### Manual Verification
- Test language toggle **VI ↔ EN** on `/courses/[courseId]`, `/courses/[courseId]/lessons/[lessonId]`, `/courses/[courseId]/progress`, `/onboarding/study-plan`, and `/instructor`.
