import Tesseract from "tesseract.js";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as xlsx from "xlsx";
import Groq from "groq-sdk";
import { getSha256, getCachedOcr, setCachedOcr } from "./ocr-cache";
import { optimizeImageForOCR } from "./image-preprocessor";

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

// ================== SCHEMAS CHO GEMINI ==================

// Schema cho từng câu hỏi (dùng chung cho single + batch)
const questionItemSchema: Schema = {
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
            description: "Loại câu hỏi: MULTIPLE_CHOICE (trắc nghiệm 4 đáp án), ESSAY (tự luận viết dài), TRUE_FALSE (đúng/sai cụm 4 mệnh đề), FILL_IN_BLANK (điền khuyết/nhập kết quả ngắn), READING_COMPREHENSION (câu hỏi dựa trên passage đọc hiểu)"
        },
        options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Danh sách 4 lựa chọn (A, B, C, D) cho câu hỏi MULTIPLE_CHOICE. Nội dung đáp án không bao gồm chữ cái tiền tố 'A.', 'B.'"
        },
        trueFalseStatements: {
            type: SchemaType.ARRAY,
            description: "Danh sách các mệnh đề Đúng/Sai cho câu hỏi TRUE_FALSE. Thường có 4 mệnh đề a, b, c, d.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    label: {
                        type: SchemaType.STRING,
                        description: "Nhãn mệnh đề: 'a', 'b', 'c', 'd'"
                    },
                    statement: {
                        type: SchemaType.STRING,
                        description: "Nội dung mệnh đề"
                    }
                },
                required: ["label", "statement"]
            }
        },
        passageTitle: {
            type: SchemaType.STRING,
            description: "Tiêu đề của đoạn văn bản đọc hiểu (nếu có, chỉ cho READING_COMPREHENSION)"
        },
        passageContent: {
            type: SchemaType.STRING,
            description: "Nội dung đoạn văn bản/ngữ liệu dùng chung cho nhóm câu hỏi đọc hiểu. Chỉ gán cho câu hỏi ĐẦU TIÊN trong nhóm đọc hiểu cùng passage."
        },
        passageGroupId: {
            type: SchemaType.STRING,
            description: "ID nhóm passage (VD: 'passage_1', 'passage_2'). Tất cả câu hỏi thuộc cùng 1 đoạn đọc hiểu phải có cùng passageGroupId."
        },
        subjectHint: {
            type: SchemaType.STRING,
            description: "Gợi ý môn học phát hiện từ đề: 'toan', 'ngu_van', 'anh_van', 'ly', 'hoa', 'sinh', 'su', 'dia', 'gdcd', 'tin_hoc'"
        }
    },
    required: ["index", "content", "type"]
};

const questionSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        subjectHint: {
            type: SchemaType.STRING,
            description: "Môn học chung của toàn bộ đề thi (nếu xác định được): 'toan', 'ngu_van', 'anh_van', 'ly', 'hoa', 'sinh', 'su', 'dia', 'gdcd', 'tin_hoc'"
        },
        questions: {
            type: SchemaType.ARRAY,
            description: "Danh sách câu hỏi trích xuất từ tài liệu.",
            items: questionItemSchema
        }
    },
    required: ["questions"]
};

const batchQuestionsSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        examCode: {
            type: SchemaType.STRING,
            description: "Mã đề thi phát hiện được (ví dụ '123', '0525'), hoặc null nếu không tìm thấy"
        },
        subjectHint: {
            type: SchemaType.STRING,
            description: "Môn học chung của toàn bộ đề thi: 'toan', 'ngu_van', 'anh_van', 'ly', 'hoa', 'sinh', 'su', 'dia', 'gdcd', 'tin_hoc'"
        },
        questions: {
            type: SchemaType.ARRAY,
            description: "Danh sách các câu hỏi hoàn chỉnh từ các trang",
            items: questionItemSchema
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
            questionId: {
                type: SchemaType.STRING,
                description: "ID duy nhất (UUID) của câu hỏi trong cơ sở dữ liệu"
            },
            correctAnswer: {
                type: SchemaType.STRING,
                description: "Đáp án đúng (A, B, C, D hoặc DSDS đối với trắc nghiệm, hoặc nội dung đáp án chi tiết/hướng dẫn chấm đối với câu hỏi tự luận)"
            }
        },
        required: ["questionId", "correctAnswer"]
    }
};

// ================== OCR METADATA & RELIABILITY INTERFACES ==================

export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface OCRBlock {
    lineIndex: number;
    text: string;
    confidence: number;
    bbox: BoundingBox;
    page?: number;
    riskLevel?: RiskLevel;
    problems?: string[];
    rawOCR?: string;
    verifiedText?: string;
    verificationMethod?: "OCR_ONLY" | "TARGETED_VISION" | "FULL_VISION";
}

export interface OCRPageResult {
    pageNumber: number;
    fullText: string;
    avgConfidence: number;
    blocks: OCRBlock[];
    reliabilityScore: number;
}

/**
 * Tầng 1 & 2: OCR Quality Analyzer & Risk Assessment theo mức độ rủi ro ngữ nghĩa
 */
