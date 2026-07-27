# 🛠️ Community Group Chat & Instructor Invitation System — Walkthrough

## What Was Implemented

1. **Database Schema ([schema.prisma](file:///f:/aura/aura/prisma/schema.prisma))**:
   - `GroupCourseLink`: Many-to-many relationship supporting groups linked to multiple courses.
   - `GroupInvitation`: Tracks group invitations (`PENDING`, `ACCEPTED`, `DECLINED`) sent from students to instructors or vice versa.
   - Synced directly to PostgreSQL database via `prisma db push`.

2. **Server Actions ([community-actions.ts](file:///f:/aura/aura/app/actions/community-actions.ts))**:
   - `createGroup`: Creates a community group chat with optional multi-course links, public/private settings, and automated instructor invitations upon creation.
   - `inviteInstructorToGroup`: Allows members to invite instructors of linked courses into their study group.
   - `getMyInvitations`: Fetches pending invitations for instructors.
   - `respondToInvitation`: Handles accepting (adding instructor as `ADMIN`) or declining group invitations.
   - `searchGroups`: Full-text/contains search for public groups by name, description, or course title.

3. **Student UI — Create Group Modal ([CreateGroupModal.tsx](file:///f:/aura/aura/app/components/community/CreateGroupModal.tsx))**:
   - Popup modal on `/community` allowing students (and instructors) to:
     - Name their group & provide descriptions.
     - Select one or multiple enrolled courses to link.
     - Toggle between Public & Private visibility.
     - Auto-invite instructors of all linked courses upon creation.

4. **Instructor UI — Invitation Management & Group Creation ([InstructorMessagesClient.tsx](file:///f:/aura/aura/app/%28instructor%29/instructor/messages/InstructorMessagesClient.tsx))**:
   - Added **"Lời mời" (Invitations)** tab showing pending group invites from students, with instant Accept/Decline action buttons.
   - Added **"Tạo nhóm"** button in instructor portal allowing instructors to create public/private study groups for their published courses.

---

## Verification
- ✅ **Database**: `prisma db push` — synchronized successfully.
- ✅ **TypeScript**: `npx tsc --noEmit` — 0 errors.
- ✅ **Student & Instructor Workflows**: Full group creation, multi-course linking, instructor invitation, and invitation acceptance/decline flow completed.
