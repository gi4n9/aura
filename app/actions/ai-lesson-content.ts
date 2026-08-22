"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI, SchemaType, Schema, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { off } from "process";
import Groq from "groq-sdk";
import { callLocalGeminiJSON } from "@/lib/local-gemini";

// Initialize Gemini & Groq
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// --- SCHEMAS (Native Google AI Format) ---

// Mindmap Schema for Gemini
const mindmapSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        root: {
            type: SchemaType.OBJECT,
            properties: {
                name: { type: SchemaType.STRING, description: "The main topic name" },
                timestamp: { type: SchemaType.NUMBER, description: "Video timestamp in seconds" },
                children: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING, description: "Subtopic name" },
                            timestamp: { type: SchemaType.NUMBER, description: "Video timestamp in seconds" },
                            children: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        name: { type: SchemaType.STRING, description: "Detail name" },
                                        timestamp: { type: SchemaType.NUMBER, description: "Video timestamp in seconds" }
                                    },
                                    required: ["name"]
                                }
                            }
                        },
                        required: ["name"]
                    }
                }
            },
            required: ["name"]
        }
    },
    required: ["root"]
};

// Flashcard Schema for Gemini
const flashcardSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        flashcards: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    front: { type: SchemaType.STRING, description: "The question or term" },
                    back: { type: SchemaType.STRING, description: "The answer or definition" },
                    timestamp: { type: SchemaType.NUMBER, description: "Video timestamp in seconds" }
                },
                required: ["front", "back"]
            }
        }
    },
    required: ["flashcards"]
};

// Safety settings to avoid RECITATION
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function cleanAndParseJSON(aiResponse: string) {
    try {
        // 1. Dùng Regex để tìm và xóa trường "timestamp" và giá trị của nó
        // Nó sẽ xóa đoạn dạng: "timestamp": 0.0000..., hoặc "timestamp": 0,
        let cleanedString = aiResponse.replace(/"timestamp"\s*:\s*[0-9.]+,?/g, '');

        // 2. Dọn dẹp dấu phẩy thừa (nếu việc xóa ở trên để lại dấu phẩy ở cuối object)
        cleanedString = cleanedString.replace(/,\s*(?=[}\]])/g, '');

        // 3. Xử lý trường hợp AI bị cắt ngang (thiếu ngoặc đóng)
        // Nếu chuỗi kết thúc lửng lơ không phải là } hoặc ]
        if (!cleanedString.trim().endsWith('}') && !cleanedString.trim().endsWith(']')) {
            // Tùy cấu trúc JSON của bạn, bạn có thể phải "vá" lại bằng cách thêm dấu đóng ngoặc
            // Ví dụ cơ bản nhất cho cấu trúc {"root": {...}}
            cleanedString += '}}';
        }

        return JSON.parse(cleanedString);
    } catch (error) {
        console.error("Lỗi Parse JSON sau khi đã clean:", error);
        console.error("Chuỗi JSON bị lỗi:", aiResponse.substring(0, 200) + "...");
        return null; // Hoặc ném lỗi tùy logic của bạn
    }
}