export function analyzeOCRBlockRisk(block: OCRBlock): { riskLevel: RiskLevel; problems: string[] } {
    const problems: string[] = [];
    let riskLevel: RiskLevel = "LOW";
    const text = block.text.trim();

    // Risk 1: HIGH Risk patterns (Số thứ tự câu, Thang điểm, Đáp án trắc nghiệm A/B/C/D, Số liệu, Công thức toán)
    const isQuestionHeader = /^(câu|bài|question)\s*\d+/i.test(text);
    const isScore = /\d+([.,]\d+)?\s*(điểm|pt|m)/i.test(text);
    const isOptionLetter = /^[A-D][.\/:\-–\)]\s*/.test(text);
    const hasMathFormula = /[x-zX-Z]\s*[\^²³\+\-\*=]/u.test(text);

    if (isQuestionHeader || isScore || isOptionLetter || hasMathFormula) {
        riskLevel = "HIGH";
    } else if (/\b(không|chưa|chẳng|tác giả|bài thơ|truyện|tác phẩm)\b/i.test(text)) {
        riskLevel = "MEDIUM";
    }

    // Tầng 1 Check: Confidence thấp hơn ngưỡng tin cậy
    if (block.confidence < 0.85) {
        problems.push("LOW_CONFIDENCE");
    }

    // Tầng 2 Check: Ký tự lạ hoặc tỷ lệ ký hiệu bất thường
    if (text.length > 20) {
        const abnormalMatch = text.match(/[^\p{L}\p{N}\s.,;:!?'"“”‘’()[\]{}\-+/%=]/gu);
        const abnormalRatio = (abnormalMatch ? abnormalMatch.length : 0) / text.length;
        if (abnormalRatio > 0.25) {
            problems.push("HIGH_SYMBOL_RATIO");
        }
    }

    return { riskLevel, problems };
}

/**
 * Tầng 2: Tính toán OCR Reliability Score đa chiều
 * Score = 50% Avg Confidence + 50% Structure Score - Risk Penalty
 */
export function computeOCRPageReliability(blocks: OCRBlock[]): number {
    if (!blocks || blocks.length === 0) return 0;

    const confidences = blocks.map(b => b.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    let validStructureCount = 0;
    let highRiskProblemCount = 0;

    for (const b of blocks) {
        const analysis = analyzeOCRBlockRisk(b);
        b.riskLevel = analysis.riskLevel;
        b.problems = analysis.problems;

        if (analysis.problems.length === 0) validStructureCount++;
        if (analysis.riskLevel === "HIGH" && analysis.problems.length > 0) {
            highRiskProblemCount++;
        }
    }

    const structureScore = validStructureCount / blocks.length;
    const riskPenalty = (highRiskProblemCount / blocks.length) * 0.3;

    return Math.max(0, Math.min(1, (0.5 * avgConfidence) + (0.5 * structureScore) - riskPenalty));
}

// ================== INTERFACES ==================

export type QuestionTypeValue = "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE" | "FILL_IN_BLANK" | "READING_COMPREHENSION";

export interface TrueFalseStatement {
    label: string; // "a", "b", "c", "d"
    statement: string;
    isCorrect?: boolean; // Sẽ được fill bởi đáp án (không parse từ đề)
}

export interface ParsedQuestion {
    index: number;
    content: string;
    type: QuestionTypeValue;
    options?: string[]; // Cho MULTIPLE_CHOICE
    correctAnswer?: string; // "A", "B", "C", "D" hoặc text cho FILL_IN_BLANK
    trueFalseStatements?: TrueFalseStatement[]; // Cho TRUE_FALSE
    passageTitle?: string; // Cho READING_COMPREHENSION
    passageContent?: string; // Nội dung passage (chỉ câu đầu tiên trong nhóm)
    passageGroupId?: string; // ID nhóm passage
    subjectHint?: string; // Gợi ý môn học
}

// ================== SHARED PROMPT & MAPPER ==================

const VALID_QUESTION_TYPES: QuestionTypeValue[] = [
    "MULTIPLE_CHOICE", "ESSAY", "TRUE_FALSE", "FILL_IN_BLANK", "READING_COMPREHENSION"
];

/**
 * Chuẩn hóa type string từ AI response thành QuestionTypeValue
 */
function normalizeQuestionType(raw: string): QuestionTypeValue {
    const upper = (raw || "").toUpperCase().trim();
    if (VALID_QUESTION_TYPES.includes(upper as QuestionTypeValue)) return upper as QuestionTypeValue;
    // Fallback heuristics
    if (upper.includes("TRUE") || upper.includes("FALSE") || upper.includes("DUNG") || upper.includes("SAI")) return "TRUE_FALSE";
    if (upper.includes("FILL") || upper.includes("BLANK") || upper.includes("DIEN")) return "FILL_IN_BLANK";
    if (upper.includes("READING") || upper.includes("COMPREHENSION") || upper.includes("DOC_HIEU")) return "READING_COMPREHENSION";
    if (upper.includes("MULTIPLE") || upper.includes("CHOICE") || upper.includes("TRAC_NGHIEM")) return "MULTIPLE_CHOICE";
    return "ESSAY";
}

/**
 * Dọn dẹp và chuẩn hóa định dạng Markdown & LaTeX công thức toán
 */
function cleanMarkdownAndLatex(text: string): string {
    if (!text) return "";
    let s = text.trim();
    // Chuẩn hóa ký hiệu LaTeX \( ... \) -> $ ... $, \[ ... \] -> $$ ... $$
    s = s.replace(/\\\((.*?)\\\)/g, "$$1$");
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, "$$$$1$$$$");
    return s;
}

/**
 * Loại bỏ các tiền tố trùng lặp trong nội dung câu hỏi (VD: "Câu 1:", "Bài 2.", "Question 3:")
 */
function sanitizeQuestionContent(content: string): string {
    if (!content) return "";
    let clean = cleanMarkdownAndLatex(content);
    clean = clean.replace(/^(câu|bài|question)\s*\d+[\s.:\-–]*/i, "");
    return clean.trim();
}

/**
 * Loại bỏ các tiền tố đáp án (VD: "A. ", "B/ ", "C: ", "D - ")
 */
function sanitizeOptionText(opt: string): string {
    if (!opt) return "";
    let clean = cleanMarkdownAndLatex(opt);
    clean = clean.replace(/^[A-Da-d][.\/:\-–\)]\s*/, "");
    return clean.trim();
}

/**
 * Map kết quả AI (raw JSON item) thành ParsedQuestion kèm chuẩn hóa định dạng
 */
function mapAiItemToParsedQuestion(item: any, fallbackIndex: number, globalSubjectHint?: string): ParsedQuestion {
    const type = normalizeQuestionType(item.type);
    const content = sanitizeQuestionContent(item.content || "");

    let options: string[] | undefined = undefined;
    if (type === "MULTIPLE_CHOICE" && Array.isArray(item.options) && item.options.length > 0) {
        options = item.options.map((opt: any) => sanitizeOptionText(String(opt || "")));
    }

    let trueFalseStatements: TrueFalseStatement[] | undefined = undefined;
    if (type === "TRUE_FALSE" && Array.isArray(item.trueFalseStatements)) {
        const defaultLabels = ["a", "b", "c", "d"];
        trueFalseStatements = item.trueFalseStatements.map((s: any, idx: number) => ({
            label: s.label || defaultLabels[idx] || `${idx + 1}`,
            statement: cleanMarkdownAndLatex(s.statement || ""),
            isCorrect: undefined
        }));
    }

    return {
        index: item.index || fallbackIndex,
        content,
        type,
        options,
        correctAnswer: undefined,
        trueFalseStatements,
        passageTitle: item.passageTitle ? cleanMarkdownAndLatex(item.passageTitle) : undefined,
        passageContent: item.passageContent ? cleanMarkdownAndLatex(item.passageContent) : undefined,
        passageGroupId: item.passageGroupId || undefined,
        subjectHint: item.subjectHint || globalSubjectHint || undefined
    };
}

