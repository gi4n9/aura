"use server";

import { z } from "zod";
import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { QuestionType } from "@prisma/client";

// ============================================
// ZOD VALIDATION SCHEMAS (VIBE PROTOCOL #3)
// ============================================

const questionInputSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1, "Nội dung câu hỏi không được để trống"),
  type: z.enum(["MULTIPLE_CHOICE", "ESSAY"]).default("MULTIPLE_CHOICE"),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  aiExplanation: z.string().nullable().optional(),
  quizSource: z.enum(["AI_VIDEO", "MANUAL", "WORKSHEET"]).default("MANUAL"),
  contentImageUrl: z.string().nullable().optional(),
});

const saveLessonQuestionsSchema = z.object({
  lessonId: z.string().uuid("lessonId phải là UUID hợp lệ"),
  questions: z.array(questionInputSchema).min(1, "Phải có ít nhất 1 câu hỏi"),
});

// ============================================
// TYPE DEFINITIONS (VIBE PROTOCOL #4)
// ============================================

type QuestionInput = z.infer<typeof questionInputSchema>;

// ============================================
// SERVER ACTION (VIBE PROTOCOL #3)
// ============================================

export async function saveLessonQuestions(
  lessonId: string,
  questions: QuestionInput[]
) {
  try {
    // 1. VALIDATE INPUT
    const validated = saveLessonQuestionsSchema.parse({
      lessonId,
      questions,
    });

    // 2. AUTH CHECK (VIBE PROTOCOL #5)
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return {
        success: false,
        error: "Unauthorized - Bạn cần đăng nhập để thực hiện thao tác này",
      };
    }

    // 3. VERIFY LESSON OWNERSHIP (Security check)
    const lesson = await db.lesson.findUnique({
      where: { id: validated.lessonId },
      select: {
        id: true,
        chapter: {
          select: {
            course: {
              select: {
                instructorId: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return {
        success: false,
        error: "Lesson không tồn tại",
      };
    }

    // Check if the authenticated user is the instructor of this course
    // Profile.id maps 1-1 with Supabase auth.users.id
    if (lesson.chapter.course.instructorId !== authUser.id) {
      return {
        success: false,
        error: "Bạn không có quyền chỉnh sửa lesson này",
      };
    }

    // 4. CHECK FOR EXISTING SUBMISSIONS
    const hasSubmission = await db.submission.findFirst({
      where: {
        question: { lessonId: validated.lessonId },
      },
      select: { id: true },
    });

    // 5. HANDLE EXISTING QUESTIONS
    if (!hasSubmission) {
      // No submissions yet - safe to delete old questions
      await db.question.deleteMany({
        where: {
          lessonId: validated.lessonId,
        },
      });
    } else {
      // Has submissions - archive old questions instead
      await db.question.updateMany({
        where: {
          lessonId: validated.lessonId,
          isArchived: false,
        },
        data: {
          isArchived: true,
        },
      });
      console.log(
        `Lesson ${validated.lessonId} đã có bài nộp. Đã archived ${validated.questions.length} câu hỏi cũ.`
      );
    }

    // 6. CREATE NEW QUESTIONS
    if (validated.questions.length > 0) {
      await db.question.createMany({
        data: validated.questions.map((q) => ({
          lessonId: validated.lessonId,
          content: q.content,
          options: q.options || [],
          correctAnswer: q.correctAnswer || null,
          type: q.type as QuestionType,
          aiExplanation: q.aiExplanation || "",
          quizSource: q.quizSource as any,
          contentImageUrl: q.contentImageUrl || null,
          isArchived: false,
        })),
      });
    }

    // 7. REVALIDATE CACHE (VIBE PROTOCOL #8)
    // Only revalidate the specific lesson page, not all courses
    // This prevents excessive GET requests
    revalidatePath(`/instructor/courses`, "layout");

    // 8. RETURN SUCCESS
    return {
      success: true,
      message: `Đã cập nhật ${validated.questions.length} câu hỏi thành công`,
      data: { count: validated.questions.length },
    };
  } catch (error) {
    // 9. ERROR HANDLING (VIBE PROTOCOL #6)
    console.error("❌ Save Questions Error:", error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }

    // Generic error
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Lỗi không xác định khi lưu câu hỏi",
    };
  }
}

// ... (existing code)

// ============================================
// DATA FETCHING (VIBE PROTOCOL #2)
// ============================================

export async function getLessonQuestions(lessonId: string) {
  try {
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: { quizDisplayMode: true }
    });

    const questions = await db.question.findMany({
      where: {
        lessonId,
        isArchived: false,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Format for frontend
    return {
      success: true,
      data: questions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        options: (q.options as string[]) || [],
        correctAnswer: q.correctAnswer || "",
        aiExplanation: q.aiExplanation || "",
        quizSource: q.quizSource,
        contentImageUrl: q.contentImageUrl || "",
      })),
      quizDisplayMode: lesson?.quizDisplayMode || "BOTH"
    };
  } catch (error) {
    console.error("Get Questions Error:", error);
    return { success: false, error: "Lỗi khi tải danh sách câu hỏi" };
  }
}

export type { QuestionInput }; // Export for reuse
