import Tesseract from "tesseract.js";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as xlsx from "xlsx";
import Groq from "groq-sdk";

// Sửa lỗi DOMMatrix is not defined trên môi trường Node.js mới
if (typeof global !== "undefined" && !global.DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        constructor() { }
    };
}

const pdfParse = require("pdf-parse");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const questionSchema: Schema = {
    type: SchemaType.ARRAY,
    description: "Danh sách câu hỏi trích xuất từ tài liệu.",
    items: {
        type: SchemaType.OBJECT,
        properties: {
            index: {
                type: SchemaType.INTEGER,
                description: "Số thứ tự câu hỏi trong đề"
            },
            content: {
                type: SchemaType.STRING,
                description: "Nội dung câu hỏi bằng tiếng Việt, bao gồm cả các đoạn mã nguồn, bảng biểu, công thức (nếu có, định dạng bằng Markdown)"
            },
            type: {
                type: SchemaType.STRING,
                description: "Loại câu hỏi: MULTIPLE_CHOICE (trắc nghiệm) hoặc ESSAY (tự luận)"
            },
            options: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: "Danh sách 4 lựa chọn (A, B, C, D) cho câu hỏi trắc nghiệm. Bắt buộc đối với MULTIPLE_CHOICE. Nội dung đáp án không bao gồm chữ cái tiền tố 'A.', 'B.'"
            }
        },
        required: ["index", "content", "type"]
    }
};

const batchQuestionsSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        examCode: {
            type: SchemaType.STRING,
            description: "Mã đề thi phát hiện được (ví dụ '123', '0525'), hoặc null nếu không tìm thấy"
        },
        questions: {
            type: SchemaType.ARRAY,
            description: "Danh sách các câu hỏi hoàn chỉnh từ các trang",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    index: {
                        type: SchemaType.INTEGER,
                        description: "Số thứ tự câu hỏi"
                    },
                    content: {
                        type: SchemaType.STRING,
                        description: "Nội dung câu hỏi bằng tiếng Việt, bao gồm cả các đoạn mã nguồn, bảng biểu, công thức (nếu có, định dạng bằng Markdown)"
                    },
                    type: {
                        type: SchemaType.STRING,
                        description: "Loại câu hỏi: MULTIPLE_CHOICE hoặc ESSAY"
                    },
                    options: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: "Danh sách 4 lựa chọn (A, B, C, D) cho câu hỏi trắc nghiệm. Bắt buộc đối với MULTIPLE_CHOICE."
                    }
                },
                required: ["index", "content", "type"]
            }
        }
    },
    required: ["questions"]
};

const answerKeySchema: Schema = {
    type: SchemaType.ARRAY,
    description: "Danh sách đáp án trích xuất từ bảng đáp án.",
    items: {
        type: SchemaType.OBJECT,
        properties: {
            questionNumber: {
                type: SchemaType.STRING,
                description: "Số thứ tự câu hỏi (ví dụ: '1', '2')"
            },
            correctAnswer: {
                type: SchemaType.STRING,
                description: "Đáp án đúng (A, B, C, D hoặc DSDS)"
            }
        },
        required: ["questionNumber", "correctAnswer"]
    }
};

export interface ParsedQuestion {
    index: number;
    content: string;
    type: "MULTIPLE_CHOICE" | "ESSAY";
    options?: string[]; // ["A. ...", "B. ...", ...]
    correctAnswer?: string; // "A", "B", "C", "D"
}

/**
 * Trích xuất text từ file PDF
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error("Lỗi khi parse PDF:", error);
        throw new Error("Không thể đọc nội dung file PDF.");
    }
}

/**
 * OCR trích xuất text từ ảnh bằng tiếng Việt
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
    try {
        // Tesseract.recognize có thể nhận buffer (hoặc Uint8Array)
        const result = await Tesseract.recognize(buffer, "vie", {
            // logger: m => console.log(m)
        });
        return result.data.text;
    } catch (error) {
        console.error("Lỗi khi OCR ảnh:", error);
        throw new Error("Không thể nhận diện chữ từ hình ảnh.");
    }
}

/**
 * Đọc TRỰC TIẾP file bằng Gemini Vision (bỏ qua Tesseract và OpenCV cục bộ)
 */
