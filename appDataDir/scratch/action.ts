import { parseAnswerKeyFromImage, parseAnswerKeyFromExcel } from "@/lib/worksheet-parser";

export async function processAnswerKeyUpload(lessonId: string, fileUrl: string, fileType: string, providedExamCode?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Unauthorized" };

        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { chapter: { include: { course: true } } }
        });

        if (!lesson || lesson.chapter.course.instructorId !== user.id) {
            return { success: false, error: "Không tìm thấy bài học hoặc không có quyền." };
        }

        const targetExamCode = providedExamCode || lesson.examCode || null;

        const response = await fetch(fileUrl);
        if (!response.ok) return { success: false, error: "Không thể tải file đáp án." };
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let parsedAnswers: Record<string, string> = {};
        if (fileType.includes("excel") || fileType.includes("spreadsheet") || fileType.includes("sheet")) {
            parsedAnswers = await parseAnswerKeyFromExcel(buffer, targetExamCode);
        } else if (fileType.startsWith("image/")) {
            parsedAnswers = await parseAnswerKeyFromImage(buffer, fileType, targetExamCode);
        } else {
            return { success: false, error: "Định dạng file đáp án không được hỗ trợ (Chỉ hỗ trợ Ảnh và Excel)." };
        }

        if (Object.keys(parsedAnswers).length === 0) {
            return { success: false, error: "Không tìm thấy đáp án nào hợp lệ cho mã đề này." };
        }

        const questions = await prisma.question.findMany({
            where: { lessonId, quizSource: { in: ["WORKSHEET", "MANUAL"] } },
            orderBy: { createdAt: 'asc' }
        });

        let updatedCount = 0;
        for (const [key, answer] of Object.entries(parsedAnswers)) {
            const index = parseInt(key, 10) - 1;
            if (index >= 0 && index < questions.length) {
                const q = questions[index];
                await prisma.question.update({
                    where: { id: q.id },
                    data: { correctAnswer: answer }
                });
                updatedCount++;
            }
        }

        revalidatePath(`/instructor/courses/${lesson.chapter.courseId}/chapters/${lesson.chapterId}/lesson/${lessonId}/quiz`);
        revalidatePath(`/courses/${lesson.chapter.courseId}/lessons/${lessonId}`);

        return { success: true, message: `Đã cập nhật thành công đáp án cho ${updatedCount} câu hỏi.` };
    } catch (error: any) {
        console.error("Lỗi processAnswerKeyUpload:", error);
        return { success: false, error: error.message || "Lỗi khi xử lý file đáp án." };
    }
}
