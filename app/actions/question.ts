"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface QuestionInput {
  content: string;
  options: string[];
  correctAnswer: string;
  aiExplanation?: string;
}

export async function saveLessonQuestions(
  lessonId: string,
  questions: QuestionInput[],
) {
  try {
    const hadSumission = await prisma.submission.findFirst({
      where: {
        question: { lessonId: lessonId },
      },
    });

    if (!hadSumission) {
      await prisma.question.deleteMany({
        where: {
          lessonId: lessonId,
        },
      });
    } else {
      await prisma.question.updateMany({
        where: {
          lessonId: lessonId,
          isArchived: false,
        },
        data: {
          isArchived: true,
        },
      });
      console.log(`Lesson ${lessonId} đã có bài nộp, Đã archived câu hỏi cũ.`);
    }

    if (questions.length > 0) {
      await prisma.question.createMany({
        data: questions.map((q) => ({
          lessonId,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          type: "MULTIPLE_CHOICE",
          aiExplanation: q.aiExplanation || "",
          isArchived: false,
        })),
      });
    }

    revalidatePath(`/courses`);
    return { success: true, message: "Đã cập nhật bộ câu hỏi thành công" };
  } catch (error) {
    console.error("Save Questions Error:", error);
    return { success: false, error: "Lỗi khi lưu câu hỏi." };
  }
}
