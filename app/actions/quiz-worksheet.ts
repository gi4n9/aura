"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { extractTextFromPDF, extractTextFromImage, parseQuestionsFromFile } from "@/lib/worksheet-parser";
import { QuizSource, QuestionType, QuizDisplayMode } from "@prisma/client";

export async function processWorksheetUpload(lessonId: string, fileUrl: string, fileType: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify ownership
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { chapter: { include: { course: true } } }
        });

        if (!lesson || lesson.chapter.course.instructorId !== user.id) {
            return { success: false, error: "Không tìm thấy bài học hoặc không có quyền." };
        }

        // Download file content từ Supabase Storage URL
        // Nếu fileUrl là public url từ supabase, fetch nó.
        const response = await fetch(fileUrl);
        if (!response.ok) {
            return { success: false, error: "Không thể tải file từ Storage." };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Bỏ qua bước Tesseract cục bộ, gọi thẳng Gemini Vision
        const parsedQuestions = await parseQuestionsFromFile(buffer, fileType);

        if (parsedQuestions.length === 0) {
            return { success: false, error: "Không tìm thấy câu hỏi nào trong file." };
        }

        // Lưu vào database
        const questionsToCreate = parsedQuestions.map(q => ({
            lessonId,
            content: q.content,
            type: q.type as QuestionType,
            options: q.type === "MULTIPLE_CHOICE" ? q.options || [] : undefined,
            correctAnswer: q.correctAnswer || null,
            quizSource: QuizSource.WORKSHEET,
            timestamp: null
        }));

        await prisma.question.createMany({
            data: questionsToCreate
        });

        revalidatePath(`/instructor/courses/${lesson.chapter.courseId}/chapters/${lesson.chapterId}/lesson/${lessonId}/quiz`);
        revalidatePath(`/courses/${lesson.chapter.courseId}/lessons/${lessonId}`);

        return { 
            success: true, 
            message: `Đã trích xuất thành công ${parsedQuestions.length} câu hỏi.`,
            count: parsedQuestions.length
        };

    } catch (error: any) {
        console.error("Lỗi processWorksheetUpload:", error);
        return { success: false, error: error.message || "Lỗi khi xử lý file phiếu bài tập." };
    }
}

export async function updateQuizDisplayMode(lessonId: string, mode: QuizDisplayMode) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Unauthorized" };

        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { chapter: true }
        });

        if (!lesson) return { success: false, error: "Not found" };

        await prisma.lesson.update({
            where: { id: lessonId },
            data: { quizDisplayMode: mode }
        });

        revalidatePath(`/instructor/courses/${lesson.chapter.courseId}/chapters/${lesson.chapterId}/lesson/${lessonId}/quiz`);
        revalidatePath(`/courses/${lesson.chapter.courseId}/lessons/${lessonId}`);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
