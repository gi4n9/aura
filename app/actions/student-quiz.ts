"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface StudentAnswer {
  questionId: string;
  selectedOption: string; // "A", "B", "C", "D"
}

export async function submitQuiz(lessonId: string, answers: StudentAnswer[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Bạn cần đăng nhập để nộp bài." };
  }

  try {
    // 1. Lấy danh sách câu hỏi từ DB
    // 1. Lấy danh sách câu hỏi từ DB
    const questions = await prisma.question.findMany({
      where: {
        lessonId: lessonId,
        isArchived: false,
      },
    });

    // 1.5 Ensure Enrollment Exists
    const lessonInfo = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { chapter: { select: { courseId: true } } }
    });
    
    if (lessonInfo) {
        const courseId = lessonInfo.chapter.courseId;
        const  existingEnroll = await prisma.enrollment.findUnique({
                where: { userId_courseId: { userId: user.id, courseId } }
        });
        if (!existingEnroll) {
                // Determine if we should allow auto-enroll (e.g. check price or just do it because they are here)
                // Assuming access control was handled at page level, so we just fix the record.
                await prisma.enrollment.create({
                    data: { userId: user.id, courseId, progress: 0 }
                });
        }
    }

    let correctCount = 0;
    const feedbackData: any[] = [];
    const submissionsToCreate: any[] = []; // Mảng chứa dữ liệu để lưu 1 lần

    // 2. Tính toán điểm số và chuẩn bị dữ liệu (Xử lý trên RAM - Cực nhanh)
    for (const ans of answers) {
      const question = questions.find((q) => q.id === ans.questionId);
      if (!question) continue;

      // So sánh đáp án
      const isCorrect = question.correctAnswer === ans.selectedOption;
      if (isCorrect) correctCount++;

      // Dữ liệu trả về cho Client (UI)
      feedbackData.push({
        questionId: question.id,
        isCorrect: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.aiExplanation,
      });

      // Dữ liệu để lưu vào DB (Đẩy vào mảng chờ)
      submissionsToCreate.push({
        userId: user.id,
        questionId: question.id,
        answerText: ans.selectedOption,
        score: isCorrect ? 1 : 0,
        feedback: isCorrect ? "Chính xác" : "Sai",
      });
    }

    // 3. Ghi vào Database (Dùng createMany - Chỉ tốn 1 request duy nhất)
    if (submissionsToCreate.length > 0) {
      await prisma.submission.createMany({
        data: submissionsToCreate,
      });
    }

    // 3.5 Update Enrollment Progress
    if (lessonInfo) {
        const courseId = lessonInfo.chapter.courseId;
        
        // Count Total Questions in Course
        const totalCourseQuestions = await prisma.question.count({
             where: { 
                 isArchived: false,
                 lesson: { chapter: { courseId } } 
             }
        });

        // Count Answered Questions (Unique) by User
        // Note: We just created new submissions, so they are included here.
        const userSubmissions = await prisma.submission.findMany({
             where: {
                 userId: user.id,
                 question: { lesson: { chapter: { courseId } } }
             },
             select: { questionId: true },
             distinct: ['questionId']
        });

        const newProgress = totalCourseQuestions > 0 
           ? Math.round((userSubmissions.length / totalCourseQuestions) * 100)
           : 0;

        // Update Enrollment
        // Enrollment record is guaranteed to exist by step 1.5
        try {
            await prisma.enrollment.update({
                where: { userId_courseId: { userId: user.id, courseId } },
                data: { progress: newProgress }
            });
        } catch (e) {
            console.error("Failed to update progress", e);
        }
    }

    // 4. Tính toán kết quả
    const totalQuestions = questions.length;
    const scorePercent =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    if (lessonInfo) {
        revalidatePath(`/courses/${lessonInfo.chapter.courseId}`);
    }
    revalidatePath(`/courses`);

    return {
      success: true,
      score: scorePercent,
      correctCount,
      total: totalQuestions,
      feedback: feedbackData,
    };
  } catch (error: any) {
    console.error("Submit Quiz Error:", error);
    return {
      success: false,
      error: "Có lỗi xảy ra khi nộp bài: " + error.message,
    };
  }
}
