"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { parseFileUrls } from "@/app/utils/file-utils";
import Tesseract from "tesseract.js";
import {
    getSha256,
    getCachedOcr,
    setCachedOcr,
    countVietnameseChars,
    runWithConcurrencyLimit,
    withTimeout,
    resizeImageIfNeeded
} from "@/lib/ocr-cache";

// ================== 1. UPLOAD ĐÁP ÁN MẪU ==================

export async function uploadModelAnswer(
    questionId: string,
    modelAnswer?: string | null,
    modelAnswerFileUrl?: string | null
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        // Verify ownership
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            include: { lesson: { include: { chapter: { include: { course: true } } } } }
        });

        if (!question || question.lesson.chapter.course.instructorId !== user.id) {
            return { success: false, error: "Không có quyền." };
        }

        await prisma.question.update({
            where: { id: questionId },
            data: {
                modelAnswer: modelAnswer !== undefined ? modelAnswer : undefined,
                modelAnswerFileUrl: modelAnswerFileUrl !== undefined ? modelAnswerFileUrl : undefined
            }
        });

        const courseId = question.lesson.chapter.course.id;
        const chapterId = question.lesson.chapterId;
        const lessonId = question.lessonId;
        revalidatePath(`/instructor/courses/${courseId}/chapters/${chapterId}/lesson/${lessonId}/quiz`);
        revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);

        return { success: true, message: "Đã lưu đáp án mẫu thành công." };
    } catch (error: any) {
        console.error("uploadModelAnswer error:", error);
        return { success: false, error: error.message || "Lỗi khi lưu đáp án mẫu." };
    }
}

// ================== 2. LẤY DANH SÁCH BÀI NỘP TỰ LUẬN ==================

export async function getEssaySubmissions(lessonId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized", data: null };

        // Verify instructor
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { chapter: { include: { course: true } } }
        });

        if (!lesson || lesson.chapter.course.instructorId !== user.id) {
            return { success: false, error: "Không có quyền.", data: null };
        }

        // Lấy câu hỏi tự luận + đọc hiểu
        const essayQuestions = await prisma.question.findMany({
            where: {
                lessonId,
                type: { in: ["ESSAY", "READING_COMPREHENSION"] },
                isArchived: false
            },
            include: {
                passage: true,
                submissions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        return {
            success: true,
            data: essayQuestions.map(q => ({
                id: q.id,
                content: q.content,
                type: q.type,
                modelAnswer: q.modelAnswer,
                modelAnswerFileUrl: q.modelAnswerFileUrl,
                passage: q.passage ? { title: q.passage.title, content: q.passage.content } : null,
                submissions: q.submissions.map(s => ({
                    id: s.id,
                    userId: s.userId,
                    userName: s.user.fullName || s.user.email,
                    userAvatar: s.user.avatarUrl,
                    answerText: s.answerText,
                    fileUrl: s.fileUrl,
                    score: s.score,
                    feedback: s.feedback,
                    gradedAt: s.gradedAt?.toISOString() || null,
                    gradedBy: s.gradedBy,
                    isAiGraded: s.isAiGraded,
                    isFinalized: s.isFinalized,
                    createdAt: s.createdAt.toISOString()
                }))
            }))
        };
    } catch (error: any) {
        console.error("getEssaySubmissions error:", error);
        return { success: false, error: error.message, data: null };
    }
}

// ================== 3. CHẤM ĐIỂM THỦ CÔNG ==================

export async function gradeEssaySubmission(
    submissionId: string,
    score: number,
    feedback: string,
    isFinalized: boolean = true
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        // Verify submission exists & instructor owns it
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                question: {
                    include: { lesson: { include: { chapter: { include: { course: true } } } } }
                }
            }
        });

        if (!submission) return { success: false, error: "Không tìm thấy bài nộp." };
        if (submission.question.lesson.chapter.course.instructorId !== user.id) {
            return { success: false, error: "Không có quyền chấm bài." };
        }

        // Cập nhật submission
        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                score: Math.max(0, Math.min(10, score)), // Clamp 0-10
                feedback,
                gradedAt: new Date(),
                gradedBy: user.id,
                isAiGraded: false,
                isFinalized
            }
        });

        // Recalculate QuizResult nếu cần
        if (isFinalized) {
            try {
                await recalculateQuizResult(
                    submission.userId,
                    submission.question.lessonId,
                    submission.question.lesson.chapter.course.id
                );
            } catch (e) {
                console.error("Failed to recalculate QuizResult:", e);
            }
        }

        const courseId = submission.question.lesson.chapter.course.id;
        const lessonId = submission.question.lessonId;
        revalidatePath(`/instructor/courses/${courseId}`);
        revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);

        return { success: true, message: `Đã chấm ${score}/10 điểm.` };
    } catch (error: any) {
        console.error("gradeEssaySubmission error:", error);
        return { success: false, error: error.message || "Lỗi khi chấm điểm." };
    }
}