/**
 * Prompt hướng dẫn nhận diện đa dạng câu hỏi theo chương trình GDPT Việt Nam
 */
function buildMultiSubjectPrompt(mode: "single" | "batch"): string {
    const batchExtra = mode === "batch" ? `
Chú ý: Các tệp đính kèm là các trang liên tiếp của MỘT đề thi. Bạn phải nối các trang lại với nhau thành danh sách các câu hỏi hoàn chỉnh.
Đồng thời, hãy tìm "Mã đề" của đề thi này. Mã đề thường nằm ở đầu hoặc cuối trang (ví dụ "Mã đề 123", "Mã đề thi 0525").
` : "";

    return `
Bạn là một chuyên gia nhận dạng và phân tích đề thi giáo dục Việt Nam (GDPT 2025).
Nhiệm vụ: Đọc toàn bộ tài liệu đính kèm và trích xuất thành danh sách câu hỏi có cấu trúc.
${batchExtra}
=== PHÂN LOẠI CÂU HỎI (type) ===

1. **MULTIPLE_CHOICE**: Trắc nghiệm có 4 đáp án A, B, C, D. Rất phổ biến trong Toán, Lý, Hóa, Sinh, Sử, Địa, GDCD, Ngoại ngữ.
   → Trích xuất 4 đáp án vào mảng \`options\` (không bao gồm tiền tố "A.", "B.").

2. **TRUE_FALSE**: Câu hỏi Đúng/Sai dạng cụm mệnh đề. Thường gặp trong đề Toán THPT.
   → Cấu trúc đặc trưng: Phần dẫn chung + 4 mệnh đề (a, b, c, d) cần đánh giá Đúng hoặc Sai.
   → \`content\` = phần dẫn chung (VD: "Cho hàm số y = f(x) có đạo hàm liên tục...").
   → Trích xuất 4 mệnh đề vào \`trueFalseStatements\` (mỗi item có \`label\` và \`statement\`).
   → KHÔNG trích xuất đáp án (Đúng/Sai) — sẽ được tải lên riêng.

3. **FILL_IN_BLANK**: Điền khuyết / Trả lời ngắn. Phổ biến trong Toán (tính kết quả) và Ngoại ngữ (điền từ).
   → Câu hỏi yêu cầu nhập một đáp án ngắn (số, từ, cụm từ).
   → Dấu hiệu: "Kết quả là ___", "Điền vào chỗ trống", câu hỏi yêu cầu tính toán ra 1 đáp số.
   → \`content\` chứa toàn bộ nội dung câu hỏi. KHÔNG có \`options\`.

4. **READING_COMPREHENSION**: Câu hỏi đọc hiểu dựa trên 1 đoạn văn bản chung (passage/ngữ liệu).
   → Rất phổ biến trong Ngữ văn (phần Đọc hiểu) và Ngoại ngữ (Reading).
   → Cấu trúc: 1 đoạn văn bản → nhiều câu hỏi bên dưới.
   → Gán \`passageGroupId\` giống nhau cho tất cả câu hỏi thuộc cùng 1 passage (VD: "passage_1", "passage_2").
   → Chỉ gán \`passageContent\` và \`passageTitle\` cho câu hỏi ĐẦU TIÊN trong nhóm.
   → Câu hỏi đọc hiểu có thể là trắc nghiệm hoặc tự luận — phân loại dựa trên nội dung câu hỏi:
      * Nếu có 4 đáp án A/B/C/D → dùng MULTIPLE_CHOICE (KHÔNG dùng READING_COMPREHENSION)
      * Nếu không có đáp án chọn → dùng READING_COMPREHENSION
      * Câu hỏi reading có passage thì vẫn gán passageGroupId/passageContent dù type là MULTIPLE_CHOICE.

5. **ESSAY**: Tự luận viết dài. Phổ biến trong Ngữ văn (phần Nghị luận) và các môn xã hội.
   → Câu hỏi yêu cầu viết đoạn văn, bài văn, trình bày quan điểm.
   → \`content\` chứa toàn bộ yêu cầu.

=== NHẬN DẠNG THEO MÔN HỌC ===

Hãy xác định \`subjectHint\` cho toàn bộ đề (ở mức top-level) dựa trên tiêu đề hoặc nội dung:
- "toan": Toán học (hàm số, hình học, đại số, xác suất)
- "ngu_van": Ngữ văn (đọc hiểu, nghị luận, phân tích văn học)
- "anh_van": Tiếng Anh / Ngoại ngữ
- "ly": Vật lý
- "hoa": Hóa học
- "sinh": Sinh học
- "su": Lịch sử
- "dia": Địa lý
- "gdcd": Giáo dục công dân
- "tin_hoc": Tin học / Lập trình

=== QUY TẮC HIỆU CHỈNH LỖI OCR NGHĨA VĂN BẢN (SEMANTIC HEALING) ===

1. TỰ ĐỘNG KHÔI PHỤC LỖI TỪ NGHĨA DO PHÔNG IN NGHIÊNG VÀ NÉT BÚT TÔ ĐÈ:
   - Khi văn bản được trích xuất từ OCR có lỗi do phông in nghiêng hoặc vết bút mực đè lên (VD: "tấm bản" -> "văn bản", "[...J" -> "[...]", "giam cầm.|Nó" -> "giam cầm. Nó", "được tôn vinh" -> "được hậu thế tôn vinh"), bạn PHẢI tự động hiệu chỉnh dựa trên ngữ cảnh chuẩn xác của bài đọc hiểu.
   - Giữ đúng cấu trúc xuống dòng, đoạn văn (1), (2), (3)... và nội dung gốc của bài đọc.

=== QUY TẮC CHUNG ===

1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.", "Question X".
2. KHÔNG nhận diện hay trích xuất đáp án đúng (correctAnswer) — sẽ được tải lên riêng.
3. Phải trả về TẤT CẢ các câu hỏi, không bỏ sót. Đọc kỹ từ đầu đến cuối tài liệu.
4. Bảo toàn nguyên vẹn nội dung (không viết tắt, không bỏ sót).
5. Định dạng Markdown cho mã nguồn, công thức, bảng biểu trong \`content\`:
   - Dùng block code (3 backticks) cho mã nguồn, KHÔNG viết trên cùng dòng.
   - Dùng Markdown table cho bảng số liệu.
   - Mô tả biểu đồ/hình vẽ bằng text nếu không thể hiển thị.
6. Đặc biệt chú ý đề Toán: phân biệt rõ 3 dạng (trắc nghiệm 4 đáp án, Đúng/Sai cụm mệnh đề, Điền khuyết).
7. Đặc biệt chú ý đề Ngữ văn: tách rõ phần Đọc hiểu (READING_COMPREHENSION/MULTIPLE_CHOICE + passage) và phần Nghị luận (ESSAY).
8. Đặc biệt chú ý đề Ngoại ngữ: nhận dạng phần Reading (có passage), phần Vocabulary/Grammar (MULTIPLE_CHOICE), phần Writing (ESSAY), phần Pronunciation (MULTIPLE_CHOICE).
`;
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
 * OCR trích xuất text từ ảnh bằng tiếng Việt (Ưu tiên Sharp + Local PaddleOCR, Fallback Tesseract.js)
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
    try {
        // 1. Tiền xử lý ảnh qua Sharp trước khi đưa vào OCR
        const processedBuffer = await optimizeImageForOCR(buffer);

        // 2. Thử gọi API sang Local PaddleOCR Service (http://localhost:8000/api/v1/ocr)
        try {
            const formData = new FormData();
            formData.append("file", new Blob([new Uint8Array(processedBuffer)]), "image.png");

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout cho ảnh dung lượng lớn/độ phân giải cao

            const ocrUrl = process.env.PADDLE_OCR_SERVICE_URL || "http://localhost:8000/api/v1/ocr";
            console.log(`🚀 Attempting Local PaddleOCR at ${ocrUrl}...`);

            const response = await fetch(ocrUrl, {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data && data.text && data.text.trim().length > 0) {
                    console.log(`✅ Local PaddleOCR succeeded (${data.linesCount || 0} lines extracted)`);
                    return data.text;
                }
            }
        } catch (paddleErr) {
            console.warn("⚠️ Local PaddleOCR service not available or timed out, falling back to Tesseract.js...", paddleErr);
        }

        // 3. Fallback về Tesseract.js nếu Local PaddleOCR chưa được bật
        console.log("Running Tesseract OCR fallback on processed image...");
        const result = await Tesseract.recognize(processedBuffer, "vie");
        return result.data.text;
    } catch (error) {
        console.error("Lỗi khi OCR ảnh:", error);
        throw new Error("Không thể nhận diện chữ từ hình ảnh.");
    }
}

