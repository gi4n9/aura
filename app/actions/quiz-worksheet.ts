"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseQuestionsFromFile, parseQuestionsFromFilesBatch, parseAnswerKeyFromImage, parseAnswerKeyFromExcel, ParsedQuestion } from "@/lib/worksheet-parser";
import { QuizSource, QuestionType, QuizDisplayMode } from "@prisma/client";

/**
 * Helper: Lưu danh sách ParsedQuestion vào DB, tạo Passage/SubItem nếu cần
 */
async function saveQuestionsWithRelations(lessonId: string, parsedQuestions: ParsedQuestion[]) {
    // 1. Tạo Passages cho các nhóm đọc hiểu
    const passageMap = new Map<string, string>(); // passageGroupId → DB Passage ID

    for (const q of parsedQuestions) {
        if (q.passageGroupId && q.passageContent && !passageMap.has(q.passageGroupId)) {
            const passage = await prisma.passage.create({
                data: {
                    lessonId,
                    title: q.passageTitle || null,
                    content: q.passageContent
                }
            });
            passageMap.set(q.passageGroupId, passage.id);
        }
    }

    // 2. Tạo Questions (từng câu, không dùng createMany vì cần ID để tạo SubItem)
    const createdQuestions: { dbId: string, parsed: ParsedQuestion }[] = [];

    for (const q of parsedQuestions) {
        const passageId = q.passageGroupId ? passageMap.get(q.passageGroupId) || null : null;

        const created = await prisma.question.create({
            data: {
                lessonId,
                content: q.content,
                type: q.type as QuestionType,
                options: q.type === "MULTIPLE_CHOICE" ? q.options || [] : undefined,
                correctAnswer: q.correctAnswer || null,
                quizSource: QuizSource.WORKSHEET,
                timestamp: null,
                subjectHint: q.subjectHint || null,
                passageId
            }
        });

        createdQuestions.push({ dbId: created.id, parsed: q });
    }

    // 3. Tạo SubItems cho câu hỏi TRUE_FALSE
    for (const { dbId, parsed } of createdQuestions) {
        if (parsed.type === "TRUE_FALSE" && parsed.trueFalseStatements && parsed.trueFalseStatements.length > 0) {
            await prisma.subItem.createMany({
                data: parsed.trueFalseStatements.map((s, idx) => ({
                    questionId: dbId,
                    label: s.label,
                    content: s.statement,
                    isCorrect: s.isCorrect ?? false, // Default false, sẽ được cập nhật khi upload đáp án
                    position: idx
                }))
            });
        }
    }

    return createdQuestions.length;
}

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
        const response = await fetch(fileUrl);
        if (!response.ok) {
            return { success: false, error: "Không thể tải file từ Storage." };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Gọi AI nhận diện đa dạng câu hỏi
        const parsedQuestions = await parseQuestionsFromFile(buffer, fileType);

        if (parsedQuestions.length === 0) {
            return { success: false, error: "Không tìm thấy câu hỏi nào trong file." };
        }

        // Lưu vào database (bao gồm Passage + SubItem)
        const count = await saveQuestionsWithRelations(lessonId, parsedQuestions);

        revalidatePath(`/instructor/courses/${lesson.chapter.courseId}/chapters/${lesson.chapterId}/lesson/${lessonId}/quiz`);
        revalidatePath(`/courses/${lesson.chapter.courseId}/lessons/${lessonId}`);

        // Thống kê các loại câu hỏi
        const typeCounts = parsedQuestions.reduce((acc, q) => {
            acc[q.type] = (acc[q.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const typeLabels: Record<string, string> = {
            MULTIPLE_CHOICE: "trắc nghiệm",
            ESSAY: "tự luận",
            TRUE_FALSE: "đúng/sai",
            FILL_IN_BLANK: "điền khuyết",
            READING_COMPREHENSION: "đọc hiểu"
        };
        const typeSummary = Object.entries(typeCounts)
            .map(([type, cnt]) => `${cnt} ${typeLabels[type] || type}`)
            .join(", ");

        return {
            success: true,
            message: `Đã trích xuất thành công ${count} câu hỏi (${typeSummary}).`,
            count
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

        // Lưu vào database (bao gồm Passage + SubItem)
        const count = await saveQuestionsWithRelations(lessonId, parsedQuestions);

        revalidatePath(`/instructor/courses/${lesson.chapter.courseId}/chapters/${lesson.chapterId}/lesson/${lessonId}/quiz`);
        revalidatePath(`/instructor/courses/${lesson.chapter.courseId}/chapters/${lesson.chapterId}/lesson/${lessonId}`);

        // Thống kê loại câu hỏi
        const typeCounts = parsedQuestions.reduce((acc, q) => {
            acc[q.type] = (acc[q.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const typeLabels: Record<string, string> = {
            MULTIPLE_CHOICE: "trắc nghiệm",
            ESSAY: "tự luận",
            TRUE_FALSE: "đúng/sai",
            FILL_IN_BLANK: "điền khuyết",
            READING_COMPREHENSION: "đọc hiểu"
        };
        const typeSummary = Object.entries(typeCounts)
            .map(([type, cnt]) => `${cnt} ${typeLabels[type] || type}`)
            .join(", ");

        return {
            success: true,
            message: `Đã nhận diện thành công ${count} câu hỏi (${typeSummary}) từ ${files.length} trang.`
        };
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
