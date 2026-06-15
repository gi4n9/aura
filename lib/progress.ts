import { db } from "@/lib/prisma";

/**
 * Tính toán lại tiến độ tổng thể của một khóa học dựa trên:
 * - 70% từ tiến độ xem Video
 * - 30% từ việc hoàn thành bài tập (Quiz)
 * Nếu bài học không có Quiz, Video chiếm 100%.
 */
export async function recalculateCourseProgress(userId: string, courseId: string) {
  try {
    // 1. Lấy tất cả bài học trong khóa
    const allLessons = await db.lesson.findMany({
      where: { chapter: { courseId: courseId } },
      select: {
        id: true,
        duration: true,
        _count: {
          select: { questions: { where: { isArchived: false } } }
        }
      }
    });

    if (allLessons.length === 0) return 0;

    // 2. Lấy tất cả lịch sử xem video của user trong khóa này
    const allVideoProgress = await db.videoProgress.findMany({
      where: {
        userId: userId,
        lesson: { chapter: { courseId: courseId } }
      },
      select: { lessonId: true, currentTime: true, percentage: true }
    });

    // 3. Lấy tất cả kết quả Quiz của user trong khóa này
    const allQuizResults = await db.quizResult.findMany({
      where: {
        userId: userId,
        courseId: courseId
      },
      select: { lessonId: true, isPassed: true }
    });

    let totalCourseDuration = 0;
    let totalWatchedDuration = 0;
    let hasValidDurations = true;
    let totalProgressWeighted = 0;

    for (const les of allLessons) {
      const hasQuiz = les._count.questions > 0;
      
      // Video Progress %
      let videoPercent = 0;
      const vp = allVideoProgress.find(p => p.lessonId === les.id);
      if (vp) {
        videoPercent = Math.min(vp.percentage, 100);
      }

      // Quiz Progress %
      let quizPercent = 0;
      if (hasQuiz) {
        const qr = allQuizResults.find(q => q.lessonId === les.id);
        if (qr && qr.isPassed) {
          quizPercent = 100;
        }
      }

      // Calculate Lesson Progress
      let lessonProgress = 0;
      if (hasQuiz) {
        lessonProgress = (videoPercent * 0.7) + (quizPercent * 0.3);
      } else {
        lessonProgress = videoPercent;
      }

      // Cộng dồn vào tổng
      if (!les.duration || les.duration === 0) {
        hasValidDurations = false;
      } else {
        totalCourseDuration += les.duration;
      }

      if (les.duration) {
        // Weighted by lesson duration
        totalWatchedDuration += (lessonProgress / 100) * les.duration;
      }
      
      totalProgressWeighted += lessonProgress;
    }

    let newCourseProgress = 0;
    
    // Nếu tất cả bài đều có thời lượng hợp lệ, tính trung bình có trọng số theo thời gian
    if (hasValidDurations && totalCourseDuration > 0) {
      newCourseProgress = Math.round((totalWatchedDuration / totalCourseDuration) * 100);
    } else {
      // Fallback: Tính trung bình cộng đơn thuần của tất cả bài học
      newCourseProgress = Math.round(totalProgressWeighted / allLessons.length);
    }

    // Đảm bảo progress không vượt quá 100
    newCourseProgress = Math.min(Math.max(newCourseProgress, 0), 100);

    // Cập nhật Enrollment
    await db.enrollment.updateMany({
      where: { userId: userId, courseId: courseId },
      data: { progress: newCourseProgress }
    });

    return newCourseProgress;
  } catch (e) {
    console.error("Failed to recalculate course progress:", e);
    return 0;
  }
}
