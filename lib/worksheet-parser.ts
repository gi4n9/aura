import Tesseract from "tesseract.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Sửa lỗi DOMMatrix is not defined trên môi trường Node.js mới
if (typeof global !== "undefined" && !global.DOMMatrix) {
    (global as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        constructor() { }
    };
}

const pdfParse = require("pdf-parse");

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
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.warn("No Gemini API key found, falling back to local OCR.");
            let text = "";
            if (mimeType === "application/pdf") {
                text = await extractTextFromPDF(buffer);
            } else {
                text = await extractTextFromImage(buffer);
            }
            return regexParser(text);
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `
Bạn là một chuyên gia nhận dạng và phân tích đề thi giáo dục. 
Nhiệm vụ của bạn là đọc toàn bộ văn bản trong tệp hình ảnh/PDF được đính kèm và phân tích nó thành một danh sách các câu hỏi.
Đây là phiếu bài tập tiếng Việt. Cố gắng bảo toàn nguyên vẹn nội dung câu hỏi và các đáp án (không được viết tắt, không được bỏ sót câu).
Lưu ý đặc biệt: Phiếu bài tập có thể chứa các đoạn code lập trình, bảng biểu, công thức toán học. Hãy định dạng chúng bằng chuẩn Markdown (ví dụ: dùng \`\`\`python ... \`\`\` cho code, cú pháp bảng của Markdown cho bảng biểu) trong trường \`content\` để hiển thị đẹp mắt.

Quy tắc:
1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.".
2. Cố gắng trích xuất tất cả các đáp án (A, B, C, D) vào mảng options. Nếu câu hỏi không có đáp án chọn lọc thì đó là tự luận (ESSAY). Nội dung đáp án không bao gồm chữ cái "A.", "B.".
3. Nếu có đáp án đúng được khoanh tròn hoặc gạch chân, hãy trích xuất vào correctAnswer (A, B, C hoặc D).
4. Phải trả về TẤT CẢ các câu hỏi có trong ảnh, không được bỏ sót bất kỳ câu nào. Chú ý đọc kỹ từ đầu đến cuối ảnh.

Cấu trúc JSON mong muốn:
[
  {
    "index": 1,
    "content": "Nội dung câu hỏi...",
    "type": "MULTIPLE_CHOICE", // Hoặc "ESSAY"
    "options": ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
    "correctAnswer": "A"
  }
]
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
            correctAnswer: item.correctAnswer || undefined
        }));

    } catch (error) {
        console.error("Lỗi khi dùng Gemini Vision:", error);
        // Fallback
        let text = "";
        if (mimeType === "application/pdf") {
            text = await extractTextFromPDF(buffer);
        } else {
            text = await extractTextFromImage(buffer);
        }
        return regexParser(text);
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
