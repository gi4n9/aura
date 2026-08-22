import sharp from "sharp";
import Tesseract from "tesseract.js";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as xlsx from "xlsx";
import Groq from "groq-sdk";
import { getSha256, getCachedOcr, setCachedOcr } from "./ocr-cache";
import { optimizeImageForOCR } from "./image-preprocessor";
import { callLocalGeminiJSON } from "./local-gemini";

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
            description: "Nội dung câu hỏi bằng tiếng Việt, công thức toán/ký hiệu BẮT BUỘC viết dưới dạng LaTeX $...$ hoặc $$...$$. Bao gồm cả mã nguồn, bảng biểu."
        },
        type: {
            type: SchemaType.STRING,
            description: "Loại câu hỏi: MULTIPLE_CHOICE (trắc nghiệm 4 đáp án), ESSAY (tự luận viết dài), TRUE_FALSE (đúng/sai cụm 4 mệnh đề), FILL_IN_BLANK (điền khuyết/nhập kết quả ngắn), READING_COMPREHENSION (câu hỏi dựa trên passage đọc hiểu)"
        },
        options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Danh sách 4 lựa chọn (A, B, C, D) cho câu hỏi MULTIPLE_CHOICE (định dạng công thức toán trong $...$ nếu có). Nội dung đáp án không bao gồm chữ cái tiền tố 'A.', 'B.'"
        },
        trueFalseStatements: {
            type: SchemaType.ARRAY,
            description: "Danh sách các mệnh đề Đúng/Sai cho câu hỏi TRUE_FALSE. Thường có 4 mệnh đề a, b, c, d (công thức toán kẹp trong $...$).",
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
        },
        imageBbox: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
            description: "Tọa độ [ymin, xmin, ymax, xmax] (thang đo chuẩn hóa từ 0 đến 1000) CHỈ bao quanh vùng HÌNH VẼ MINH HỌA, ĐỒ THỊ, HÌNH HỌC KHÔNG GIAN, BẢNG BIẾN THIÊN, BẢNG BIỂU trong đề. BẮT ĐẦU từ mép trên của hình vẽ/bảng (KHÔNG bao gồm phần văn bản câu hỏi ở trên) và KÉO XUỐNG HẾT mép dưới cùng của hình vẽ/bảng (bao gồm cả các đỉnh đáy A'B'C'D', nhãn điểm, mũi tên, hàng cuối của bảng). ĐỂ RỖNG [] nếu câu hỏi không có hình vẽ/bảng minh họa."
        },
        pageIndex: {
            type: SchemaType.INTEGER,
            description: "Chỉ số trang (0-indexed) chứa hình vẽ này trong danh sách tệp đính kèm."
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
    contentImageUrl?: string; // URL hoặc Data URL ảnh cắt hình vẽ/bảng biến thiên
    imageBbox?: number[]; // [ymin, xmin, ymax, xmax] tọa độ 0-1000
    pageIndex?: number; // Chỉ số trang
}

// ================== CROP ẢNH MINH HỌA TỰ ĐỘNG ==================

