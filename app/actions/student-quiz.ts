"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface StudentAnswer {
  questionId: string;
  selectedOption?: string; // "A", "B", "C", "D" (cho trắc nghiệm)
  answerText?: string; // Câu trả lời văn bản (cho tự luận/điền khuyết)
  fileUrl?: string; // Link file (cho tự luận)
  subItemAnswers?: Record<string, boolean>; // (cho Đúng/Sai)
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
      include: {
        subItems: true
      }
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

    let totalScore = 0;
    let maxPossibleScore = 0;
    let fullyCorrectCount = 0; // Số câu hỏi lấy trọn điểm 1.0

    const feedbackData: any[] = [];
    const submissionsToCreate: any[] = []; // Mảng chứa dữ liệu để lưu 1 lần

    // 2. Tính toán điểm số và chuẩn bị dữ liệu (Xử lý trên RAM - Cực nhanh)
    for (const ans of answers) {
      const question = questions.find((q) => q.id === ans.questionId);
      if (!question) continue;

      let questionPoints = 0;
      let qMaxPoints = 0;
      let isCorrect = false;
      let fbText = "Đã ghi nhận bài nộp tự luận";
      let subItemFeedback: Record<string, { isCorrect: boolean }> = {};

      const hasOptions = (question.type === "MULTIPLE_CHOICE") || (Array.isArray(question.options) && (question.options as any[]).length > 0);

      if (hasOptions) {
        qMaxPoints = 1;
        isCorrect = question.correctAnswer?.trim().toUpperCase() === ans.selectedOption?.trim().toUpperCase();
        if (isCorrect) questionPoints = 1;
        fbText = isCorrect ? "Chính xác" : "Sai";
      } 
      else if (question.type === "FILL_IN_BLANK") {
        qMaxPoints = 1;
        if (question.correctAnswer) {
          const normalizedCorrect = question.correctAnswer.trim().toLowerCase();
          const normalizedAnswer = (ans.answerText || "").trim().toLowerCase();
          isCorrect = normalizedCorrect === normalizedAnswer;
          if (isCorrect) questionPoints = 1;
          fbText = isCorrect ? "Chính xác" : "Sai";
        }
      } 
      else if (question.type === "TRUE_FALSE") {
        qMaxPoints = 1; // Điểm tối đa cho 1 câu hỏi chùm
        let subCorrectCount = 0;
        
        if (question.subItems && ans.subItemAnswers) {
            for (const sub of question.subItems) {
                const studentAns = ans.subItemAnswers[sub.id];
                const isSubCorrect = studentAns === sub.isCorrect;
                if (isSubCorrect) subCorrectCount++;
                subItemFeedback[sub.id] = { isCorrect: isSubCorrect };
            }
        }
        
        // Barem GDPT 2025
        if (subCorrectCount === 1) questionPoints = 0.1;
        else if (subCorrectCount === 2) questionPoints = 0.25;
        else if (subCorrectCount === 3) questionPoints = 0.5;
        else if (subCorrectCount >= 4) questionPoints = 1.0;
        
        isCorrect = questionPoints === 1.0;
        fbText = `Bạn đúng ${subCorrectCount}/${question.subItems?.length || 4} ý. (+${questionPoints} điểm)`;
      }
      else if (question.type === "ESSAY" || question.type === "READING_COMPREHENSION") {
        // Tự luận: KHÔNG chấm điểm tự động, chờ giảng viên/AI
        qMaxPoints = 0; // Không tính vào maxPossibleScore (chưa có điểm)
        questionPoints = 0;
        isCorrect = true; // Luôn "pass" để UI không hiện X đỏ
        fbText = "⏳ Bài tự luận đang chờ giảng viên chấm điểm";
      }

      totalScore += questionPoints;
      maxPossibleScore += qMaxPoints;
      if (questionPoints === 1.0) fullyCorrectCount++;

      const isPending = (question.type === "ESSAY" || question.type === "READING_COMPREHENSION") && !hasOptions;

      // Dữ liệu trả về cho Client (UI)
      feedbackData.push({
        questionId: question.id,
        isCorrect: isPending ? true : isCorrect,
        correctAnswer: question.correctAnswer,
        modelAnswer: question.modelAnswer,
        modelAnswerFileUrl: question.modelAnswerFileUrl,
        explanation: question.aiExplanation,
        subItemFeedback: Object.keys(subItemFeedback).length > 0 ? subItemFeedback : undefined,
        isPendingGrading: isPending
      });

      // Dữ liệu để lưu vào DB (Đẩy vào mảng chờ)
      submissionsToCreate.push({
        userId: user.id,
        questionId: question.id,
        answerText: ans.answerText || ans.selectedOption || JSON.stringify(ans.subItemAnswers),
        fileUrl: ans.fileUrl,
        score: isPending ? null : (qMaxPoints > 0 ? questionPoints : null),
        feedback: fbText,
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
        // Điểm số theo %
        const scorePercent = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 100;
        const isPassed = scorePercent >= 80;

        // Lưu QuizResult
        try {
            await prisma.quizResult.upsert({
                where: {
                    userId_lessonId: { userId: user.id, lessonId }
                },
                update: {
                    score: scorePercent,
                    totalQuestions: Math.round(maxPossibleScore), // Lấy đại diện
                    correctAnswers: fullyCorrectCount,
                    isPassed,
                    attemptCount: { increment: 1 },
                    lastAttemptAt: new Date()
                },
                create: {
                    userId: user.id,
                    lessonId,
                    courseId,
                    score: scorePercent,
                    totalQuestions: Math.round(maxPossibleScore),
                    correctAnswers: fullyCorrectCount,
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
    const scorePercent = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 100;

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
                        correctAnswers: fullyCorrectCount,
                        totalQuestions: Math.round(maxPossibleScore),
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
                    correctAnswers: fullyCorrectCount,
                    totalQuestions: Math.round(maxPossibleScore),
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
      correctCount: totalScore, // For backward compatibility or display
      total: maxPossibleScore,
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