export async function parseQuestionsFromFile(buffer: Buffer, mimeType: string): Promise<ParsedQuestion[]> {
    try {
        console.log(`🧠 Calling Gemini 2.5 Flash for file parsing (${mimeType})...`);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                temperature: 0.2
            }
        });

        const prompt = `
Bạn là một chuyên gia nhận dạng và phân tích đề thi giáo dục. 
Nhiệm vụ của bạn là đọc toàn bộ văn bản trong tài liệu đính kèm và phân tích nó thành một danh sách các câu hỏi.
Đây là phiếu bài tập tiếng Việt. Cố gắng bảo toàn nguyên vẹn nội dung câu hỏi và các đáp án (không được viết tắt, không được bỏ sót câu).
Lưu ý đặc biệt: Phiếu bài tập có thể chứa các đoạn code lập trình, bảng biểu, công thức toán học. Hãy định dạng chúng bằng chuẩn Markdown trong trường \`content\` để hiển thị đẹp mắt:
- Bắt buộc dùng khối mã nguồn dòng riêng biệt với ba dấu nháy ngược (khối mã block code với \`\`\`html ở dòng riêng, sau đó là code có xuống dòng rõ ràng, và đóng bằng \`\`\` ở dòng riêng).
- Tuyệt đối KHÔNG viết mã nguồn trên cùng một dòng với văn bản giải thích. Phải xuống dòng trước và sau khối mã nguồn.
- Tuyệt đối KHÔNG dùng dấu nháy đơn (\`) cho khối mã nguồn hoặc viết chung một dòng.

Quy tắc:
1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.".
2. Cố gắng trích xuất tất cả các đáp án (A, B, C, D) vào mảng options. Nếu câu hỏi không có đáp án chọn lọc thì đó là tự luận (ESSAY). Nội dung đáp án không bao gồm chữ cái "A.", "B.".
3. KHÔNG nhận diện hay trích xuất đáp án đúng (correctAnswer) từ tài liệu này (sẽ được tải lên riêng).
4. Phải trả về TẤT CẢ các câu hỏi có trong tài liệu, không được bỏ sót bất kỳ câu nào. Chú ý đọc kỹ từ đầu đến cuối.
`;

        const filePart = {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, filePart]);
        const responseText = result.response.text();

        let parsed: any[];
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Invalid JSON format from AI");
            }
        }

        return parsed.map((item: any, i: number) => ({
            index: item.index || i + 1,
            content: item.content || "",
            type: item.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "ESSAY",
            options: Array.isArray(item.options) && item.options.length > 0 ? item.options : undefined,
            correctAnswer: undefined
        }));

    } catch (error) {
        console.warn("⚠️ Gemini failed (parseQuestionsFromFile), falling back to OCR + Groq Llama 3.3...", error);
        try {
            let text = "";
            if (mimeType === "application/pdf") {
                text = await extractTextFromPDF(buffer);
            } else {
                text = await extractTextFromImage(buffer);
            }

            if (!text || text.trim().length === 0) {
                throw new Error("Không thể trích xuất văn bản từ tài liệu.");
            }

            console.log(`🧠 Calling Groq Llama 3.3 fallback for file parsing...`);
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `
Dưới đây là nội dung văn bản trích xuất từ một phiếu bài tập bằng Tiếng Việt.
Nhiệm vụ của bạn là phân tích văn bản này thành danh sách các câu hỏi hoàn chỉnh.
Lưu ý đặc biệt: Phiếu bài tập có thể chứa các đoạn code lập trình, bảng biểu, công thức toán học. Hãy định dạng chúng bằng chuẩn Markdown trong trường \`content\` để hiển thị đẹp mắt:
- Bắt buộc dùng khối mã nguồn dòng riêng biệt với ba dấu nháy ngược (khối mã block code với \`\`\`html ở dòng riêng, sau đó là code có xuống dòng rõ ràng, và đóng bằng \`\`\` ở dòng riêng).
- Tuyệt đối KHÔNG viết mã nguồn trên cùng một dòng với văn bản giải thích. Phải xuống dòng trước và sau khối mã nguồn.
- Tuyệt đối KHÔNG dùng dấu nháy đơn (\`) cho khối mã nguồn hoặc viết chung một dòng.

Quy tắc:
1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.".
2. Cố gắng trích xuất tất cả các đáp án (A, B, C, D) vào mảng options. Nếu câu hỏi không có đáp án chọn lọc thì đó là tự luận (ESSAY). Nội dung đáp án không bao gồm chữ cái "A.", "B.".
3. KHÔNG trích xuất đáp án đúng (correctAnswer).
4. Phải trả về TẤT CẢ các câu hỏi có trong tài liệu.

Văn bản trích xuất:
${text}

Trả về định dạng JSON theo cấu trúc sau:
{
  "questions": [
    {
      "index": 1,
      "content": "Nội dung câu hỏi",
      "type": "MULTIPLE_CHOICE",
      "options": ["...", "..."]
    }
  ]
}
`
                    }
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                temperature: 0.2
            });

            const responseText = chatCompletion.choices[0].message.content || "{}";
            let parsedObj: any;
            try {
                parsedObj = JSON.parse(responseText);
            } catch (e) {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                parsedObj = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            }

            const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];
            return questionsArray.map((item: any, i: number) => ({
                index: item.index || i + 1,
                content: item.content || "",
                type: item.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "ESSAY",
                options: Array.isArray(item.options) && item.options.length > 0 ? item.options : undefined,
                correctAnswer: undefined
            }));
        } catch (fallbackError) {
            console.error("❌ Fallback to Groq also failed:", fallbackError);
            let text = "";
            try {
                if (mimeType === "application/pdf") {
                    text = await extractTextFromPDF(buffer);
                } else {
                    text = await extractTextFromImage(buffer);
                }
            } catch (ocrErr) {}
            return regexParser(text);
        }
    }
}

