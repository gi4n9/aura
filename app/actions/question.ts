"use server";

import { z } from "zod";
import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { QuestionType } from "@prisma/client";

// ============================================
// ZOD VALIDATION SCHEMAS (VIBE PROTOCOL #3)
// ============================================

const subItemSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  content: z.string(),
  isCorrect: z.boolean(),
  position: z.number().default(0)
});

const passageSchema = z.object({
  id: z.string().optional(),
  title: z.string().nullable().optional(),
  content: z.string()
});

const questionInputSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1, "Nội dung câu hỏi không được để trống"),
  type: z.enum(["MULTIPLE_CHOICE", "ESSAY", "TRUE_FALSE", "FILL_IN_BLANK", "READING_COMPREHENSION"]).default("MULTIPLE_CHOICE"),
  options: z.array(z.string()).nullable().optional(),
  correctAnswer: z.string().nullable().optional(),
  modelAnswer: z.string().nullable().optional(),
  aiExplanation: z.string().nullable().optional(),
  quizSource: z.enum(["AI_VIDEO", "MANUAL", "WORKSHEET"]).default("MANUAL"),
  contentImageUrl: z.string().nullable().optional(),
  subItems: z.array(subItemSchema).optional(),
  passage: passageSchema.optional().nullable(),
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
      // Xóa Passages cũ trước (vì SubItem tự cascade theo Question)
      await db.passage.deleteMany({
        where: { lessonId: validated.lessonId },
      });
      await db.question.deleteMany({
        where: {
          lessonId: validated.lessonId,
        },
      });
    } else {
      await db.question.updateMany({
        where: {
          lessonId: validated.lessonId,
          isArchived: false,
        },
        data: {
          isArchived: true,
        },
      });
    }

    // 6. CREATE NEW QUESTIONS (Tạo tuần tự để xử lý nested Passages và SubItems)
    if (validated.questions.length > 0) {
      // Để tránh tạo trùng Passage (nếu các câu hỏi chia sẻ chung content), dùng Map
      const passageMap = new Map<string, string>(); // passage.content -> passage.id

      for (const q of validated.questions) {
        let passageId = null;

        if (q.passage && q.passage.content) {
          const passageKey = q.passage.content.trim();
          if (passageMap.has(passageKey)) {
            passageId = passageMap.get(passageKey);
          } else {
            const newPassage = await db.passage.create({
              data: {
                lessonId: validated.lessonId,
                title: q.passage.title || null,
                content: q.passage.content,
              }
            });
            passageId = newPassage.id;
            passageMap.set(passageKey, passageId);
          }
        }

        await db.question.create({
          data: {
            lessonId: validated.lessonId,
            content: q.content,
            options: q.options || [],
            correctAnswer: q.correctAnswer || null,
            modelAnswer: q.modelAnswer || null,
            type: q.type as QuestionType,
            aiExplanation: q.aiExplanation || "",
            quizSource: q.quizSource as any,
            contentImageUrl: q.contentImageUrl || null,
            isArchived: false,
            passageId: passageId,
            subItems: q.subItems && q.subItems.length > 0 ? {
              create: q.subItems.map((si, idx) => ({
                label: si.label,
                content: si.content,
                isCorrect: si.isCorrect,
                position: si.position ?? idx
              }))
            } : undefined
          }
        });
      }
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
      include: {
        subItems: {
          orderBy: { position: 'asc' }
        },
        passage: true
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
        modelAnswer: q.modelAnswer || "",
        aiExplanation: q.aiExplanation || "",
        quizSource: q.quizSource,
        contentImageUrl: q.contentImageUrl || "",
        subItems: q.subItems,
        passage: q.passage ? {
          id: q.passage.id,
          title: q.passage.title,
          content: q.passage.content
        } : null
      })),
      quizDisplayMode: lesson?.quizDisplayMode || "BOTH"
    };
  } catch (error) {
    console.error("Get Questions Error:", error);
    return { success: false, error: "Lỗi khi tải danh sách câu hỏi" };
  }
}

export type { QuestionInput }; // Export for reuse
