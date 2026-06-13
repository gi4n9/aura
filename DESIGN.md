# Aura Learning - Design & Architecture Document

> **AI for Modern Education**  
> *Hệ thống học tập thông minh, tích hợp AI để cá nhân hóa lộ trình và tối ưu hóa trải nghiệm giáo dục của bạn.*

This document serves as the source of truth for Aura Learning's (AlphaQubit) product design, visual identity, terminology, and core architecture, extracted directly from the active codebase.

## 🎯 Core Purpose & Goals
Our goal is to deliver a world-class, highly personalized learning experience. Aura Learning leverages AI to generate dynamic learning paths, context-aware tutoring, and automated assessments, ensuring that students learn effectively at their own pace.

## ✨ Key Features & Terminology

### 1. Dynamic Learning & Roadmaps
- **Courses, Chapters & Lessons**: The core hierarchy of content.
- **Dynamic Roadmaps**: Automatically generates learning paths based on course prerequisites (`UserRoadmap`, `CoursePrerequisite`).
- **Study Schedules**: Users can create customized study plans (`StudySchedule`, `StudyPlanItem`) tailored to their available days and times.
- **Mindmaps & Flashcards**: Visual learning tools integrated directly into lessons, powered by React Flow.

### 2. AI-Powered Education
- **Context-Aware ChatBot**: AI sessions (`ChatSession`) that understand the specific course or lesson the user is currently studying.
- **Video Embeddings & Search**: Vector search (`VideoEmbedding`) across video transcripts to pinpoint exact moments in lessons.
- **Smart Grading**: AI-assisted grading for essay submissions (`Submission`), providing automated scores and detailed feedback.

### 3. Student & Instructor Ecosystem
- **Roles**: `STUDENT`, `INSTRUCTOR`, `ADMIN`.
- **Organizations**: Support for schools and educational centers.
- **Community**: Direct messaging (`Conversation`, `DirectMessage`) between users.
- **Video Progress Tracking**: Highly granular tracking of video watch time, percentage, and completion status (`VideoProgress`).

## 🎨 Visual Identity & Design System

Aura Learning employs a premium, modern aesthetic designed to feel elegant and intuitive:

- **Typography**: 
  - *Headings*: `Playfair Display`, `Georgia`, `serif` (Sang trọng / Elegant)
  - *Body*: `Inter`, `sans-serif` (Hiện đại / Modern)
- **Color Palette (AlphaQubit)**:
  - **Nobel Gold** (`#C5A059`): Used for accents, highlights, and borders.
  - **Nobel Cream** (`#F9F8F4`): A soft, elegant background color.
  - **Nobel Dark** (`#1a1a1a`): Primary text and strong background elements.
- **Component Patterns**: 
  - Glassmorphism (`backdrop-blur-sm bg-white/30`)
  - Subtle borders (`border-stone-800`)
  - Interactive 3D elements (`@react-three/fiber` for hero sections)
  - Radial gradients for depth.

## 📁 Critical Files & Architecture

- **`prisma/schema.prisma`**: The source of truth for all data structures (Profiles, Courses, Progress, AI Chat, Roadmaps).
- **`app/(main)/page.tsx`**: The landing page demonstrating the core value proposition and visual identity.
- **`app/components/`**: Contains reusable UI components, 3D backgrounds (`Hero3D.tsx`), and layout structures.
- **`tailwind.config.ts`**: Houses the core design tokens (`nobel` colors, fonts).

## 🚀 Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication & Storage**: Supabase
- **AI Integration**: AI SDK (Google GenAI, OpenAI, Groq)
- **UI/UX**: Tailwind CSS, Framer Motion, React Three Fiber, React Flow
