"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseQuestionsFromFile, parseQuestionsFromFilesBatch, parseAnswerKeyFromImage, parseAnswerKeyFromExcel } from "@/lib/worksheet-parser";
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

export async function processWorksheetUploadBatch(lessonId: string, files: { url: string, type: string }[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Unauthorized" };
        }

        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { chapter: { include: { course: true } } }
        });

        if (!lesson || lesson.chapter.course.instructorId !== user.id) {
            return { success: false, error: "Không tìm thấy bài học hoặc không có quyền." };
        }

        const fileBuffers = [];
        for (const file of files) {
            const response = await fetch(file.url);
            if (!response.ok) {
                console.warn("Failed to fetch file:", file.url);
                continue;
            }
            const arrayBuffer = await response.arrayBuffer();
            fileBuffers.push({ buffer: Buffer.from(arrayBuffer), mimeType: file.type });
        }

        if (fileBuffers.length === 0) {
            return { success: false, error: "Không thể tải các tệp đính kèm." };
        }

        const parsedResult = await parseQuestionsFromFilesBatch(fileBuffers);
        const parsedQuestions = parsedResult.questions;

        if (parsedQuestions.length === 0) {
            return { success: false, error: "Không tìm thấy câu hỏi nào trong các file." };
        }

        // Cập nhật mã đề cho Lesson nếu có
        if (parsedResult.examCode) {
            await prisma.lesson.update({
                where: { id: lessonId },
                data: { examCode: parsedResult.examCode }
            });
        }

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
        revalidatePath(`/instructor/courses/${lesson.chapter.courseId}/chapters/${lesson.chapterId}/lesson/${lessonId}`);

        return { success: true, message: `Đã nhận diện thành công ${questionsToCreate.length} câu hỏi từ ${files.length} trang.` };
    } catch (error: any) {
        console.error("Batch Worksheet upload error:", error);
        return { success: false, error: error.message || "Đã xảy ra lỗi khi xử lý batch." };
    }
}

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