export interface BatchParsedResult {
    questions: ParsedQuestion[];
    examCode: string | null;
}

/**
 * Đọc TRỰC TIẾP NHIỀU file cùng lúc bằng Gemini Vision để xử lý câu hỏi vắt ngang trang
 */
export async function parseQuestionsFromFilesBatch(files: { buffer: Buffer, mimeType: string }[]): Promise<BatchParsedResult> {
    try {
        if (files.length === 0) return { questions: [], examCode: null };

        console.log(`🧠 Calling Gemini 2.5 Flash for batch files parsing (${files.length} files)...`);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: batchQuestionsSchema,
                temperature: 0.2
            }
        });

        const prompt = `
Bạn là một chuyên gia nhận dạng và phân tích đề thi giáo dục. 
Nhiệm vụ của bạn là đọc toàn bộ văn bản trong các tệp hình ảnh/PDF được đính kèm (được cung cấp theo thứ tự trang) và phân tích nó.
Đây là phiếu bài tập tiếng Việt. Cố gắng bảo toàn nguyên vẹn nội dung câu hỏi và các đáp án (không được viết tắt, không được bỏ sót câu).
Lưu ý đặc biệt: Phiếu bài tập có thể chứa các đoạn code lập trình, bảng biểu, công thức toán học. Hãy định dạng chúng bằng chuẩn Markdown trong trường \`content\` để hiển thị đẹp mắt:
- Bắt buộc dùng khối mã nguồn dòng riêng biệt với ba dấu nháy ngược (khối mã block code với \`\`\`html ở dòng riêng, sau đó là code có xuống dòng rõ ràng, và đóng bằng \`\`\` ở dòng riêng).
- Tuyệt đối KHÔNG viết mã nguồn trên cùng một dòng với văn bản giải thích. Phải xuống dòng trước và sau khối mã nguồn.
- Tuyệt đối KHÔNG dùng dấu nháy đơn (\`) cho khối mã nguồn hoặc viết chung một dòng.
Chú ý: Các tệp đính kèm là các trang liên tiếp của MỘT đề thi. Bạn phải nối các trang lại với nhau thành danh sách các câu hỏi hoàn chỉnh.
Đồng thời, hãy tìm "Mã đề" của đề thi này. Mã đề thường nằm ở đầu hoặc cuối trang (ví dụ "Mã đề 123", "Mã đề thi 0525").

Quy tắc:
1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.".
2. Cố gắng trích xuất tất cả các đáp án (A, B, C, D) vào mảng options. Nếu câu hỏi không có đáp án chọn lọc thì đó là tự luận (ESSAY).
3. KHÔNG nhận diện hay trích xuất đáp án đúng (correctAnswer) từ tài liệu này (sẽ được tải lên riêng).
4. Phải trả về TẤT CẢ các câu hỏi có trong tất cả các tài liệu, không được bỏ sót bất kỳ câu nào.
5. Kiểm tra mã đề của tất cả các trang, nếu chúng giống nhau, trả về mã đề đó. Nếu không tìm thấy mã đề, trả về null.
`;

        const fileParts = files.map(f => ({
            inlineData: {
                data: f.buffer.toString("base64"),
                mimeType: f.mimeType
            }
        }));

        const result = await model.generateContent([prompt, ...fileParts]);
        const responseText = result.response.text();

        let parsed: any;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Invalid JSON format from AI");
            }
        }

        const questionsArray = Array.isArray(parsed.questions) ? parsed.questions : [];
        const formattedQuestions = questionsArray.map((item: any, i: number) => ({
            index: item.index || i + 1,
            content: item.content || "",
            type: item.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "ESSAY",
            options: Array.isArray(item.options) && item.options.length > 0 ? item.options : undefined,
            correctAnswer: undefined
        }));

        return {
            questions: formattedQuestions,
            examCode: parsed.examCode || null
        };

    } catch (error) {
        console.warn("⚠️ Gemini failed (parseQuestionsFromFilesBatch), falling back to OCR + Groq Llama 3.3...", error);
        try {
            const texts = [];
            for (const file of files) {
                let t = "";
                if (file.mimeType === "application/pdf") {
                    t = await extractTextFromPDF(file.buffer);
                } else {
                    t = await extractTextFromImage(file.buffer);
                }
                texts.push(t);
            }
            const joinedText = texts.join("\n--- TRANG MỚI ---\n");

            if (!joinedText.trim()) {
                throw new Error("Không thể trích xuất văn bản từ tài liệu.");
            }

            console.log(`🧠 Calling Groq Llama 3.3 fallback for batch parsing...`);
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `
Dưới đây là nội dung văn bản được trích xuất từ các trang liên tiếp của một đề thi Tiếng Việt.
Nhiệm vụ của bạn là phân tích và nối các trang lại để tạo thành danh sách câu hỏi hoàn chỉnh.
Đồng thời, hãy tìm "Mã đề" của đề thi này. Mã đề thường nằm ở đầu hoặc cuối trang (ví dụ "Mã đề 123", "Mã đề thi 0525").

Lưu ý đặc biệt: Phiếu bài tập có thể chứa các đoạn code lập trình, bảng biểu, công thức toán học. Hãy định dạng chúng bằng chuẩn Markdown trong trường \`content\` để hiển thị đẹp mắt:
- Bắt buộc dùng khối mã nguồn dòng riêng biệt với ba dấu nháy ngược (khối mã block code với \`\`\`html ở dòng riêng, sau đó là code có xuống dòng rõ ràng, và đóng bằng \`\`\` ở dòng riêng).
- Tuyệt đối KHÔNG viết mã nguồn trên cùng một dòng với văn bản giải thích. Phải xuống dòng trước và sau khối mã nguồn.
- Tuyệt đối KHÔNG dùng dấu nháy đơn (\`) cho khối mã nguồn hoặc viết chung một dòng.

Quy tắc:
1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.".
2. Cố gắng trích xuất tất cả các đáp án (A, B, C, D) vào mảng options. Nếu câu hỏi không có đáp án chọn lọc thì đó là tự luận (ESSAY). Nội dung đáp án không bao gồm chữ cái "A.", "B.".
3. KHÔNG trích xuất đáp án đúng (correctAnswer).
4. Phải trả về TẤT CẢ các câu hỏi có trong tài liệu.
5. Kiểm tra mã đề của tất cả các trang, nếu chúng giống nhau, trả về mã đề đó. Nếu không tìm thấy mã đề, trả về null.

Văn bản trích xuất:
${joinedText}

Trả về định dạng JSON theo cấu trúc sau:
{
  "examCode": "123" hoặc null,
  "questions": [
    {
      "index": 1,
      "content": "Nội dung câu hỏi",
      "type": "MULTIPLE_CHOICE",
      "options": ["...", "..."]
    }
  ]
}
`
                    }
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                temperature: 0.2
            });

            const responseText = chatCompletion.choices[0].message.content || "{}";
            let parsedObj: any;
            try {
                parsedObj = JSON.parse(responseText);
            } catch (e) {
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                parsedObj = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            }

            const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];
            const formattedQuestions = questionsArray.map((item: any, i: number) => ({
                index: item.index || i + 1,
                content: item.content || "",
                type: item.type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "ESSAY",
                options: Array.isArray(item.options) && item.options.length > 0 ? item.options : undefined,
                correctAnswer: undefined
            }));

            return {
                questions: formattedQuestions,
                examCode: parsedObj.examCode || null
            };
        } catch (fallbackError) {
            console.error("❌ Fallback batch to Groq also failed:", fallbackError);
            throw fallbackError;
        }
    }
}