/**
 * Đọc TRỰC TIẾP file bằng Gemini Vision — Nhận diện đa dạng câu hỏi (GDPT 2025)
 */
export async function parseQuestionsFromFile(buffer: Buffer, mimeType: string): Promise<ParsedQuestion[]> {
    try {
        console.log(`🧠 [Direct Gemini Vision] Calling Gemini 2.5 Flash for file parsing (${mimeType})...`);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: questionSchema,
                temperature: 0.2
            }
        });

        const prompt = buildMultiSubjectPrompt("single");

        let finalBuffer = buffer;
        if (mimeType.startsWith("image/")) {
            finalBuffer = await optimizeImageForOCR(buffer);
        }

        const filePart = {
            inlineData: {
                data: finalBuffer.toString("base64"),
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, filePart]);
        const responseText = result.response.text();

        let parsed: any;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            const objMatch = responseText.match(/\{[\s\S]*\}/);
            const arrMatch = responseText.match(/\[[\s\S]*\]/);
            if (objMatch) {
                parsed = JSON.parse(objMatch[0]);
            } else if (arrMatch) {
                parsed = { questions: JSON.parse(arrMatch[0]) };
            } else {
                throw new Error("Invalid JSON format from AI");
            }
        }

        const globalSubjectHint = parsed.subjectHint || undefined;
        const questionsArray = Array.isArray(parsed.questions) ? parsed.questions : (Array.isArray(parsed) ? parsed : []);

        console.log(`✅ [Direct Gemini Vision] Thành công bóc được ${questionsArray.length} câu hỏi từ ảnh/tài liệu.`);
        return questionsArray.map((item: any, i: number) =>
            mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint)
        );

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

            console.log(`🧠 Calling Groq Llama 3.3 fallback for multi-subject file parsing...`);
            const groqPrompt = buildMultiSubjectPrompt("single");
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `${groqPrompt}

Dưới đây là nội dung văn bản trích xuất từ tài liệu:
${text}

Trả về JSON theo cấu trúc:
{
  "subjectHint": "toan" hoặc "ngu_van" hoặc ...,
  "questions": [
    {
      "index": 1,
      "content": "Nội dung câu hỏi",
      "type": "MULTIPLE_CHOICE | TRUE_FALSE | FILL_IN_BLANK | READING_COMPREHENSION | ESSAY",
      "options": ["...", "..."],
      "trueFalseStatements": [{"label": "a", "statement": "..."}],
      "passageGroupId": "passage_1",
      "passageTitle": "...",
      "passageContent": "..."
    }
  ]
}`
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

            const globalSubjectHint = parsedObj.subjectHint || undefined;
            const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];
            return questionsArray.map((item: any, i: number) =>
                mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint)
            );
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
    subjectHint: string | null;
}

/**
 * Đọc TRỰC TIẾP NHIỀU file cùng lúc bằng Gemini Vision — Nhận diện đa dạng câu hỏi (GDPT 2025)
 */