// --- ACTIONS ---
export async function generateMindmap(lessonId: string, transcript: string, skipAuth: boolean = false) {
    if (!skipAuth) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };
    }

    try {
        const prompt = `
        Bạn là một trợ lý giáo dục AI cao cấp. Hãy phân tích transcript bài giảng dưới đây và xây dựng Sơ đồ tư duy (Mindmap) học thuật chi tiết.
        
        BẮT BUỘC VỀ NGÔN NGỮ (CRITICAL):
        - TẤT CẢ các nhánh (root, children, details) BẮT BUỘC PHẢI VIẾT BẰNG TIẾNG VIỆT CÓ DẤU ĐẦY ĐỦ, CHUẨN NGỮ PHÁP 100% (Ví dụ: "Phương pháp triển khai", "Quy trình thực hiện", tuyệt đối không viết không dấu).
        - Giữ nguyên các thuật ngữ kỹ thuật quốc tế nếu có (như React, Next.js, API, Task 1, Man-made Process...).

        RÀNG BUỘC ĐỊNH DẠNG JSON:
        1. KHÔNG SỬ DỤNG dấu ngoặc kép (") hoặc dấu nháy đơn (') bên trong nội dung văn bản trường name.
        2. Tên (name) của các node PHẢI NGẮN GỌN VÀ SÚC TÍCH (Tối đa 6-10 từ).
        3. Cấu trúc chi tiết, phân tích sâu:
           - 1 root chính.
           - Root chứa 4-7 nhánh chính (children).
           - Mỗi nhánh chính chứa 3-5 nhánh con (children).
        4. Tên key bắt buộc là "name", danh sách con là "children".

        MẪU JSON BẮT BUỘC:
        {
          "root": {
            "name": "Tên chủ đề chính bài học bằng Tiếng Việt có dấu",
            "children": [
              {
                "name": "Ý chính 1 (Tiếng Việt có dấu)",
                "children": [
                  { "name": "Chi tiết 1 (Tiếng Việt có dấu)" },
                  { "name": "Chi tiết 2 (Tiếng Việt có dấu)" }
                ]
              }
            ]
          }
        }

        Transcript:
        ${transcript.substring(0, 35000)}
        `;

        console.log("⏳ Local Gemini 3.6 Flash đang sinh mindmap (Tiếng Việt có dấu)...");
        let data: any = {};
        try {
            data = await callLocalGeminiJSON({
                messages: [
                    { role: "system", content: "You are a backend JSON-only data processing API. You must return only a valid JSON object. Never use interactive widgets, chips, or web tools." },
                    { role: "user", content: prompt }
                ],
                model: "gemini-3.6-flash",
                temperature: 0.2,
            }, {});
        } catch (localErr: any) {
            console.error("❌ Lỗi gọi Local Gemini Mindmap:", localErr.message);
            throw new Error(`Local Gemini Mindmap Error: ${localErr.message}`);
        }

        // Tự động chuẩn hóa root nếu AI trả về dạng khác
        let rootNode = data?.root || data?.mindmap || (data?.name && data?.children ? data : null);

        if (!rootNode) {
            console.warn("⚠️ Bỏ qua tạo Mindmap do AI trả về JSON lỗi:", data);
            return { success: false, error: "Malformed JSON from AI" };
        }

        // Convert Tree to React Flow Nodes & Edges
        const { nodes, edges } = convertTreeToReactFlow(rootNode);
        const mindMapData = { nodes, edges };

        // Save to DB
        await db.lesson.update({
            where: { id: lessonId },
            data: { mindMapData: mindMapData as any }
        });

        return { message: "Mindmap generated successfully", success: true, data: mindMapData };

    } catch (error: any) {
        console.error("Generate Mindmap Error:", error);
        return { message: "Generate Mindmap Error", success: false, error: error.message };
    }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateFlashcards(lessonId: string, transcript: string, skipAuth: boolean = false) {
    if (!skipAuth) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };
    }

    try {
        const prompt = `
        Bạn là một hệ thống backend bóc tách dữ liệu giáo dục. Nhiệm vụ: Phân tích transcript sau và trích xuất danh sách 10 thẻ học tập (thuật ngữ & giải thích).
        
        BẮT BUỘC:
        1. Trả về DUY NHẤT một đối tượng JSON. TUYỆT ĐỐI KHÔNG trả về định dạng widget, canvas, hay link googleusercontent.
        2. BẮT BUỘC VIẾT BẰNG TIẾNG VIỆT CÓ DẤU ĐẦY ĐỦ, chuẩn ngữ pháp.
        3. TUYỆT ĐỐI KHÔNG SỬ DỤNG dấu ngoặc kép (") hoặc dấu nháy đơn (') bên trong nội dung front và back.
        4. Front ngắn gọn (dưới 15 từ, dạng câu hỏi hoặc khái niệm trọng tâm).
        5. Back súc tích (dưới 35 từ, giải thích rõ ràng hoặc câu trả lời cốt lõi).
        6. Tạo CHÍNH XÁC 10 thẻ ghi nhớ chất lượng cao.

        CẤU TRÚC JSON BẮT BUỘC:
        \`\`\`json
        {
          "flashcards": [
            {
              "front": "Khái niệm hoặc câu hỏi ôn tập (Tiếng Việt có dấu)",
              "back": "Định nghĩa hoặc câu trả lời cốt lõi (Tiếng Việt có dấu)"
            }
          ]
        }
        \`\`\`
        
        Transcript:
        ${transcript.substring(0, 35000)}
        `;

        console.log("⏳ Local Gemini 3.6 Flash đang sinh flashcards...");
        let data: any = {};
        try {
            data = await callLocalGeminiJSON({
                messages: [
                    { role: "system", content: "You are a backend JSON-only API. You always output pure valid JSON without conversational text or interactive chips." },
                    { role: "user", content: prompt }
                ],
                model: "gemini-3.6-flash",
                temperature: 0.1,
            }, {});
        } catch (localErr: any) {
            console.error("❌ Lỗi gọi Local Gemini Flashcards:", localErr.message);
            throw new Error(`Local Gemini Flashcards Error: ${localErr.message}`);
        }

        // Tự động chuẩn hóa mảng flashcards
        const cardsList = Array.isArray(data)
            ? data
            : (Array.isArray(data?.flashcards) ? data.flashcards : (Array.isArray(data?.cards) ? data.cards : []));

        if (!cardsList || cardsList.length === 0) {
            console.warn("⚠️ Bỏ qua tạo Flashcard do AI trả về danh sách rỗng hoặc sai cấu trúc:", data);
            return { success: false, error: "Malformed JSON from AI" };
        }

        const formattedCards = cardsList.map((fc: any) => ({
            front: String(fc.front || fc.question || fc.term || "").trim(),
            back: String(fc.back || fc.answer || fc.definition || "").trim(),
            timestamp: typeof fc.timestamp === "number" ? fc.timestamp : null
        })).filter((fc: any) => fc.front && fc.back);

        // Xóa flashcards cũ và lưu flashcards mới vào database
        await db.flashcard.deleteMany({
            where: { lessonId }
        });

        const createdFlashcards = await Promise.all(
            formattedCards.map((fc: any) =>
                db.flashcard.create({
                    data: {
                        lessonId,
                        front: fc.front,
                        back: fc.back,
                        timestamp: fc.timestamp
                    }
                })
            )
        );

        return { message: "Flashcards generated successfully", success: true, data: createdFlashcards };

    } catch (error: any) {
        console.error("Generate Flashcards Error:", error);
        return { message: "Generate Flashcards Error", success: false, error: error.message };
    }
}