/**
 * Phân tích text thuần thành danh sách câu hỏi (Regex cơ bản dự phòng)
 */
function regexParser(rawText: string): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];

    // Normalize text: chuẩn hóa xuống dòng, khoảng trắng dư thừa
    let text = rawText.replace(/\r\n/g, '\n').trim();

    const questionStartRegex = /^(?:Câu|Bài)\s*(\d+)\s*[.:)]|^(\d+)\s*[.)]\s/gm;

    interface MatchPos {
        index: number;
        num: number;
        textIndex: number;
    }

    const matches: MatchPos[] = [];
    let match;
    while ((match = questionStartRegex.exec(text)) !== null) {
        matches.push({
            index: match.index,
            num: parseInt(match[1] || match[2], 10),
            textIndex: questionStartRegex.lastIndex
        });
    }

    if (matches.length === 0) {
        if (text.length > 10) {
            questions.push(parseSingleQuestionText(text, 1));
        }
        return questions;
    }

    for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const nextMatch = i + 1 < matches.length ? matches[i + 1] : null;

        const rawContent = text.substring(
            currentMatch.index,
            nextMatch ? nextMatch.index : text.length
        ).trim();

        const q = parseSingleQuestionText(rawContent, currentMatch.num);
        questions.push(q);
    }

    return questions;
}