export async function parseQuestionsFromFilesBatch(files: { buffer: Buffer, mimeType: string }[]): Promise<BatchParsedResult> {
    try {
        if (files.length === 0) return { questions: [], examCode: null, subjectHint: null };

        console.log(`🧠 [Direct Gemini Vision Batch] Calling Gemini 2.5 Flash for ${files.length} file(s)...`);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: batchQuestionsSchema,
                temperature: 0.2
            }
        });

        const prompt = buildMultiSubjectPrompt("batch");

        const fileParts = await Promise.all(files.map(async f => ({
            inlineData: {
                data: (f.mimeType.startsWith("image/") ? await optimizeImageForOCR(f.buffer) : f.buffer).toString("base64"),
                mimeType: f.mimeType
            }
        })));

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

        const globalSubjectHint = parsed.subjectHint || null;
        const questionsArray = Array.isArray(parsed.questions) ? parsed.questions : [];
        const formattedQuestions = questionsArray.map((item: any, i: number) =>
            mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint || undefined)
        );

        console.log(`✅ [Direct Gemini Vision Batch] Bóc tách thành công ${formattedQuestions.length} câu hỏi từ ${files.length} file(s).`);
        return {
            questions: formattedQuestions,
            examCode: parsed.examCode || null,
            subjectHint: globalSubjectHint
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

            console.log(`🧠 Calling Groq Llama 3.3 fallback for multi-subject batch parsing...`);
            const groqPrompt = buildMultiSubjectPrompt("batch");
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: `${groqPrompt}

Dưới đây là nội dung văn bản trích xuất từ các trang liên tiếp:
${joinedText}

Trả về JSON theo cấu trúc:
{
  "examCode": "123" hoặc null,
  "subjectHint": "toan" hoặc "ngu_van" hoặc ...,
  "questions": [
    {
      "index": 1,
      "content": "Nội dung câu hỏi",
      "type": "MULTIPLE_CHOICE | TRUE_FALSE | FILL_IN_BLANK | READING_COMPREHENSION | ESSAY",
      "options": ["...", "..."],
      "trueFalseStatements": [{"label": "a", "statement": "..."}],
      "passageGroupId": "passage_1",
      "passageTitle": "...",
      "passageContent": "..."
    }
  ]
}`
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

            const globalSubjectHint = parsedObj.subjectHint || null;
            const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];
            const formattedQuestions = questionsArray.map((item: any, i: number) =>
                mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint || undefined)
            );

            return {
                questions: formattedQuestions,
                examCode: parsedObj.examCode || null,
                subjectHint: globalSubjectHint
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

export async function parseAnswerKeyFromImageOld(
    buffer: Buffer,
    mimeType: string,
    targetExamCode: string | null,
    existingQuestions?: { id: string; index: number; content: string; type: string }[]
): Promise<Record<string, string>> {
    const examCodeInstruction = targetExamCode ? `LƯU Ý QUAN TRỌNG: Bạn chỉ được trích xuất đáp án cho Mã đề thi là "${targetExamCode}". Hãy tìm đúng cột hoặc phần văn bản của mã đề này.` : `Nếu ảnh có nhiều cột mã đề, hãy tự động chọn cột mã đề đầu tiên.`;

    const questionsInfo = existingQuestions && existingQuestions.length > 0
        ? `\nDưới đây là danh sách các câu hỏi đã có trong đề thi (đã được sắp xếp tuần tự theo thứ tự xuất hiện từ trên xuống dưới):\n${existingQuestions.map(q => `- ID: ${q.id} - Câu ${q.index} (Loại: ${q.type}): ${q.content.slice(0, 120)}...`).join("\n")}
LƯU Ý QUAN TRỌNG VỀ ĐỐI KHỚP:
- Đề thi tự luận/Ngữ văn thường chia làm các phần (Ví dụ: Phần I Đọc hiểu có các Câu 1, 2, 3, 4 và Phần II Làm văn/Viết có các Câu 1, 2).
- Tuy nhiên trong CSDL, toàn bộ các câu hỏi này được xếp tuần tự thành danh sách phẳng (ví dụ: các câu đọc hiểu là từ 1 đến 4, câu làm văn sẽ là câu thứ 5, 6...).
- Do đó, hãy trích xuất các đáp án từ tài liệu tải lên theo thứ tự xuất hiện từ trên xuống dưới của chúng, rồi gán lần lượt cho các ID câu hỏi trong danh sách CSDL ở trên theo đúng thứ tự tuyến tính (ví dụ: đáp án đầu tiên tương ứng ID câu thứ 1, đáp án thứ hai tương ứng ID câu thứ 2... đáp án của Phần II Câu 1 tương ứng ID câu thứ 5).
- Hãy đối khớp kỹ lưỡng nội dung câu hỏi và ngữ cảnh để gán chính xác ID câu hỏi dạng UUID làm khóa chính cho đáp án đó.
- YÊU CẦU QUAN TRỌNG VỀ ĐỊNH DẠNG ĐÁP ÁN TỰ LUẬN (ESSAY):
  * Đối với các câu hỏi tự luận/làm văn có đáp án chứa nhiều ý nhỏ (như a, b... hoặc Ý 1, Ý 2...), bạn PHẢI GIỮ NGUYÊN cấu trúc cụm đáp án gốc, KHÔNG được phép rút gọn hay tự ý viết lại.
  * Phải bảo toàn toàn bộ ký tự xuống dòng (sử dụng định dạng danh sách liệt kê bằng Markdown hoặc các dòng riêng biệt kết thúc bằng ký tự '\\n') để nội dung hiển thị phân dòng rõ ràng, ngăn nắp. TUYỆT ĐỐI không được gộp các dòng lại thành một hàng duy nhất hoặc một đoạn văn liền mạch, gây khó đọc cho sinh viên.
- YÊU CẦU BỎ QUA CÂU HỎI KHÔNG CÓ TRONG FILE:
  * Ảnh/tài liệu này có thể chỉ là một phần (một trang) của bảng đáp án. Chỉ trích xuất những câu hỏi thực sự xuất hiện đáp án trong file này.
  * Đối với những câu hỏi KHÔNG xuất hiện đáp án trong file này, bạn TUYỆT ĐỐI KHÔNG được đưa vào kết quả trả về (không tạo key JSON cho chúng, không trả về giá trị kiểu "Không có thông tin", "Không tìm thấy", v.v.).`
        : "";

    console.log("Running Tesseract OCR on answer key image...");
    const text = await extractTextFromImage(buffer);
    if (!text || text.trim().length === 0) {
        throw new Error("Không thể trích xuất văn bản từ hình ảnh đáp án.");
    }

    console.log(`🧠 Calling Groq Llama 3.3 for answer key parsing (Direct OCR Mode)...`);
    let responseText = "[]";
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: `
Dưới đây là văn bản được trích xuất (OCR) từ một hình ảnh bảng đáp án bằng Tiếng Việt.
Nhiệm vụ của bạn là trích xuất bảng đáp án từ dữ liệu này.
${examCodeInstruction}
${questionsInfo}

Văn bản OCR:
${text}

Quy tắc trả về:
- Cấu trúc JSON phải là một dictionary: key là "questionId" (ID câu hỏi dạng UUID từ danh sách câu hỏi đã cho), value là "đáp án đúng" (A, B, C, D hoặc DSDS đối với trắc nghiệm, hoặc nội dung đáp án mẫu chi tiết đối với câu hỏi tự luận).
- Ví dụ:
{
  "uuid-cua-cau-1": "A",
  "uuid-cua-cau-2": "Nội dung đáp án mẫu chi tiết của câu tự luận..."
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
                questionId: key,
                correctAnswer: val
            }));
            responseText = JSON.stringify(arrayFormat);
        } catch (fallbackError: any) {
            console.error("❌ Fallback answer key to Groq also failed:", fallbackError.message);
            throw new Error(`Fallback Answer Key Error: ${fallbackError.message}`);
        }

    let parsed: Record<string, string> = {};
    try {
        const parsedArray = JSON.parse(responseText);
        if (Array.isArray(parsedArray)) {
            for (const item of parsedArray) {
                if (item.questionId && item.correctAnswer) {
                    parsed[String(item.questionId)] = String(item.correctAnswer);
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
                        if (item.questionId && item.correctAnswer) {
                            parsed[String(item.questionId)] = String(item.correctAnswer);
                        }
                    }
                }
            } catch (e2) {}
        }
    }
    return parsed;
}

export async function parseAnswerKeyFromExcel(
    buffer: Buffer,
    targetExamCode: string | null,
    existingQuestions?: { id: string; index: number; content: string; type: string }[]
): Promise<Record<string, string>> {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csvData = xlsx.utils.sheet_to_csv(sheet);

    const examCodeInstruction = targetExamCode ? `LƯU Ý QUAN TRỌNG: Chỉ trích xuất cột đáp án dành cho Mã đề thi là "${targetExamCode}".` : `If file has multiple columns of exam codes, take the first column of exam codes.`;

    const questionsInfo = existingQuestions && existingQuestions.length > 0
        ? `\nDưới đây là danh sách các câu hỏi đã có trong đề thi (đã được sắp xếp tuần tự theo thứ tự xuất hiện từ trên xuống dưới):\n${existingQuestions.map(q => `- ID: ${q.id} - Câu ${q.index} (Loại: ${q.type}): ${q.content.slice(0, 120)}...`).join("\n")}
LƯU Ý QUAN TRỌNG VỀ ĐỐI KHỚP:
- Đề thi tự luận/Ngữ văn thường chia làm các phần (Ví dụ: Phần I Đọc hiểu có các Câu 1, 2, 3, 4 và Phần II Làm văn/Viết có các Câu 1, 2).
- Tuy nhiên trong CSDL, toàn bộ các câu hỏi này được xếp tuần tự thành danh sách phẳng (ví dụ: các câu đọc hiểu là từ 1 đến 4, câu làm văn sẽ là câu thứ 5, 6...).
- Do đó, hãy trích xuất các đáp án từ tài liệu tải lên theo thứ tự xuất hiện từ trên xuống dưới của chúng, rồi gán lần lượt cho các ID câu hỏi trong danh sách CSDL ở trên theo đúng thứ tự tuyến tính (ví dụ: đáp án đầu tiên tương ứng ID câu thứ 1, đáp án thứ hai tương ứng ID câu thứ 2... đáp án của Phần II Câu 1 tương ứng ID câu thứ 5).
- Hãy đối khớp kỹ lưỡng nội dung câu hỏi và ngữ cảnh để gán chính xác ID câu hỏi dạng UUID làm khóa chính cho đáp án đó.
- YÊU CẦU QUAN TRỌNG VỀ ĐỊNH DẠNG ĐÁP ÁN TỰ LUẬN (ESSAY):
  * Đối với các câu hỏi tự luận/làm văn có đáp án chứa nhiều ý nhỏ (như a, b... hoặc Ý 1, Ý 2...), bạn PHẢI GIỮ NGUYÊN cấu trúc cụm đáp án gốc, KHÔNG được phép rút gọn hay tự ý viết lại.
  * Phải bảo toàn toàn bộ ký tự xuống dòng (sử dụng định dạng danh sách liệt kê bằng Markdown hoặc các dòng riêng biệt kết thúc bằng ký tự '\\n') để nội dung hiển thị phân dòng rõ ràng, ngăn nắp. TUYỆT ĐỐI không được gộp các dòng lại thành một hàng duy nhất hoặc một đoạn văn liền mạch, gây khó đọc cho sinh viên.`
        : "";

    const prompt = `
Dưới đây là dữ liệu CSV được xuất từ một file Excel chứa bảng đáp án.
Nhiệm vụ của bạn là trích xuất bảng đáp án từ dữ liệu này.
${examCodeInstruction}
${questionsInfo}

Dữ liệu CSV:
${csvData}

Quy tắc trả về:
- Cấu trúc JSON phải là một dictionary: key là "questionId" (ID câu hỏi dạng UUID từ danh sách câu hỏi đã cho ở trên), value là "đáp án đúng" (A, B, C, D hoặc DSDS đối với trắc nghiệm, hoặc nội dung đáp án mẫu chi tiết đối với câu hỏi tự luận).
- Ví dụ:
{
  "uuid-cua-cau-1": "A",
  "uuid-cua-cau-2": "Nội dung đáp án mẫu chi tiết của câu tự luận..."
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
        const parsedObj = JSON.parse(responseText);
        for (const [key, val] of Object.entries(parsedObj)) {
            if (key && val) {
                parsed[String(key)] = String(val);
            }
        }
    } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsedObj = JSON.parse(jsonMatch[0]);
                for (const [key, val] of Object.entries(parsedObj)) {
                    if (key && val) {
                        parsed[String(key)] = String(val);
                    }
                }
            } catch (e2) {}
        }
    }
    return parsed;
}

