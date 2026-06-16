"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface StudentAnswer {
  questionId: string;
  selectedOption?: string; // "A", "B", "C", "D" (cho trắc nghiệm)
  answerText?: string; // Câu trả lời văn bản (cho tự luận)
  fileUrl?: string; // Link file (cho tự luận)
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

      // So sánh đáp án (Chỉ tính cho trắc nghiệm)
      const isMultipleChoice = question.type === "MULTIPLE_CHOICE";
      const isCorrect = isMultipleChoice && question.correctAnswer === ans.selectedOption;
      
      if (isCorrect) correctCount++;

      // Dữ liệu trả về cho Client (UI)
      feedbackData.push({
        questionId: question.id,
        isCorrect: isMultipleChoice ? isCorrect : true, // Tự luận luôn pass
        correctAnswer: question.correctAnswer,
        explanation: question.aiExplanation,
      });

      // Dữ liệu để lưu vào DB (Đẩy vào mảng chờ)
      submissionsToCreate.push({
        userId: user.id,
        questionId: question.id,
        answerText: isMultipleChoice ? ans.selectedOption : ans.answerText,
        fileUrl: ans.fileUrl,
        score: isMultipleChoice ? (isCorrect ? 1 : 0) : null,
        feedback: isMultipleChoice ? (isCorrect ? "Chính xác" : "Sai") : "Đã ghi nhận bài nộp tự luận",
      });
    }

    // 3. Ghi vào Database (Dùng createMany - Chỉ tốn 1 request duy nhất)
    if (submissionsToCreate.length > 0) {
      await prisma.submission.createMany({
        data: submissionsToCreate,
      });
    }

    // 3.5 Update QuizResult & Course Progress
    if (lessonInfo) {
        const courseId = lessonInfo.chapter.courseId;
        // Tính điểm tổng (Chỉ tính số câu trắc nghiệm)
        const mcQuestions = questions.filter(q => q.type === "MULTIPLE_CHOICE");
        const totalMcQuestions = mcQuestions.length;
        const score = totalMcQuestions > 0 ? (correctCount / totalMcQuestions) * 100 : 100; // Nếu toàn tự luận thì mặc định 100
        const isPassed = score >= 80; // Pass nếu đúng từ 80% trở lên (hoặc tuỳ chọn)

        // Lưu QuizResult
        try {
            await prisma.quizResult.upsert({
                where: {
                    userId_lessonId: { userId: user.id, lessonId }
                },
                update: {
                    score,
                    totalQuestions: totalMcQuestions,
                    correctAnswers: correctCount,
                    isPassed,
                    attemptCount: { increment: 1 },
                    lastAttemptAt: new Date()
                },
                create: {
                    userId: user.id,
                    lessonId,
                    courseId,
                    score,
                    totalQuestions: mcQuestions.length,
                    correctAnswers: correctCount,
                    isPassed,
                    attemptCount: 1
                }
            });
        } catch (e) {
            console.error("Failed to upsert QuizResult", e);
        }

        // Cập nhật lại tiến độ tổng khóa học sau khi nộp bài
        try {
            const { recalculateCourseProgress } = await import('@/lib/progress');
            await recalculateCourseProgress(user.id, courseId);
            
            // Revalidate để UI cập nhật lại thanh progress
            const { revalidatePath } = await import('next/cache');
            revalidatePath(`/courses/${courseId}`, 'layout');
        } catch (e) {
            console.error("Failed to update course progress from quiz", e);
        }

        // 3.6 Update Study Plan Item
        try {
            await prisma.studyPlanItem.updateMany({
                where: { 
                    userId: user.id,
                    lessonId: lessonId
                },
                data: { isCompleted: true }
            });
            revalidatePath("/onboarding/study-plan");
        } catch (e) {
            console.error("Failed to update study plan item", e);
        }
    }

    // 4. Tính toán kết quả
    const mcQuestions = questions.filter(q => q.type === "MULTIPLE_CHOICE");
    const totalMcQuestions = mcQuestions.length;
    const scorePercent = totalMcQuestions > 0
        ? Math.round((correctCount / totalMcQuestions) * 100)
        : 100;

    // 5. [NEW] Upsert QuizResult - Lưu kết quả tổng hợp
    if (lessonInfo) {
        const courseId = lessonInfo.chapter.courseId;
        const isPassed = scorePercent >= 80; // Ngưỡng đạt 80%

        // Tìm kết quả cũ
        const existingResult = await prisma.quizResult.findUnique({
            where: {
                userId_lessonId: {
                    userId: user.id,
                    lessonId: lessonId
                }
            }
        });

        if (existingResult) {
            // Chỉ cập nhật nếu điểm cao hơn
            if (scorePercent > existingResult.score) {
                await prisma.quizResult.update({
                    where: { id: existingResult.id },
                    data: {
                        score: scorePercent,
                        correctAnswers: correctCount,
                        totalQuestions: totalMcQuestions,
                        isPassed: isPassed || existingResult.isPassed, // Nếu đã pass thì giữ nguyên
                        lastAttemptAt: new Date(),
                        attemptCount: { increment: 1 }
                    }
                });
            } else {
                // Nếu điểm thấp hơn, chỉ cập nhật lầt attempt và thời gian
                await prisma.quizResult.update({
                    where: { id: existingResult.id },
                    data: {
                        lastAttemptAt: new Date(),
                        attemptCount: { increment: 1 }
                    }
                });
            }
        } else {
            // Tạo mới
            await prisma.quizResult.create({
                data: {
                    userId: user.id,
                    lessonId: lessonId,
                    courseId: courseId,
                    score: scorePercent,
                    correctAnswers: correctCount,
                    totalQuestions: totalMcQuestions,
                    isPassed: isPassed,
                    attemptCount: 1,
                    lastAttemptAt: new Date()
                }
            });
        }
    }

    if (lessonInfo) {
        revalidatePath(`/courses/${lessonInfo.chapter.courseId}`);
    }
    revalidatePath(`/courses`);

    return {
      success: true,
      score: scorePercent,
      correctCount,
      total: totalMcQuestions,
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