export async function parseAnswerKeyFromImage(buffer: Buffer, mimeType: string, targetExamCode: string | null): Promise<Record<string, string>> {
    const examCodeInstruction = targetExamCode ? `LƯU Ý QUAN TRỌNG: Bạn chỉ được trích xuất đáp án cho Mã đề thi là "${targetExamCode}". Hãy tìm đúng cột hoặc phần văn bản của mã đề này.` : `Nếu ảnh có nhiều cột mã đề, hãy tự động chọn cột mã đề đầu tiên.`;

    const prompt = `
Bạn là một công cụ đọc bảng đáp án. Nhiệm vụ của bạn là trích xuất chính xác bảng đáp án từ hình ảnh (hoặc dữ liệu).
${examCodeInstruction}
`;

    console.log(`🧠 Calling Gemini 2.5 Flash for answer key image...`);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: answerKeySchema,
            temperature: 0.2
        }
    });

    const filePart = {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        }
    };

    let responseText = "[]";
    try {
        const result = await model.generateContent([prompt, filePart]);
        responseText = result.response.text();
    } catch (error: any) {
        console.warn("⚠️ Gemini failed (parseAnswerKeyFromImage), falling back to OCR + Groq Llama 3.3...", error.message);
        try {
            console.log("Running Tesseract OCR on answer key image...");
            const text = await extractTextFromImage(buffer);
            if (!text || text.trim().length === 0) {
                throw new Error("Không thể trích xuất văn bản từ hình ảnh đáp án.");
            }

            console.log(`🧠 Calling Groq Llama 3.3 fallback for answer key parsing...`);
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `
Dưới đây là văn bản được trích xuất (OCR) từ một hình ảnh bảng đáp án bằng Tiếng Việt.
Nhiệm vụ của bạn là trích xuất bảng đáp án từ dữ liệu này.
${examCodeInstruction}

Văn bản OCR:
${text}

Quy tắc trả về:
- Cấu trúc JSON phải là một dictionary: key là "số thứ tự câu hỏi" (chuỗi), value là "đáp án đúng" (A, B, C, D hoặc DSDS).
- Ví dụ:
{
  "1": "A",
  "2": "C"
}
`
                    }
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                temperature: 0.2
            });

            const completionContent = chatCompletion.choices[0].message.content || "{}";
            const parsedObj = JSON.parse(completionContent);
            const arrayFormat = Object.entries(parsedObj).map(([key, val]) => ({
                questionNumber: key,
                correctAnswer: val
            }));
            responseText = JSON.stringify(arrayFormat);
        } catch (fallbackError: any) {
            console.error("❌ Fallback answer key to Groq also failed:", fallbackError.message);
            throw new Error(`Fallback Answer Key Error: ${fallbackError.message}`);
        }
    }

    let parsed: Record<string, string> = {};
    try {
        const parsedArray = JSON.parse(responseText);
        if (Array.isArray(parsedArray)) {
            for (const item of parsedArray) {
                if (item.questionNumber && item.correctAnswer) {
                    parsed[String(item.questionNumber)] = String(item.correctAnswer);
                }
            }
        }
    } catch (e) {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                const parsedArray = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsedArray)) {
                    for (const item of parsedArray) {
                        if (item.questionNumber && item.correctAnswer) {
                            parsed[String(item.questionNumber)] = String(item.correctAnswer);
                        }
                    }
                }
            } catch (e2) {}
        }
    }
    return parsed;
}