/**
 * Phân tích nội dung của 1 câu hỏi cụ thể để tìm options, đáp án, và phân loại type
 */
function parseSingleQuestionText(rawContent: string, index: number): ParsedQuestion {
    // 0. Kiểm tra TRUE_FALSE pattern: "a)", "b)", "c)", "d)" với ngữ cảnh Đúng/Sai
    const trueFalseHeaderRegex = /(?:đúng|sai|Đúng|Sai|TRUE|FALSE|đ\/s|Đ\/S)/i;
    const subItemRegex = /(?:^|\n)\s*([a-d])\s*[.)]\s+([\s\S]+?)(?=(?:\n\s*[a-d]\s*[.)])|$)/gi;
    
    if (trueFalseHeaderRegex.test(rawContent)) {
        const subMatches: TrueFalseStatement[] = [];
        let subMatch;
        while ((subMatch = subItemRegex.exec(rawContent)) !== null) {
            subMatches.push({
                label: subMatch[1].toLowerCase(),
                statement: subMatch[2].trim()
            });
        }
        if (subMatches.length >= 2) {
            // Tách phần dẫn chung ra khỏi phần mệnh đề
            const firstSubIdx = rawContent.search(/(?:^|\n)\s*[a-d]\s*[.)]\s/i);
            const headerContent = firstSubIdx > 0 ? rawContent.substring(0, firstSubIdx).trim() : rawContent.trim();
            return {
                index,
                content: headerContent,
                type: "TRUE_FALSE",
                trueFalseStatements: subMatches
            };
        }
    }

    // 0b. Kiểm tra FILL_IN_BLANK pattern
    const fillBlankRegex = /(?:_{2,}|\.{3,}|điền\s+(?:vào|kết\s+quả)|kết\s+quả\s+(?:là|bằng)|fill\s+in)/i;
    if (fillBlankRegex.test(rawContent)) {
        // Chỉ phân loại FILL_IN_BLANK nếu KHÔNG có options A/B/C/D
        const hasOptions = /(?:^|\s)(?:[l1I])?[A-D]\s*[.)]\s/gm.test(rawContent);
        if (!hasOptions) {
            return {
                index,
                content: rawContent,
                type: "FILL_IN_BLANK"
            };
        }
    }

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

