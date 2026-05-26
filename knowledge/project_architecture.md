# AuraStreaming - Project Architecture & Implementation Log

> **IMPORTANT: Doc-First Workflow**
> Before implementing any new feature, creating separate docs here or updating this file is MANDATORY.
> 1.  **Research & Plan**: Create/Update doc in `knowledge/` recording reasoning, decisions, and flow.
> 2.  **Refer**: Link the doc in user prompt via `@doc/...`.
> 3.  **Code**: Implement based on the documented plan.

## 1. Project Overview
**AuraStreaming** is an educational platform (LMS) enabling Instructors to create courses and Students to learn via video lessons, quizzes, and live interaction.

### Tech Stack
*   **Framework**: Next.js 14+ (App Router).
*   **Language**: TypeScript.
*   **Database**: PostgreSQL (via Supabase).
*   **ORM**: Prisma.
*   **Styling**: Tailwind CSS (v4).
*   **Auth**: Supabase Auth (SSR).
*   **Payment**: MoMo Payment Gateway.
*   **AI/LLM**: Google Gemini (integrated for content generation/chat).

---

## 2. Core Modules & Implementation Details

### 2.1 authentication & Roles (RBAC)
*   **Provider**: Supabase Auth.
*   **Roles**: Defined in Prisma `UserRole` enum (`STUDENT`, `INSTRUCTOR`, `ADMIN`).
*   **Profile**: Automatically created via Trigger allows mapping `auth.users.id` to public `Profile` table.
*   **Middleware**: Protected routes check for session existence. Role checks are implemented per-page or server action.

### 2.2 Course Management (Instructor)
*   **Structure**: `Course` -> `Chapter` -> `Lesson` -> `Question`.
*   **Logic - Free vs Paid**:
    *   Price managed via `price` (Decimal) and `isFree` (Boolean).
    *   **Rule**: `isFree` MUST allow be synced with price. If `price == 0`, `isFree = true`. This logic is enforced in `services/courses/courses.ts` (creation) and `app/actions/course.ts` (update).
*   **Status Workflow**: `DRAFT` -> `PUBLISHED` -> `ARCHIVED`.

### 2.3 Access Control & Enrollment (Student)
*   **Source of Truth**: `Enrollment` table (`userId` + `courseId` unique).
*   **Access Logic** (`app/(learning)/courses/[courseId]/lessons/[lessonsId]/page.tsx`):
    1.  User visits Lesson Page.
    2.  Check Login status.
    3.  Check `Enrollment` record.
    4.  If **Enrolled**: Show content.
    5.  If **Not Enrolled**:
        *   If `Course.isFree` (or price 0): **Auto-enroll** immediately and show content.
        *   If `Course.price > 0`: **Redirect** to Course Detail page for purchase.

### 2.4 Payment System (MoMo Integration)
*   **Flow**:
    1.  User clicks "Mua ngay" (Client Component `CourseActionButtons`).
    2.  Server Action `purchaseCourse` (`app/actions/enrollment.ts`):
        *   Creates `Purchase` record (Status: `PENDING`).
        *   Calls MoMo API to get `payUrl`.
        *   Returns `payUrl` to client.
    3.  **Payment**: User pays on MoMo App/Web.
    4.  **Handling Result (Dual Strategy)**:
        *   **IPN (Server-to-Server)**: `api/payment/momo-ipn`. Updates `Purchase` -> `COMPLETED` and creates `Enrollment`. Requires Public URL (Ngrok).
        *   **Return URL (Immediate)**: `api/payment/return`. User is redirected back here. Function verifies signature, updates DB immediately (Idempotent upsert), and redirects to Course Page. This allows **Localhost Testing** without Ngrok.
*   **Environment Variables Required**:
    *   `MOMO_PARTNER_CODE`
    *   `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`
    *   `MOMO_API_ENDPOINT`
    *   `MOMO_IPN_URL` (For prod)

### 2.5 Real-time Chat System
*   **Architecture**: Edge Functions + Supabase Realtime (future).
*   **Optimistic UI**: Client adds message immediately to UI state.
*   **Edge Function**: `supabase/functions/send-message`. Runs on Deno.
    *   Pros: Lower cold start than Serverless, closer to user.
    *   Fallbacks: If Edge fails, UI retries using Next.js Server Action.

---

## 3. Database Schema Highlights
See `prisma/schema.prisma` for full details.

*   `Profile`: 1-1 with Auth User.
*   `Course`: Central entity. Has `price` & `isFree`.
*   `Chapter` & `Lesson`: Content hierarchy. `Lesson` has `videoProgress`.
*   `Enrollment`: Tracks access. Join table between `Profile` and `Course`.
*   `Purchase`: Tracks history transactions. Validates Enrollment.
*   `VideoProgress`: Tracks watch time percentages.

---

## 4. Work in Progress / Next Steps
*   **Testing**: Payment flow needs manual verification on UAT.
*   **Refactor**: Ensure `isFree` logic is consistent across all potential update points.
*   **Features**:
    *   Video Streaming Optimization.
    *   Real-time notifications.
    *   Admin Dashboard.

## 5. Configuration & Environment
### 5.1 Image Domains (Next.js Config)
*   **Supabase Storage**: `jeauhbdwsdwovrdovrre.supabase.co` (Current),
*   **External**: `img.youtube.com`, `i.ytimg.com`, `lh3.googleusercontent.com`, `api.dicebear.com`.