export async function parseAnswerKeyFromExcel(buffer: Buffer, targetExamCode: string | null): Promise<Record<string, string>> {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csvData = xlsx.utils.sheet_to_csv(sheet);

    const examCodeInstruction = targetExamCode ? `LƯU Ý QUAN TRỌNG: Chỉ trích xuất cột đáp án dành cho Mã đề thi là "${targetExamCode}".` : `If file has multiple columns of exam codes, take the first column of exam codes.`;

    const prompt = `
Dưới đây là dữ liệu CSV được xuất từ một file Excel chứa bảng đáp án.
Nhiệm vụ của bạn là trích xuất bảng đáp án từ dữ liệu này.
${examCodeInstruction}

Dữ liệu CSV:
${csvData}

Quy tắc trả về:
- Cấu trúc JSON phải là một dictionary: key là "số thứ tự câu hỏi" (chuỗi), value là "đáp án đúng" (A, B, C, D hoặc DSDS).
- Ví dụ:
{
  "1": "A",
  "2": "C"
}
`;

    console.log(`🧠 Calling Groq Llama 3.3 for Excel answer key...`);
    let responseText = "{}";
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.2
        });
        responseText = chatCompletion.choices[0].message.content || "{}";
    } catch (error: any) {
        console.error("❌ Lỗi gọi Groq Excel cho bảng đáp án:", error.message);
        throw new Error(`Groq Excel Answer Key Error: ${error.message}`);
    }

    let parsed: Record<string, string> = {};
    try {
        parsed = JSON.parse(responseText);
    } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }
    return parsed;
}

/**
 * Phân tích nội dung của 1 câu hỏi cụ thể để tìm options và đáp án
 */
function parseSingleQuestionText(rawContent: string, index: number): ParsedQuestion {
    // 1. Tách options A, B, C, D (Hỗ trợ lỗi OCR như lB., 1C., đứng giữa dòng)
    const optionRegex = /(?:^|\s)(?:[l1I])?([A-D])\s*[.)]\s/gm;
    const optionMatches: { letter: string, index: number }[] = [];

    let match;
    while ((match = optionRegex.exec(rawContent)) !== null) {
        optionMatches.push({
            letter: match[1].toUpperCase(), // Chữ cái A, B, C, D nằm trong nhóm 1
            index: match.index
        });
    }

    const validOptions: { letter: string, text: string, startIndex: number }[] = [];
    for (let i = 0; i < optionMatches.length; i++) {
        const curr = optionMatches[i];
        if (validOptions.find(o => o.letter === curr.letter)) continue;

        const next = optionMatches[i + 1];
        const optText = rawContent.substring(
            curr.index,
            next ? next.index : rawContent.length
        ).trim();

        validOptions.push({
            letter: curr.letter,
            text: optText,
            startIndex: curr.index
        });
    }

    if (validOptions.length >= 2) {
        const firstOptionIndex = validOptions[0].startIndex;
        let questionContent = rawContent.substring(0, firstOptionIndex).trim();

        let correctAnswer: string | undefined = undefined;

        const answerRegex = /(?:Đáp án|ĐA|Đ\/A)\s*[.:]?\s*([A-D])/i;

        const lastOpt = validOptions[validOptions.length - 1];
        const ansMatch = answerRegex.exec(lastOpt.text);
        if (ansMatch) {
            correctAnswer = ansMatch[1].toUpperCase();
            lastOpt.text = lastOpt.text.replace(ansMatch[0], '').trim();
        } else {
            const globalAnsMatch = answerRegex.exec(rawContent);
            if (globalAnsMatch) {
                correctAnswer = globalAnsMatch[1].toUpperCase();
            }
        }

        for (const opt of validOptions) {
            if (opt.text.startsWith('*')) {
                correctAnswer = opt.letter;
                opt.text = opt.text.substring(1).trim();
            }
        }

        return {
            index,
            content: questionContent,
            type: "MULTIPLE_CHOICE",
            options: validOptions.map(o => o.text),
            correctAnswer
        };
    }

    return {
        index,
        content: rawContent,
        type: "ESSAY"
    };
}