export async function extractImageCrop(
    buffer: Buffer,
    bbox?: number[]
): Promise<string | undefined> {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) return undefined;
    const [ymin, xmin, ymax, xmax] = bbox;
    if (ymax <= ymin || xmax <= xmin) return undefined;

    try {
        const metadata = await sharp(buffer).metadata();
        if (!metadata.width || !metadata.height) return undefined;

        // Bbox chuẩn hóa theo thang 0-1000
        const top = Math.max(0, Math.floor((ymin / 1000) * metadata.height));
        const left = Math.max(0, Math.floor((xmin / 1000) * metadata.width));
        const bottom = Math.min(metadata.height, Math.ceil((ymax / 1000) * metadata.height));
        const right = Math.min(metadata.width, Math.ceil((xmax / 1000) * metadata.width));

        const rawWidth = right - left;
        const rawHeight = bottom - top;

        if (rawWidth < 15 || rawHeight < 15) return undefined;

        // Padding tối ưu:
        // Top: 0 padding để tuyệt đối không dính dòng chữ câu hỏi ở trên
        // Bottom: padding 5% + 15px để bao trọn đỉnh đáy, mũi tên, hàng cuối của bảng biến thiên
        // Left/Right: padding 3% + 10px để không cắt xén nhãn bên
        const cropLeft = Math.max(0, left - (Math.floor(rawWidth * 0.03) + 10));
        const cropTop = Math.max(0, top); // Tuyệt đối không pad lên trên để tránh dính chữ đề bài
        const cropRight = Math.min(metadata.width, right + (Math.floor(rawWidth * 0.03) + 10));
        const cropBottom = Math.min(metadata.height, bottom + (Math.floor(rawHeight * 0.05) + 15));

        const cropWidth = cropRight - cropLeft;
        const cropHeight = cropBottom - cropTop;

        // Xử lý làm nét (sharpening), tăng độ tương phản và supersampling chống vỡ ảnh khi zoom
        let pipeline = sharp(buffer).extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight });

        if (cropWidth < 900) {
            pipeline = pipeline.resize({
                width: Math.min(1800, Math.max(cropWidth * 2, 900)),
                kernel: "lanczos3"
            });
        }

        const cropped = await pipeline
            .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 }) // Làm nét viền vẽ hình học & chữ số trong bảng biểu
            .png({ quality: 100, compressionLevel: 6 })
            .toBuffer();

        return `data:image/png;base64,${cropped.toString("base64")}`;
    } catch (err) {
        console.warn("⚠️ extractImageCrop error:", err);
        return undefined;
    }
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
    if (upper.includes("READING") || upper.includes("COMPREHENSION") || upper.includes("DOC_HIEU")) return "READING_COMPREHENSION";
    if (upper.includes("MULTIPLE") || upper.includes("CHOICE") || upper.includes("TRAC_NGHIEM")) return "MULTIPLE_CHOICE";
    if (upper.includes("FILL") || upper.includes("BLANK") || upper.includes("DIEN")) return "FILL_IN_BLANK";
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
async function mapAiItemToParsedQuestion(
    item: any, 
    fallbackIndex: number, 
    globalSubjectHint?: string,
    fileBuffer?: Buffer
): Promise<ParsedQuestion> {
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

    let contentImageUrl: string | undefined = undefined;
    if (fileBuffer && item.imageBbox && Array.isArray(item.imageBbox) && item.imageBbox.length === 4) {
        contentImageUrl = await extractImageCrop(fileBuffer, item.imageBbox);
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
        subjectHint: item.subjectHint || globalSubjectHint || undefined,
        contentImageUrl,
        imageBbox: item.imageBbox || undefined,
        pageIndex: typeof item.pageIndex === "number" ? item.pageIndex : undefined
    };
}

/**
 * Prompt hướng dẫn nhận diện đa dạng câu hỏi theo chương trình GDPT Việt Nam
 */