export function cleanString(str: string): string {
    return (str || "")
        .trim()
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n");
}

export function normalizeForComparison(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, "")
        .trim();
}

export function mergeAnswersWithOverlap(existing: string, newVal: string): string {
    const cleanExisting = cleanString(existing);
    const cleanNew = cleanString(newVal);

    if (!cleanExisting) return cleanNew;
    if (!cleanNew) return cleanExisting;

    // Check subset containment
    if (cleanExisting.includes(cleanNew)) return cleanExisting;
    if (cleanNew.includes(cleanExisting)) return cleanNew;

    // Check tail/head overlap similarity line-by-line
    const existingLines = cleanExisting.split("\n");
    const newLines = cleanNew.split("\n");

    const maxCheck = Math.min(existingLines.length, newLines.length, 10);
    let overlapCount = 0;

    for (let i = 1; i <= maxCheck; i++) {
        const tail = existingLines.slice(-i).join("\n");
        const head = newLines.slice(0, i).join("\n");
        if (normalizeForComparison(tail) === normalizeForComparison(head)) {
            overlapCount = i;
        }
    }

    if (overlapCount > 0) {
        console.log(`✂️ Detected overlap of ${overlapCount} lines between pages. Slicing overlap...`);
        return cleanExisting + "\n" + newLines.slice(overlapCount).join("\n");
    }

    return cleanExisting + "\n" + cleanNew;
}

function formatQuestionsForPrompt(existingQuestions: { id: string; index: number; content: string; type: string }[]): string {
    let readingCount = 0;
    let essayCount = 0;
    
    return existingQuestions.map((q) => {
        let partInfo = "";
        if (q.type === "READING_COMPREHENSION" || q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE" || q.type === "FILL_IN_BLANK") {
            readingCount++;
            partInfo = `Phần I (Đọc hiểu) - Câu ${readingCount}`;
        } else if (q.type === "ESSAY") {
            essayCount++;
            partInfo = `Phần II (Viết/Làm văn) - Câu ${essayCount}`;
        } else {
            partInfo = `Câu ${q.index}`;
        }
        
        return `- ID: ${q.id} [${partInfo}] (Loại: ${q.type}): "${q.content.slice(0, 150)}..."`;
    }).join("\n");
}