export interface QuizGenerationCounts {
    multipleChoice?: number;
    trueFalse?: number;
    fillInBlank?: number;
    readingComprehension?: number;
    essay?: number;
}

export async function generateQuizFromTranscript(
    lessonId: string, 
    transcript: string, 
    skipAuth: boolean = false,
    counts?: QuizGenerationCounts
) {
    if (!skipAuth) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };
    }

    try {
        const mcCount = counts?.multipleChoice ?? 5;
        const tfCount = counts?.trueFalse ?? 2;
        const fibCount = counts?.fillInBlank ?? 2;
        const rcCount = counts?.readingComprehension ?? 1;
        const essayCount = counts?.essay ?? 1;
        const totalCount = mcCount + tfCount + fibCount + rcCount + essayCount;

        if (totalCount === 0) {
            return { success: false, error: "Vui lòng chọn ít nhất 1 câu hỏi để tạo đề thi." };
        }

        const prompt = `
        Bạn là một chuyên gia khảo thí và thiết kế đề thi giáo dục chuyên nghiệp.
        Dưới đây là transcript của một bài giảng video:
        
        **TRANSCRIPT BÀI GIẢNG:**
        ${transcript.substring(0, 35000)}
        
        Nhiệm vụ của bạn là dựa vào nội dung transcript trên để tạo ra một bộ đề thi học thuật chất lượng cao gồm CHÍNH XÁC các dạng bài sau:
        - ${mcCount} câu Trắc nghiệm 4 lựa chọn (MULTIPLE_CHOICE)
        - ${tfCount} câu Đúng/Sai theo 4 mệnh đề a,b,c,d (TRUE_FALSE)
        - ${fibCount} câu Điền khuyết / Trả lời ngắn (FILL_IN_BLANK)
        - ${rcCount} câu Đọc hiểu kèm ngữ liệu/đoạn trích (READING_COMPREHENSION)
        - ${essayCount} câu Tự luận phân tích chuyên sâu kèm đáp án mẫu (ESSAY)

        ### NGUYÊN TẮC QUAN TRỌNG:
        1. **NGÔN NGỮ:** BẮT BUỘC 100% TIẾNG VIỆT CÓ DẤU ĐẦY ĐỦ, CHUẨN NGỮ PHÁP.
        2. **CHỈ TẬP TRUNG:** Kiến thức cốt lõi, phương pháp, nguyên lý hoạt động, định nghĩa hoặc bài tập trong bài.
        3. **TUYỆT ĐỐI BỎ QUA:** Chi tiết giao diện không quan trọng, lời chào hỏi, không dùng từ "keyframe", "ảnh", "video" trong đề.

        ### CẤU TRÚC JSON ĐẦU RA BẮT BUỘC:
        \`\`\`json
        {
          "quiz": [
            ${mcCount > 0 ? `{
              "type": "MULTIPLE_CHOICE",
              "question": "Nội dung câu hỏi trắc nghiệm bằng Tiếng Việt có dấu...",
              "options": ["Đáp án A...", "Đáp án B...", "Đáp án C...", "Đáp án D..."],
              "correctAnswer": "A",
              "explanation": "Giải thích chi tiết tại sao đúng...",
              "timestamp": 84
            },` : ""}
            ${tfCount > 0 ? `{
              "type": "TRUE_FALSE",
              "question": "Xét tính Đúng/Sai của các nhận định sau:",
              "subItems": [
                { "label": "a", "content": "Mệnh đề thứ nhất...", "isCorrect": true },
                { "label": "b", "content": "Mệnh đề thứ hai...", "isCorrect": false },
                { "label": "c", "content": "Mệnh đề thứ ba...", "isCorrect": true },
                { "label": "d", "content": "Mệnh đề thứ tư...", "isCorrect": false }
              ],
              "explanation": "Giải thích chi tiết các mệnh đề...",
              "timestamp": 120
            },` : ""}
            ${fibCount > 0 ? `{
              "type": "FILL_IN_BLANK",
              "question": "Trong quy trình ..., giai đoạn quan trọng nhất để cố định hình dạng là [_____].",
              "correctAnswer": "Đổ khuôn",
              "explanation": "Giải thích đáp án cần điền...",
              "timestamp": 150
            },` : ""}
            ${rcCount > 0 ? `{
              "type": "READING_COMPREHENSION",
              "passage": {
                "title": "Ngữ liệu đọc hiểu về ...",
                "content": "Nội dung đoạn trích ngữ liệu đọc hiểu được biên soạn dựa trên bài học..."
              },
              "question": "Dựa vào đoạn trích trên, ý nào sau đây phản ánh chính xác nhất...?",
              "options": ["Đáp án A...", "Đáp án B...", "Đáp án C...", "Đáp án D..."],
              "correctAnswer": "A",
              "explanation": "Giải thích chi tiết...",
              "timestamp": 200
            },` : ""}
            ${essayCount > 0 ? `{
              "type": "ESSAY",
              "question": "Hãy phân tích chi tiết các bước trong ... và nêu rõ các lưu ý quan trọng.",
              "modelAnswer": "### Hướng dẫn đáp án mẫu chi tiết:\\n- Ý 1: ...\\n- Ý 2: ...\\n- Ý 3: ...",
              "explanation": "Tiêu chí và thang điểm đánh giá...",
              "timestamp": null
            }` : ""}
          ]
        }
        \`\`\`
        `;

        console.log(`⏳ Local Gemini 3.6 Flash đang sinh bộ đề ${totalCount} câu gồm 5 dạng bài...`);
        let data: any = {};
        try {
            data = await callLocalGeminiJSON({
                messages: [
                    { role: "system", content: "You are a backend JSON-only API for an educational test generator. You always output pure valid JSON without conversational text or interactive chips." },
                    { role: "user", content: prompt }
                ],
                model: "gemini-3.6-flash",
                temperature: 0.2,
            }, {});
        } catch (localErr: any) {
            console.error("❌ Lỗi gọi Local Gemini Quiz:", localErr.message);
            throw new Error(`Local Gemini Quiz Error: ${localErr.message}`);
        }

        // Tự động chuẩn hóa danh sách câu hỏi
        const quizList = Array.isArray(data)
            ? data
            : (Array.isArray(data?.quiz) ? data.quiz : (Array.isArray(data?.questions) ? data.questions : []));

        if (!quizList || quizList.length === 0) {
            console.warn("⚠️ Bỏ qua tạo Quiz do AI trả về JSON không chứa danh sách câu hỏi:", data);
            return { success: false, error: "Malformed JSON from AI" };
        }

        // Xóa câu hỏi AI cũ trước khi tạo mới để tránh bị trùng lặp
        await db.passage.deleteMany({
            where: { lessonId }
        });
        await db.question.deleteMany({
            where: {
                lessonId,
                quizSource: "AI_VIDEO"
            }
        });

        // Lưu câu hỏi vào database tuần tự để xử lý quan hệ Passage và SubItem
        const passageMap = new Map<string, string>();
        const createdQuestions: any[] = [];

        for (const q of quizList) {
            const rawType = String(q.type || "MULTIPLE_CHOICE").toUpperCase();
            let qType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_IN_BLANK" | "READING_COMPREHENSION" | "ESSAY" = "MULTIPLE_CHOICE";
            if (["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_IN_BLANK", "READING_COMPREHENSION", "ESSAY"].includes(rawType)) {
                qType = rawType as any;
            }

            let passageId: string | null = null;
            if (q.passage && q.passage.content) {
                const pKey = String(q.passage.content).trim();
                if (passageMap.has(pKey)) {
                    passageId = passageMap.get(pKey)!;
                } else {
                    const newPassage = await db.passage.create({
                        data: {
                            lessonId,
                            title: q.passage.title || null,
                            content: q.passage.content
                        }
                    });
                    passageId = newPassage.id;
                    passageMap.set(pKey, passageId);
                }
            }

            let correctAns: string | null = null;
            if (qType === "MULTIPLE_CHOICE" || qType === "READING_COMPREHENSION") {
                if (typeof q.answer === "string" && ["A", "B", "C", "D"].includes(q.answer.toUpperCase())) {
                    correctAns = q.answer.toUpperCase();
                } else if (typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer <= 3) {
                    correctAns = ["A", "B", "C", "D"][q.correctAnswer];
                } else if (typeof q.correctAnswer === "string") {
                    correctAns = q.correctAnswer.toUpperCase().charAt(0) || "A";
                } else {
                    correctAns = "A";
                }
            } else if (qType === "FILL_IN_BLANK") {
                correctAns = String(q.correctAnswer || q.answer || "").trim();
            }

            // Xử lý subItems cho TRUE_FALSE
            let subItemsData = undefined;
            if (qType === "TRUE_FALSE" && Array.isArray(q.subItems) && q.subItems.length > 0) {
                subItemsData = {
                    create: q.subItems.map((si: any, idx: number) => ({
                        label: String(si.label || ["a", "b", "c", "d"][idx] || "a").toLowerCase(),
                        content: String(si.content || si.statement || "").trim(),
                        isCorrect: typeof si.isCorrect === "boolean" ? si.isCorrect : (si.answer === "Đúng" || si.answer === true || si.isCorrect === "true"),
                        position: idx
                    }))
                };
            }

            const createdQ = await db.question.create({
                data: {
                    lessonId,
                    content: String(q.question || q.content || "Nội dung câu hỏi").trim(),
                    timestamp: typeof q.timestamp === "number" ? q.timestamp : null,
                    options: (qType === "MULTIPLE_CHOICE" || qType === "READING_COMPREHENSION") && Array.isArray(q.options)
                        ? q.options.map((opt: string) => String(opt || "").replace(/^([A-D]|[0-9]+)[\.\)]\s*/g, "").trim())
                        : [],
                    correctAnswer: correctAns,
                    modelAnswer: qType === "ESSAY" ? String(q.modelAnswer || q.answer || "").trim() : null,
                    type: qType,
                    aiExplanation: String(q.explanation || q.aiExplanation || "").trim(),
                    quizSource: "AI_VIDEO",
                    passageId: passageId,
                    subItems: subItemsData
                },
                include: {
                    passage: true,
                    subItems: true
                }
            });

            createdQuestions.push(createdQ);
        }

        return { message: "Quiz generated successfully", success: true, data: createdQuestions };

    } catch (error: any) {
        console.error("Generate Quiz Error:", error);
        return { message: "Generate Quiz Error", success: false, error: error.message };
    }
}

// --- HELPERS ---

function convertTreeToReactFlow(root: any) {
    const nodes: any[] = [];
    const edges: any[] = [];
    let nodeIdCounter = 0;

    function traverse(node: any, parentId: string | null) {
        const currentId = `node-${nodeIdCounter++}`;

        nodes.push({
            id: currentId,
            data: { label: node.name, timestamp: node.timestamp },
            position: { x: 0, y: 0 }, // Will be calculated by client
            type: parentId ? 'default' : 'input',
            sourcePosition: 'right',
            targetPosition: 'left',
        });

        if (parentId) {
            edges.push({
                id: `e-${parentId}-${currentId}`,
                source: parentId,
                target: currentId,
                animated: true
            });
        }

        if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child: any) => {
                traverse(child, currentId);
            });
        }
    }

    traverse(root, null);
    return { nodes, edges };
}