// ================== 4. AI GỢI Ý CHẤM ĐIỂM ==================

interface ProcessResult {
    type: "text" | "file" | "both";
    text?: string;
    part?: {
        inlineData: {
            data: string;
            mimeType: string;
        };
    } | null;
}

async function processFileForGrading(url: string): Promise<ProcessResult> {
    try {
        console.log(`🌐 Fetching file attachment from URL: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch file from ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");
        
        let contentType = response.headers.get("content-type") || "";
        contentType = contentType.split(";")[0].trim().toLowerCase();
        
        let isPdf = false;
        let isImage = false;
        let mimeType = contentType;
        
        const pathPart = url.split("?")[0].toLowerCase();
        if (contentType === "application/pdf" || pathPart.endsWith(".pdf")) {
            isPdf = true;
            mimeType = "application/pdf";
        } else if (
            contentType.startsWith("image/") ||
            ["png", "jpg", "jpeg", "webp", "heic", "heif"].some(ext => pathPart.endsWith("." + ext))
        ) {
            isImage = true;
            if (!mimeType.startsWith("image/")) {
                const ext = pathPart.split(".").pop() || "png";
                mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
            }
        }
        
        const hash = getSha256(buffer);
        console.log(`🔑 File hash SHA-256: ${hash}`);
        
        // 1. Kiểm tra Cache từ cơ sở dữ liệu
        const cached = await getCachedOcr(hash);
        if (cached) {
            console.log(`💾 OCR Cache Hit for hash ${hash}`);
            if (cached.type === "pdf") {
                const { textLength, wordCount, vietnameseRatio } = cached;
                if (textLength > 500 && wordCount > 100 && vietnameseRatio > 0.5) {
                    console.log(`✅ Cached PDF text quality is GOOD. Using text only.`);
                    return { type: "text", text: cached.text };
                } else {
                    console.log(`⚠️ Cached PDF text quality is POOR. Falling back to file.`);
                    return {
                        type: "file",
                        part: {
                            inlineData: { data: base64, mimeType: "application/pdf" }
                        }
                    };
                }
            } else if (cached.type === "image") {
                const { confidence, textLength, vietnameseRatio } = cached;
                if (confidence > 80 && textLength > 500 && vietnameseRatio > 0.5) {
                    console.log(`✅ Cached Image OCR confidence is HIGH (${confidence}%). Using text only.`);
                    return { type: "text", text: cached.text };
                } else if (confidence >= 60 && textLength > 200 && vietnameseRatio > 0.4) {
                    console.log(`📝 Cached Image OCR confidence is MEDIUM (${confidence}%). Using BOTH text and image.`);
                    return {
                        type: "both",
                        text: cached.text,
                        part: {
                            inlineData: { data: base64, mimeType }
                        }
                    };
                } else {
                    console.log(`❌ Cached Image OCR confidence is LOW (${confidence}%). Using image only.`);
                    return {
                        type: "file",
                        part: {
                            inlineData: { data: base64, mimeType }
                        }
                    };
                }
            }
        }
        
        console.log(`🆕 Cache Miss for hash ${hash}. Parsing file content...`);
        
        // 2. Xử lý file PDF
        if (isPdf) {
            const pdfParse = require("pdf-parse");
            const parsed = await pdfParse(buffer);
            const text = parsed.text || "";
            const textLength = text.trim().length;
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            const vietnameseRatio = countVietnameseChars(text) / (textLength || 1);
            
            console.log(`📊 PDF statistics: length=${textLength}, words=${wordCount}, vnRatio=${vietnameseRatio.toFixed(2)}`);
            
            // Lưu vào DB Cache
            await setCachedOcr(hash, "pdf", text, { textLength, wordCount, vietnameseRatio });
            
            if (textLength > 500 && wordCount > 100 && vietnameseRatio > 0.5) {
                console.log(`✅ PDF text quality is GOOD. Using text only.`);
                return { type: "text", text };
            } else {
                console.log(`⚠️ PDF text quality is POOR. Falling back to file.`);
                return {
                    type: "file",
                    part: {
                        inlineData: { data: base64, mimeType: "application/pdf" }
                    }
                };
            }
        }
        
        // 3. Xử lý file Ảnh
        if (isImage) {
            // Resize ảnh nếu vượt quá 2500px để tối ưu hiệu năng OCR
            const resizedBuffer = await resizeImageIfNeeded(buffer);
            
            // Chạy Tesseract OCR kèm timeout 15 giây
            const runOcr = async () => {
                const result = await Tesseract.recognize(resizedBuffer, "vie");
                return {
                    text: result.data.text || "",
                    confidence: result.data.confidence || 0
                };
            };
            
            const ocrResult = await withTimeout(
                runOcr(),
                15000,
                { text: "", confidence: 0 }
            );
            
            const textLength = ocrResult.text.trim().length;
            const vietnameseRatio = countVietnameseChars(ocrResult.text) / (textLength || 1);
            
            console.log(`📊 Image OCR statistics: confidence=${ocrResult.confidence}%, length=${textLength}, vnRatio=${vietnameseRatio.toFixed(2)}`);
            
            // Lưu vào DB Cache
            await setCachedOcr(hash, "image", ocrResult.text, {
                confidence: ocrResult.confidence,
                textLength,
                vietnameseRatio
            });
            
            if (ocrResult.confidence > 80 && textLength > 500 && vietnameseRatio > 0.5) {
                console.log(`✅ OCR confidence is HIGH (${ocrResult.confidence}%). Using text only.`);
                return { type: "text", text: ocrResult.text };
            } else if (ocrResult.confidence >= 60 && textLength > 200 && vietnameseRatio > 0.4) {
                console.log(`📝 OCR confidence is MEDIUM (${ocrResult.confidence}%). Using BOTH text and image.`);
                return {
                    type: "both",
                    text: ocrResult.text,
                    part: {
                        inlineData: { data: base64, mimeType }
                    }
                };
            } else {
                console.log(`❌ OCR confidence is LOW (${ocrResult.confidence}%). Using image only.`);
                return {
                    type: "file",
                    part: {
                        inlineData: { data: base64, mimeType }
                    }
                };
            }
        }
        
        // 4. Default fallback cho các file định dạng khác
        return {
            type: "file",
            part: {
                inlineData: { data: base64, mimeType }
            }
        };
        
    } catch (e: any) {
        console.error(`❌ Error in processFileForGrading for ${url}:`, e);
        // Fallback an toàn: Trả về file part gốc không OCR
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const contentType = (response.headers.get("content-type") || "image/png").split(";")[0].trim();
            return {
                type: "file",
                part: {
                    inlineData: { data: base64, mimeType: contentType }
                }
            };
        } catch (innerErr) {
            console.error(`❌ Critical fallback fetch failed:`, innerErr);
            return { type: "file", part: null };
        }
    }
}

export async function aiGradeEssay(submissionId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            include: {
                question: {
                    include: {
                        passage: true,
                        lesson: { include: { chapter: { include: { course: true } } } }
                    }
                }
            }
        });

        if (!submission) return { success: false, error: "Không tìm thấy bài nộp." };
        if (submission.question.lesson.chapter.course.instructorId !== user.id) {
            return { success: false, error: "Không có quyền." };
        }

        const question = submission.question;
        const studentAnswerText = submission.answerText?.trim() || "";
        const studentFileUrls = parseFileUrls(submission.fileUrl);

        if (!studentAnswerText && studentFileUrls.length === 0) {
            return { success: false, error: "Bài nộp không có nội dung văn bản hoặc hình ảnh đính kèm để AI chấm." };
        }

        const passageContent = question.passage?.content || "";

        // Tải và xử lý các file đáp án mẫu (nếu có) và file bài làm học sinh (nếu có)
        const modelAnswerUrls = parseFileUrls(question.modelAnswerFileUrl);
        
        console.log(`🤖 [AI Grading] Starting hybrid processing for Submission ID: ${submissionId}`);

        // Xây dựng các tác vụ song song với giới hạn concurrency là 4
        const studentTasks = studentFileUrls.map((url, idx) => async () => {
            const res = await processFileForGrading(url);
            return { index: idx, result: res };
        });

        const modelTasks = modelAnswerUrls.map((url, idx) => async () => {
            const res = await processFileForGrading(url);
            return { index: idx, result: res };
        });

        const studentResults = await runWithConcurrencyLimit(studentTasks, 4);
        const modelResults = await runWithConcurrencyLimit(modelTasks, 4);

        let studentAttachedText = "";
        const studentImageParts: any[] = [];

        for (const { index, result } of studentResults) {
            const pageHeader = `\n=== TRANG BÀI LÀM ${index + 1} ===\n`;
            if (result.type === "text" && result.text) {
                studentAttachedText += `${pageHeader}${result.text.trim()}\n`;
            } else if (result.type === "both" && result.text) {
                studentAttachedText += `${pageHeader}(Đã trích xuất text OCR bên dưới, đối chiếu thêm với hình ảnh đính kèm)\n${result.text.trim()}\n`;
                if (result.part) {
                    studentImageParts.push(result.part);
                }
            } else if (result.type === "file") {
                studentAttachedText += `${pageHeader}(Nội dung bài làm được nộp bằng file đính kèm hình ảnh/PDF trực tiếp gửi cho AI)\n`;
                if (result.part) {
                    studentImageParts.push(result.part);
                }
            }
        }

        let modelAttachedText = "";
        const modelImageParts: any[] = [];

        for (const { index, result } of modelResults) {
            const pageHeader = `\n=== TRANG ĐÁP ÁN MẪU ${index + 1} ===\n`;
            if (result.type === "text" && result.text) {
                modelAttachedText += `${pageHeader}${result.text.trim()}\n`;
            } else if (result.type === "both" && result.text) {
                modelAttachedText += `${pageHeader}(Đã trích xuất text OCR bên dưới, đối chiếu thêm với đáp án hình ảnh đính kèm)\n${result.text.trim()}\n`;
                if (result.part) {
                    modelImageParts.push(result.part);
                }
            } else if (result.type === "file") {
                modelAttachedText += `${pageHeader}(Nội dung đáp án mẫu được tải lên bằng file hình ảnh/PDF đính kèm trực tiếp gửi cho AI)\n`;
                if (result.part) {
                    modelImageParts.push(result.part);
                }
            }
        }

        // Kết hợp văn bản bài làm của học sinh
        let studentAnswerCombined = studentAnswerText;
        if (studentAttachedText) {
            studentAnswerCombined += (studentAnswerCombined ? "\n\n" : "") + "**Nội dung tài liệu đính kèm trích xuất:**\n" + studentAttachedText;
        }
        if (!studentAnswerCombined) {
            studentAnswerCombined = "(Học sinh nộp bài bằng file đính kèm dưới dạng ảnh/PDF trực tiếp gửi cho AI)";
        }

        // Kết hợp đáp án mẫu
        let modelAnswerCombined = question.modelAnswer || "";
        if (modelAttachedText) {
            modelAnswerCombined += (modelAnswerCombined ? "\n\n" : "") + "**Nội dung đáp án mẫu đính kèm trích xuất:**\n" + modelAttachedText;
        }
        if (!modelAnswerCombined) {
            modelAnswerCombined = "(Không có đáp án mẫu — hãy đánh giá dựa trên chất lượng nội dung.)";
        }

        // Build prompt
        const prompt = buildAiGradingPrompt({
            questionContent: question.content,
            passageContent,
            modelAnswer: modelAnswerCombined,
            studentAnswer: studentAnswerCombined,
            questionType: question.type
        });

        // Gọi AI (dùng Gemini)
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3
            }
        });

        // Tạo mảng content chứa text prompt và các file base64 cần thiết (đáp án mẫu và bài làm của học sinh)
        const contentParts = [prompt, ...modelImageParts, ...studentImageParts];
        
        console.log(`🧠 Calling Gemini 2.5 Flash with ${contentParts.length - 1} attachments (remaining files after hybrid OCR)...`);
        
        const result = await model.generateContent(contentParts);
        const responseText = result.response.text();

        let parsed: { score: number; feedback: string };
        try {
            parsed = JSON.parse(responseText);
        } catch {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 5, feedback: "AI không thể phân tích bài làm." };
        }

        const aiScore = Math.max(0, Math.min(10, parsed.score || 0));
        const aiFeedback = parsed.feedback || "Không có nhận xét.";

        // Lưu kết quả AI (chưa finalized)
        await prisma.submission.update({
            where: { id: submissionId },
            data: {
                score: aiScore,
                feedback: aiFeedback,
                gradedAt: new Date(),
                gradedBy: null,
                isAiGraded: true,
                isFinalized: false
            }
        });

        const courseId = submission.question.lesson.chapter.course.id;
        const lessonId = submission.question.lessonId;
        revalidatePath(`/instructor/courses/${courseId}`);
        revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);

        return {
            success: true,
            suggestedScore: aiScore,
            suggestedFeedback: aiFeedback,
            message: `AI gợi ý: ${aiScore}/10 điểm.`
        };
    } catch (error: any) {
        console.error("aiGradeEssay error:", error);
        return { success: false, error: error.message || "Lỗi khi gọi AI chấm điểm." };
    }
}

// ================== HELPERS ==================

function buildAiGradingPrompt(params: {
    questionContent: string;
    passageContent: string;
    modelAnswer: string;
    studentAnswer: string;
    questionType: string;
}): string {
    const { questionContent, passageContent, modelAnswer, studentAnswer, questionType } = params;

    const passageSection = passageContent
        ? `\n**Ngữ liệu đọc hiểu:**\n${passageContent}\n`
        : "";

    const modelAnswerSection = modelAnswer
        ? `\n**Đáp án mẫu / Hướng dẫn chấm:**\n${modelAnswer}\n`
        : "\n(Không có đáp án mẫu — hãy đánh giá dựa trên chất lượng nội dung.)\n";

    return `
Bạn là một giáo viên Ngữ văn dày dặn kinh nghiệm, đang chấm bài thi cho học sinh THPT Việt Nam.

**Loại câu hỏi:** ${questionType === "READING_COMPREHENSION" ? "Đọc hiểu" : "Tự luận (Nghị luận)"}
${passageSection}
**Câu hỏi:**
${questionContent}
${modelAnswerSection}
**Bài làm của học sinh:**
${studentAnswer}

---

**Yêu cầu:**
1. Chấm điểm trên thang **0-10** (có thể dùng số thập phân, VD: 7.5).
2. Đưa ra nhận xét chi tiết bằng tiếng Việt:
   - Điểm mạnh của bài làm
   - Điểm yếu / thiếu sót
   - Gợi ý cải thiện
3. Nếu có đáp án mẫu, so sánh bài làm với đáp án mẫu.
4. Đánh giá các tiêu chí: Nội dung (đúng/đủ ý), Diễn đạt (mạch lạc, logic), Sáng tạo, Chính tả/Ngữ pháp.

**Trả về JSON:**
{
  "score": <số từ 0-10>,
  "feedback": "<nhận xét chi tiết bằng Markdown>"
}
`;
}

async function recalculateQuizResult(userId: string, lessonId: string, courseId: string) {
    // Lấy tất cả submissions đã finalized cho lesson này
    const submissions = await prisma.submission.findMany({
        where: { userId, question: { lessonId, isArchived: false } },
        include: { question: { include: { subItems: true } } }
    });

    let totalScore = 0;
    let maxPossible = 0;
    let fullyCorrect = 0;

    for (const sub of submissions) {
        const q = sub.question;

        if (q.type === "ESSAY" || q.type === "READING_COMPREHENSION") {
            // Thang 10 → quy về thang 1
            if (sub.isFinalized && sub.score != null) {
                maxPossible += 1;
                const normalizedScore = sub.score / 10; // 0-10 → 0-1
                totalScore += normalizedScore;
                if (normalizedScore >= 0.8) fullyCorrect++;
            }
            // Chưa finalized → không tính vào tổng
        } else if (q.type === "MULTIPLE_CHOICE") {
            maxPossible += 1;
            if (sub.score === 1) { totalScore += 1; fullyCorrect++; }
        } else if (q.type === "FILL_IN_BLANK") {
            maxPossible += 1;
            if (sub.score === 1) { totalScore += 1; fullyCorrect++; }
        } else if (q.type === "TRUE_FALSE") {
            maxPossible += 1;
            if (sub.score != null) {
                totalScore += sub.score;
                if (sub.score === 1) fullyCorrect++;
            }
        }
    }

    const scorePercent = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
    const isPassed = scorePercent >= 80;

    await prisma.quizResult.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
            score: scorePercent,
            totalQuestions: Math.round(maxPossible),
            correctAnswers: fullyCorrect,
            isPassed,
            lastAttemptAt: new Date()
        },
        create: {
            userId,
            lessonId,
            courseId,
            score: scorePercent,
            totalQuestions: Math.round(maxPossible),
            correctAnswers: fullyCorrect,
            isPassed,
            attemptCount: 1
        }
    });
}