export async function parseAnswerKeyBatch(
    files: { buffer: Buffer; mimeType: string }[],
    targetExamCode: string | null,
    existingQuestions?: { id: string; index: number; content: string; type: string }[]
): Promise<Record<string, string>> {
    if (files.length === 0) return {};

    // 1. Calculate combined hash of all files for cache lookup
    const hashes = files.map(f => getSha256(f.buffer));
    hashes.sort();
    const questionIdsStr = existingQuestions ? existingQuestions.map(q => q.id).join(",") : "";
    const combinedHash = getSha256(Buffer.from(hashes.join("|") + `|code:${targetExamCode || ""}|qIds:${questionIdsStr}`));

    // 2. Query OCR cache first
    const cached = await getCachedOcr(combinedHash);
    if (cached) {
        console.log(`💾 Answer Key Batch Cache Hit for hash ${combinedHash}`);
        try {
            return JSON.parse(cached.text);
        } catch (e) {
            console.error("Failed to parse cached answer key JSON:", e);
        }
    }

    console.log(`🆕 Cache Miss for combined hash ${combinedHash}. Requesting Gemini Vision Batch...`);

    const examCodeInstruction = targetExamCode 
        ? `LƯU Ý QUAN TRỌNG: Bạn chỉ được trích xuất đáp án cho Mã đề thi là "${targetExamCode}". Hãy tìm đúng cột hoặc phần văn bản của mã đề này.` 
        : `Nếu ảnh/tài liệu có nhiều cột mã đề, hãy tự động chọn cột mã đề đầu tiên.`;

    const formattedQuestionsInfo = existingQuestions && existingQuestions.length > 0
        ? `\nDưới đây là danh sách các câu hỏi đã có trong đề thi (đã được sắp xếp tuần tự theo thứ tự xuất hiện từ trên xuống dưới):\n${formatQuestionsForPrompt(existingQuestions)}
LƯU Ý QUAN TRỌNG VỀ ĐỐI KHỚP:
- Đề thi tự luận/Ngữ văn thường chia làm các phần (Ví dụ: Phần I Đọc hiểu có các Câu 1, 2, 3, 4 và Phần II Làm văn/Viết có các Câu 1, 2).
- Tuy nhiên trong CSDL, toàn bộ các câu hỏi này được xếp tuần tự thành danh sách phẳng (ví dụ: các câu đọc hiểu là từ 1 đến 4, câu làm văn sẽ là câu thứ 5, 6...).
- Do đó, hãy trích xuất các đáp án từ tài liệu tải lên theo thứ tự xuất hiện từ trên xuống dưới của chúng, rồi gán lần lượt cho các ID câu hỏi trong danh sách CSDL ở trên theo đúng thứ tự tuyến tính (ví dụ: đáp án đầu tiên tương ứng ID câu thứ 1, đáp án thứ hai tương ứng ID câu thứ 2... đáp án của Phần II Câu 1 tương ứng ID câu thứ 5).
- Hãy đối khớp kỹ lưỡng nội dung câu hỏi và ngữ cảnh để gán chính xác ID câu hỏi dạng UUID làm khóa chính cho đáp án đó.
- YÊU CẦU QUAN TRỌNG VỀ ĐỊNH DẠNG ĐÁP ÁN TỰ LUẬN (ESSAY/READING_COMPREHENSION):
  * Bạn phải xây dựng Rubric chi tiết cho từng câu tự luận/đọc hiểu.
  * Phải tách rõ yêu cầu chung (general) và các tiêu chí cụ thể (criteria) kèm điểm số của từng ý (ví dụ: Ý 1.1: 0.5đ, Ý 1.2: 1.0đ...).
  * Phải bảo toàn toàn bộ ký tự xuống dòng (sử dụng định dạng danh sách liệt kê bằng Markdown) để nội dung hiển thị phân dòng rõ ràng, ngăn nắp.
- YÊU CẦU BỎ QUA CÂU HỎI KHÔNG CÓ TRONG FILE:
  * Nếu một câu hỏi KHÔNG xuất hiện đáp án trong tài liệu, bạn TUYỆT ĐỐI KHÔNG được đưa vào kết quả trả về (không tạo key JSON cho chúng).`
        : "";

    const answerKeyBatchSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
            answers: {
                type: SchemaType.ARRAY,
                description: "Danh sách đáp án trích xuất từ các trang tài liệu.",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        uuid: {
                            type: SchemaType.STRING,
                            description: "ID UUID của câu hỏi trong CSDL"
                        },
                        pageStart: {
                            type: SchemaType.INTEGER,
                            description: "Trang bắt đầu có đáp án của câu hỏi này (1-based)"
                        },
                        pageEnd: {
                            type: SchemaType.INTEGER,
                            description: "Trang kết thúc đáp án của câu hỏi này (1-based)"
                        },
                        answer: {
                            type: SchemaType.STRING,
                            description: "Nội dung đáp án đúng hoặc đáp án mẫu chi tiết. Giữ nguyên markdown, xuống dòng."
                        },
                        rubric: {
                            type: SchemaType.OBJECT,
                            description: "Rubric chấm điểm chi tiết (chỉ dành cho câu hỏi tự luận/đọc hiểu).",
                            properties: {
                                general: {
                                    type: SchemaType.STRING,
                                    description: "Yêu cầu chung về hình thức, ngôn ngữ, dung lượng..."
                                },
                                criteria: {
                                    type: SchemaType.ARRAY,
                                    description: "Danh sách các tiêu chí chấm điểm cụ thể.",
                                    items: {
                                        type: SchemaType.OBJECT,
                                        properties: {
                                            label: {
                                                type: SchemaType.STRING,
                                                description: "Nhãn tiêu chí (VD: 'Ý 1.1', 'Nội dung', 'Nghệ thuật')"
                                            },
                                            description: {
                                                type: SchemaType.STRING,
                                                description: "Mô tả chi tiết yêu cầu đạt điểm của tiêu chí này"
                                            },
                                            score: {
                                                type: SchemaType.NUMBER,
                                                description: "Điểm số tối đa của tiêu chí này"
                                            }
                                        },
                                        required: ["label", "description", "score"]
                                    }
                                },
                                totalScore: {
                                    type: SchemaType.NUMBER,
                                    description: "Tổng điểm của câu hỏi này"
                                }
                            },
                            required: ["general", "criteria", "totalScore"]
                        }
                    },
                    required: ["uuid", "answer"]
                }
            }
        },
        required: ["answers"]
    };

    try {
        console.log(`🧠 [Direct Gemini Vision AnswerKey] Calling Gemini 2.5 Flash for ${files.length} file(s)...`);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: answerKeyBatchSchema,
                temperature: 0.2
            }
        });

        const prompt = `
Bạn là chuyên gia nhận dạng đáp án đề thi giáo dục Việt Nam.
Nhiệm vụ: Trích xuất các đáp án từ các trang hình ảnh/PDF đính kèm dưới đây (chúng là các trang liên tiếp của cùng một tài liệu đáp án) và ánh xạ chúng vào các ID câu hỏi thích hợp trong CSDL.
LƯU Ý QUAN TRỌNG:
- Đây là các trang liên tiếp. Hãy ghép nối nội dung liền mạch nếu đáp án của một câu kéo dài qua nhiều trang (ví dụ: bắt đầu ở cuối trang 2 và tiếp tục ở trang 3).
- Không được coi mỗi trang là một tài liệu độc lập.
- Nếu một câu hỏi không có đáp án xuất hiện, KHÔNG sinh nội dung cho câu đó. Nếu không chắc chắn, trả về null (hoặc bỏ qua). Không đoán bừa.
${examCodeInstruction}
${formattedQuestionsInfo}
`;

        const fileParts = await Promise.all(files.map(async f => ({
            inlineData: {
                data: (f.mimeType.startsWith("image/") ? await optimizeImageForOCR(f.buffer) : f.buffer).toString("base64"),
                mimeType: f.mimeType
            }
        })));

        const result = await model.generateContent([prompt, ...fileParts]);
        const responseText = result.response.text();
        console.log("📊 Gemini Batch Answer Key Extraction Response:", responseText);

        const parsedObj = JSON.parse(responseText);
        const answersArray = Array.isArray(parsedObj.answers) ? parsedObj.answers : [];

        const finalResult: Record<string, string> = {};
        for (const item of answersArray) {
            if (item.uuid && item.answer) {
                const q = existingQuestions?.find(itemQ => itemQ.id === item.uuid);
                if (q && (q.type === "ESSAY" || q.type === "READING_COMPREHENSION") && item.rubric) {
                    finalResult[item.uuid] = JSON.stringify({
                        isRubric: true,
                        pageStart: item.pageStart || null,
                        pageEnd: item.pageEnd || null,
                        answer: item.answer,
                        rubric: item.rubric
                    });
                } else {
                    finalResult[item.uuid] = item.answer;
                }
            }
        }

        // Lưu vào DB Cache
        await setCachedOcr(combinedHash, "image", JSON.stringify(finalResult), {
            textLength: responseText.length,
            wordCount: answersArray.length,
            vietnameseRatio: 1.0
        });

        console.log(`✅ [Direct Gemini Vision AnswerKey] Khớp thành công ${Object.keys(finalResult).length} câu hỏi.`);
        return finalResult;
    } catch (error: any) {
        console.error("❌ parseAnswerKeyBatch error:", error);
        throw error;
    }
}

export async function parseAnswerKeyFromImage(
    buffer: Buffer,
    mimeType: string,
    targetExamCode: string | null,
    existingQuestions?: { id: string; index: number; content: string; type: string }[]
): Promise<Record<string, string>> {
    return parseAnswerKeyBatch([{ buffer, mimeType }], targetExamCode, existingQuestions);
}