function buildMultiSubjectPrompt(mode: "single" | "batch"): string {
    const batchExtra = mode === "batch" ? `
Chú ý: Các tệp đính kèm là các trang liên tiếp của MỘT đề thi. Bạn phải nối các trang lại với nhau thành danh sách các câu hỏi hoàn chỉnh.
Đồng thời, hãy tìm "Mã đề" của đề thi này. Mã đề thường nằm ở đầu hoặc cuối trang (ví dụ "Mã đề 123", "Mã đề thi 0525", "Mã đề: 0103").
` : "";

    return `
Bạn là một chuyên gia nhận dạng và phân tích đề thi giáo dục Việt Nam (GDPT 2025).
Nhiệm vụ: Đọc toàn bộ tài liệu đính kèm và trích xuất thành danh sách câu hỏi có cấu trúc.
${batchExtra}
=== QUY TẮC BẮT BUỘC VỀ ĐỊNH DẠNG LATEX CHO TOÁN HỌC & KÝ HIỆU KHOA HỌC ===
Mọi công thức toán học, ký hiệu, số mũ, chỉ số dưới, vector, hàm số, phương trình, tích phân, hình học BẮT BUỘC PHẢI VIẾT BẰNG LATEX kẹp trong $...$ (inline) hoặc $$...$$ (block):
1. **Chỉ số dưới (Subscript)**: Viết dạng $u_1$, $u_2$, $u_n$, $u_4 = u_1 \cdot q^3$, $A_1, A_2, \dots, A_{12}$, $A(1; 5; 1)$, $B(3; 3; 1)$, $P(A)$, $P(B)$, $P(AB)$, $Oxyz$.
2. **Chỉ số trên / Số mũ (Superscript)**: Viết dạng $x^2$, $x^3$, $4x^3$, $f'(x)$, $g'(x)$, $0.001x^3 + 30x + 10$, $S = \\{1; 9\\}$.
3. **Vector**: Viết dạng $\\vec{AB}$, $\\vec{CD}$, $\\vec{D'C'}$, $\\vec{AA'}$, $\\vec{AD}$, $\\vec{MN}$.
4. **Phân số**: Viết dạng $\\frac{ax+b}{cx+d}$, $\\frac{1}{3}x^3 - 5x^2 + 9x + 8$, $\\frac{37}{3}$, $\\frac{H}{50}$, $\\frac{x^2}{1.5^2} + \\frac{y^2}{1^2} = 1$.
5. **Tích phân & Nguyên hàm**: Viết dạng $\\int f(x)dx = \\sin x + C$, $\\int_a^b f(t)dt$, $\\int [3 + f(x)]dx$.
6. **Logarit & Căn bậc hai**: Viết dạng $\\log_3(x-1) = 1$, $\\sqrt{x}$.
7. **Hệ phương trình & Tập hợp**: $\\begin{cases} x+y-3 < 0 \\\\ x-y+1 > 0 \\end{cases}$, $\\mathbb{R}$, $\\{0; 1; 2; 3; \\dots; 20\\}$.
8. **Bảng biến thiên / Bảng số liệu**: Dùng định dạng Markdown Table chuẩn kết hợp LaTeX trong các ô, HOẶC xác định tọa độ \`imageBbox\` để cắt ảnh bảng biến thiên.

=== QUY TẮC TRÍCH XUẤT HÌNH VẼ / BẢNG BIẾN THIÊN / BẢNG SỐ LIỆU / ĐA GIÁC (imageBbox) ===
ĐẶC BIỆT CHÚ Ý: Phải focus CHÍNH XÁC vào hình vẽ/bảng biểu, TUYỆT ĐỐI KHÔNG cắt dính câu hỏi chữ bên trên:
1. **BẢNG BIẾN THIÊN & BẢNG SỐ LIỆU & BẢNG Ô VUÔNG**:
   - \`ymin\` (mép trên): BẮT BUỘC đặt tại đường kẻ ngang trên cùng của khung bảng (hàng đầu tiên chứa chữ $x$ hoặc tiêu đề bảng). TUYỆT ĐỐI KHÔNG bắt đầu từ dòng chữ câu hỏi ở trên ("Câu 4: Cho hàm số y = f(x)...").
   - \`ymax\` (mép dưới): BẮT BUỘC kéo qua đường kẻ đáy dưới cùng của bảng (chứa hàng $y$ và các giá trị $-\\infty, +\\infty$, mũi tên đi xuống).
2. **HÌNH ĐA GIÁC & HÌNH HỌC KHÔNG GIAN & KHỐI TRÒN XOAY (Hình lập phương ABCD.A'B'C'D', đa giác 12 đỉnh A1..A12, khối elip...)**:
   - \`ymin\` (mép trên): BẮT BUỘC đặt tại đỉnh cao nhất của hình (ví dụ đỉnh $A_1$, đỉnh $A$). TUYỆT ĐỐI KHÔNG lấy phần chữ "Câu 1: Cho đa giác đều..." ở trên.
   - \`ymax\` (mép dưới): BẮT BUỘC kéo qua đỉnh thấp nhất của hình (các đỉnh đáy $A', B', C', D'$).
   - \`xmin, xmax\`: Bao trọn các đỉnh và nhãn ngoài cùng bên trái và bên phải của hình.
3. \`pageIndex\` (0, 1, 2...): Trang chứa hình vẽ trong danh sách tệp đính kèm.
4. Nếu câu hỏi KHÔNG có hình vẽ/bảng minh họa trong đề, để \`imageBbox: []\`.

=== PHÂN LOẠI CÂU HỎI (type) ===

1. **MULTIPLE_CHOICE**: Trắc nghiệm có 4 đáp án A, B, C, D (Đặc trưng của Đề Toán Phần I).
   → Trích xuất 4 đáp án vào mảng \`options\` (không bao gồm tiền tố "A.", "B."). Công thức toán trong options cũng viết bằng LaTeX $...$.

2. **TRUE_FALSE**: Câu hỏi Đúng/Sai dạng cụm 4 mệnh đề a, b, c, d (Đặc trưng của Đề Toán Phần II).
   → \`content\` = phần dẫn chung (VD: "Trong không gian xét hệ tọa độ Oxyz...").
   → Trích xuất 4 mệnh đề vào \`trueFalseStatements\` (mỗi item có \`label\` và \`statement\`). Mệnh đề chứa công thức toán viết bằng LaTeX $...$.
   → KHÔNG trích xuất đáp án (Đúng/Sai) — sẽ được tải lên riêng.

3. **ESSAY**: Tự luận / Câu trả lời ngắn tính toán giải trình (Đặc trưng của Đề Toán Phần III - PHẦN 3 LA MÃ và bài tập tự luận).
   → \`content\` = toàn bộ câu hỏi và yêu cầu bài toán.
   → KHÔNG có \`options\`. Học viên sẽ tự luận giải và nhập kết quả.

4. **FILL_IN_BLANK**: Điền khuyết từ / cụm từ (Chủ yếu cho Ngoại ngữ).

5. **READING_COMPREHENSION**: Câu hỏi đọc hiểu dựa trên 1 đoạn văn bản chung (passage/ngữ liệu).
   → Gán \`passageGroupId\` giống nhau cho tất cả câu hỏi thuộc cùng 1 passage.
   → Chỉ gán \`passageContent\` và \`passageTitle\` cho câu hỏi ĐẦU TIÊN trong nhóm.

=== NHẬN DẠNG THEO MÔN HỌC ===

Hãy xác định \`subjectHint\` cho toàn bộ đề (ở mức top-level): "toan", "ngu_van", "anh_van", "ly", "hoa", "sinh", "su", "dia", "gdcd", "tin_hoc".

=== QUY TẮC CHUNG ===
1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.", "Question X".
2. KHÔNG nhận diện hay trích xuất đáp án đúng (correctAnswer) — sẽ được tải lên riêng.
3. Phải trả về TẤT CẢ các câu hỏi, không bỏ sót. Đọc kỹ từ đầu đến cuối tài liệu.
4. Bảo toàn nguyên vẹn nội dung, biểu thức và ký hiệu toán học.
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
        return await Promise.all(
            questionsArray.map((item: any, i: number) =>
                mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint, mimeType.startsWith("image/") ? buffer : undefined)
            )
        );

    } catch (error) {
        console.warn("⚠️ Gemini failed (parseQuestionsFromFile), falling back to OCR + Local Gemini 3.6 Flash...", error);
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

            console.log(`🧠 Calling Local Gemini 3.6 Flash fallback for multi-subject file parsing...`);
            const groqPrompt = buildMultiSubjectPrompt("single");
            const promptContent = `${groqPrompt}\n\nDưới đây là nội dung văn bản trích xuất từ tài liệu:\n${text}\n\nTrả về JSON theo đúng cấu trúc yêu cầu.`;

            const parsedObj = await callLocalGeminiJSON<any>({
                messages: [{ role: "user", content: promptContent }],
                model: "gemini-3.6-flash",
                temperature: 0.1,
            }, { questions: [] });

            const globalSubjectHint = parsedObj.subjectHint || undefined;
            const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];
            return await Promise.all(
                questionsArray.map((item: any, i: number) =>
                    mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint, mimeType.startsWith("image/") ? buffer : undefined)
                )
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
        const formattedQuestions = await Promise.all(
            questionsArray.map((item: any, i: number) => {
                let targetBuf: Buffer | undefined = undefined;
                if (typeof item.pageIndex === "number" && files[item.pageIndex]) {
                    targetBuf = files[item.pageIndex].mimeType.startsWith("image/") ? files[item.pageIndex].buffer : undefined;
                } else if (files[0]?.mimeType.startsWith("image/")) {
                    targetBuf = files[0].buffer;
                }
                return mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint || undefined, targetBuf);
            })
        );

        console.log(`✅ [Direct Gemini Vision Batch] Bóc tách thành công ${formattedQuestions.length} câu hỏi từ ${files.length} file(s).`);
        return {
            questions: formattedQuestions,
            examCode: parsed.examCode || null,
            subjectHint: globalSubjectHint
        };

    } catch (error) {
        console.warn("⚠️ Gemini failed (parseQuestionsFromFilesBatch), falling back to OCR + Local Gemini 3.6 Flash...", error);
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

            console.log(`🧠 Calling Local Gemini 3.6 Flash fallback for multi-subject batch parsing...`);
            const groqPrompt = buildMultiSubjectPrompt("batch");
            const promptContent = `${groqPrompt}\n\nDưới đây là nội dung văn bản trích xuất từ các trang liên tiếp:\n${joinedText}\n\nTrả về JSON theo đúng cấu trúc yêu cầu.`;
            const parsedObj = await callLocalGeminiJSON<any>({
                messages: [{ role: "user", content: promptContent }],
                model: "gemini-3.6-flash",
                temperature: 0.1,
            }, { questions: [] });

            const globalSubjectHint = parsedObj.subjectHint || null;
            const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];
            const formattedQuestions = await Promise.all(
                questionsArray.map((item: any, i: number) => {
                    let targetBuf: Buffer | undefined = undefined;
                    if (typeof item.pageIndex === "number" && files[item.pageIndex]) {
                        targetBuf = files[item.pageIndex].mimeType.startsWith("image/") ? files[item.pageIndex].buffer : undefined;
                    } else if (files[0]?.mimeType.startsWith("image/")) {
                        targetBuf = files[0].buffer;
                    }
                    return mapAiItemToParsedQuestion(item, i + 1, globalSubjectHint || undefined, targetBuf);
                })
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

    console.log("🧠 Calling Local Gemini 3.6 Flash for answer key parsing (Direct OCR Mode)...");
    let responseText = "[]";
    try {
        const promptContent = `
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
`;
        const parsedObj = await callLocalGeminiJSON({
            messages: [{ role: "user", content: promptContent }],
            model: "gemini-3.6-flash",
            temperature: 0.1,
        }, {});
        const arrayFormat = Object.entries(parsedObj).map(([key, val]) => ({
            questionId: key,
            correctAnswer: val
        }));
        responseText = JSON.stringify(arrayFormat);
    } catch (fallbackError: any) {
        console.error("❌ Fallback answer key to Local Gemini also failed:", fallbackError.message);
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
        ? `\nDưới đây là danh sách các câu hỏi đã có trong đề thi (đã được sắp xếp tuần tự theo thứ tự xuất hiện từ trên xuống dưới):\n${existingQuestions.map(q => `- ID: ${q.id} - Câu ${q.index} (Loại: ${q.type}): ${q.content.slice(0, 120)}...`).join("\n")}`
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

    console.log(`🧠 Calling Local Gemini 3.6 Flash for Excel answer key...`);
    let responseText = "{}";
    try {
        const parsedObj = await callLocalGeminiJSON({
            messages: [{ role: "user", content: prompt }],
            model: "gemini-3.6-flash",
            temperature: 0.1,
        }, {});
        responseText = JSON.stringify(parsedObj);
    } catch (error: any) {
        console.error("❌ Lỗi gọi Local Gemini Excel cho bảng đáp án:", error.message);
        throw new Error(`Local Gemini Excel Answer Key Error: ${error.message}`);
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
