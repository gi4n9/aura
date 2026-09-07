import sharp from "sharp";
import Tesseract from "tesseract.js";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as xlsx from "xlsx";
import Groq from "groq-sdk";
import { getSha256, getCachedOcr, setCachedOcr } from "./ocr-cache";
import { optimizeImageForOCR } from "./image-preprocessor";
import { callLocalGeminiJSON, cleanAndParseGeminiJSON } from "./local-gemini";
import { formatMathForDisplay } from "./math-formatter";

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
        hasImage: {
            type: SchemaType.BOOLEAN,
            description: "true nếu câu hỏi có hình vẽ minh họa, hình học không gian, đồ thị hàm số, bảng biến thiên, hoặc bảng số liệu trong đề bài; ngược lại false."
        },
        imageBbox: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
            description: "Tọa độ [ymin, xmin, ymax, xmax] nếu có (tùy chọn). ĐỂ RỖNG [] nếu không có."
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
    hasImage?: boolean; // Câu hỏi có hình vẽ/bảng biểu minh họa
    contentImageUrl?: string; // URL hoặc Data URL ảnh cắt hình vẽ/bảng biến thiên
    imageBbox?: number[]; // [ymin, xmin, ymax, xmax] tọa độ 0-1000
    pageIndex?: number; // Chỉ số trang
}

// ================== CROP ẢNH MINH HỌA TỰ ĐỘNG ==================

export async function extractImageCrop(
    buffer: Buffer,
    bbox?: number[],
    textBlocks?: any[]
): Promise<string | undefined> {
    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4) return undefined;
    const [ymin, xmin, ymax, xmax] = bbox;
    if (ymax <= ymin || xmax <= xmin) return undefined;

    // 1. Ưu tiên gọi Local Python OCR / CV Refinement Service (OpenCV Line Detection & Text Conflict Resolver)
    try {
        const baseUrl = process.env.PADDLE_OCR_SERVICE_URL || "http://localhost:8000/api/v1/ocr";
        const refineUrl = baseUrl.replace(/\/api\/v1\/ocr\/?$/, "/api/v1/refine-bbox");
        
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: "image/png" });
        formData.append("file", blob, "image.png");
        formData.append("ymin", String(ymin));
        formData.append("xmin", String(xmin));
        formData.append("ymax", String(ymax));
        formData.append("xmax", String(xmax));
        if (textBlocks && Array.isArray(textBlocks) && textBlocks.length > 0) {
            formData.append("text_blocks_json", JSON.stringify(textBlocks));
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

        const response = await fetch(refineUrl, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.crop_base64) {
                console.log(`🎯 [CV Refine] Tinh chỉnh BBox thành công: [${ymin}, ${xmin}, ${ymax}, ${xmax}] -> [${data.refined_bbox_norm.join(", ")}] (${data.method})`);
                return data.crop_base64;
            }
        } else {
            console.warn(`⚠️ [CV Refine Service] HTTP ${response.status}: Vui lòng khởi động lại PaddleOCR Server để cập nhật endpoint mới!`);
        }
    } catch (err: any) {
        // Fallback sang sharp cục bộ nếu Python service chưa bật hoặc timeout
    }

    // 2. Fallback sang Sharp với thuật toán căn biên an toàn
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

        // Căn lề an toàn:
        // Top: Tuyệt đối không pad lên trên để không dính dòng chữ câu hỏi ở trên
        // Bottom: Padding 8% + 22px để bao trọn đáy hàng y, mũi tên và giá trị cực trị
        // Left/Right: Mở rộng thêm lề ngang (8-12%) để không cắt xén nhãn bên trái hoặc công thức bên phải
        const cropLeft = Math.max(0, left - (Math.floor(rawWidth * 0.08) + 20));
        const cropTop = Math.max(0, top); // Không pad lên trên
        const cropRight = Math.min(metadata.width, right + (Math.floor(rawWidth * 0.12) + 35));
        const cropBottom = Math.min(metadata.height, bottom + (Math.floor(rawHeight * 0.08) + 22));

        const cropWidth = cropRight - cropLeft;
        const cropHeight = cropBottom - cropTop;

        // Xử lý làm nét cực đại (Ultra HD), tăng độ tương phản và supersampling chống vỡ hạt khi zoom
        let pipeline = sharp(buffer).extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight });

        const targetW = Math.max(1400, cropWidth);
        const scale = Math.min(3.5, Math.max(1.0, targetW / cropWidth));
        if (scale > 1.05) {
            pipeline = pipeline.resize({
                width: Math.min(2000, Math.round(cropWidth * scale)),
                kernel: "lanczos3"
            });
        }

        const cropped = await pipeline
            .linear(1.15, -8) // Darkens faint text strokes & enhances contrast
            .sharpen({ sigma: 1.2, m1: 1.6, m2: 0.5 })
            .png({ quality: 100, compressionLevel: 6 })
            .toBuffer();

        return `data:image/png;base64,${cropped.toString("base64")}`;
    } catch (err) {
        console.warn("⚠️ extractImageCrop fallback error:", err);
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
    s = formatMathForDisplay(s);
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
 * Loại bỏ các tiền tố đáp án (VD: "A. ", "B/ ", "C: ") nhưng bảo toàn 100% chuỗi thứ tự/sắp xếp
 */
function sanitizeOptionText(opt: string): string {
    if (!opt) return "";
    let clean = cleanMarkdownAndLatex(opt);
    // TUYỆT ĐỐI KHÔNG cắt nếu là chuỗi thứ tự/sắp xếp như a-b-c, b-c-a, e-b-a-c-d, 1-2-3...
    if (/^[a-zA-Z0-9]\s*[-–—]\s*[a-zA-Z0-9]/.test(clean.trim())) {
        return clean.trim();
    }
    // Chỉ cắt tiền tố nhãn đáp án chuẩn: "A. ", "B) ", "C: "
    clean = clean.replace(/^[A-Da-d]\s*[.):]\s*/, "");
    clean = clean.replace(/^[A-D]\s*[-–]\s+/, "");
    return clean.trim();
}

/**
 * Chuẩn hóa phân loại câu hỏi theo tên môn và dạng bài cụ thể
 * Tiếng Anh: E_..., Ngữ Văn: L_..., Toán: M_..., Vật lý: P_...
 */
export function determineQuestionClassification(
    item: any,
    globalSubjectHint?: string
): string {
    const rawHint = (item.subjectHint || "").trim();
    if (rawHint && /^[A-Z]{1,3}_[A-Za-z0-9_]+$/.test(rawHint)) {
        return rawHint;
    }

    const content = (item.content || "").toLowerCase();
    const sub = (globalSubjectHint || rawHint || "").toLowerCase();

    // 1. MÔN TIẾNG ANH (Tiền tố: E_)
    if (sub.includes("anh") || sub.includes("eng") || sub.startsWith("e_") || 
        /read the following passage|mark the letter|best arrangement|inhabitants of coastal|flyer|leaflet|green hands|warm their hearts/i.test(content)) {
        if (/arrangement of utterances|arrangement of sentences|best arrangement|cohesive and coherent/i.test(content)) {
            return "E_Sentence_Arrangement";
        }
        if (/blank|cloze|fits each of the numbered blanks|flyer|leaflet|green hands|warm their hearts/i.test(content)) {
            return "E_Cloze_Test";
        }
        if (/according to paragraph|in paragraph|closest in meaning|opposite in meaning|best title|inferred from|passage|paraphrases the underlined|not implied in paragraph/i.test(content) || item.passageGroupId) {
            return "E_Reading_Comprehension";
        }
        if (/pronunciation|stress|underlined part|vowel|consonant/i.test(content)) {
            return "E_Pronunciation_Stress";
        }
        if (/error|correction|needs correction|mistake/i.test(content)) {
            return "E_Error_Recognition";
        }
        if (/dialogue|conversation|exchange|response/i.test(content)) {
            return "E_Communication";
        }
        if (/closest in meaning to the following sentence|combine the two sentences|rewritten/i.test(content)) {
            return "E_Sentence_Transformation";
        }
        return "E_Grammar_Vocabulary";
    }

    // 2. MÔN NGỮ VĂN (Tiền tố: L_)
    if (sub.includes("van") || sub.startsWith("l_") || /đoạn trích|ngữ liệu|tác phẩm|nhà thơ|nhà văn|nhân vật|văn bản/i.test(content)) {
        if (/nghị luận xã hội|suy nghĩ của anh\/chị|đoạn văn khoảng 200 chữ|bài học rút ra/i.test(content)) {
            return "L_Social_Argument";
        }
        if (/phân tích|cảm nhận|giá trị nghệ thuật|giá trị hiện thực|chủ đề tác phẩm/i.test(content)) {
            return "L_Literary_Analysis";
        }
        if (/biện pháp tu từ|thành phần biệt lập|nghĩa của từ|liên kết câu/i.test(content)) {
            return "L_Vietnamese_Practice";
        }
        return "L_Reading_Comprehension";
    }

    // 3. MÔN TOÁN HỌC (Tiền tố: M_)
    if (sub.includes("toan") || sub.startsWith("m_") || item.type === "TRUE_FALSE" || /hàm số|đồ thị|tích phân|hình chóp|nghiệm|xác suất/i.test(content)) {
        if (item.type === "TRUE_FALSE" || (item.trueFalseStatements && item.trueFalseStatements.length > 0)) {
            return "M_True_False";
        }
        if (item.type === "FILL_IN_BLANK" || item.type === "ESSAY") {
            return "M_Short_Answer";
        }
        return "M_Multiple_Choice";
    }

    // 4. CÁC MÔN KHOA HỌC KHÁC
    if (sub.includes("ly") || sub.startsWith("p_")) return "P_Multiple_Choice";
    if (sub.includes("hoa") || sub.startsWith("c_")) return "C_Multiple_Choice";
    if (sub.includes("sinh") || sub.startsWith("b_")) return "B_Multiple_Choice";
    if (sub.includes("su") || sub.startsWith("h_")) return "H_Multiple_Choice";
    if (sub.includes("dia") || sub.startsWith("g_")) return "G_Multiple_Choice";
    if (sub.includes("gdcd") || sub.startsWith("cd_")) return "CD_Multiple_Choice";

    return rawHint || globalSubjectHint || "M_Multiple_Choice";
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
    const content = sanitizeQuestionContent(item.content || "");

    // Luôn trích xuất options nếu có
    let options: string[] | undefined = undefined;
    if (Array.isArray(item.options) && item.options.length > 0) {
        options = item.options.map((opt: any) => sanitizeOptionText(String(opt || "")));
    }

    let type = normalizeQuestionType(item.type);
    // Nếu câu hỏi có 4 lựa chọn options (kể cả câu đọc điền từ Cloze hay Đọc hiểu):
    // Bản chất tương tác làm bài là chọn đáp án đúng -> Chuẩn hóa type = "MULTIPLE_CHOICE"
    if (options && options.length > 0 && (type === "READING_COMPREHENSION" || type === "FILL_IN_BLANK")) {
        type = "MULTIPLE_CHOICE";
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

    let contentImageUrl: string | undefined = item.contentImageUrl || undefined;
    const finalSubjectHint = determineQuestionClassification(item, globalSubjectHint);

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
        subjectHint: finalSubjectHint,
        hasImage: item.hasImage === true || !!contentImageUrl,
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
3. **Vector**: BẮT BUỘC dùng \\overrightarrow{...} (tuyệt đối KHÔNG dùng \\vec) để mũi tên kéo dài bao trọn tất cả các điểm, ví dụ: $\\overrightarrow{AB}$, $\\overrightarrow{CD}$, $\\overrightarrow{C'D'}$, $\\overrightarrow{D'C'}$, $\\overrightarrow{A'A}$, $\\overrightarrow{A'D'}$, $\\overrightarrow{MN}$. Luôn kẹp trong $...$.
4. **Phân số**: Viết dạng $\\frac{ax+b}{cx+d}$, $\\frac{1}{3}x^3 - 5x^2 + 9x + 8$, $\\frac{37}{3}$, $\\frac{H}{50}$, $=== PHÂN LOẠI MÔN HỌC & DẠNG BÀI CHI TIẾT (subjectHint) ===
Mỗi câu hỏi BẮT BUỘC phải chỉ định mã \`subjectHint\` theo tiền tố môn học và dạng bài cụ thể:

1. MÔN TIẾNG ANH (Tiền tố E_):
- \`E_Pronunciation_Stress\`: Ngữ âm (Phát âm nguyên âm/phụ âm, trọng âm từ 2-3 âm tiết).
- \`E_Grammar_Vocabulary\`: Ngữ pháp & Từ vựng (thì, bị động, mệnh đề quan hệ, điều kiện, giả định, phrasal verbs, idioms...).
- \`E_Error_Recognition\`: Tìm lỗi sai cần sửa về ngữ pháp hoặc từ vựng.
- \`E_Communication\`: Chức năng giao tiếp (chọn câu đáp lại đoạn hội thoại ngắn hàng ngày).
- \`E_Sentence_Arrangement\`: Sắp xếp trật tự câu / phát ngôn (a, b, c, d, e) để tạo thành đoạn văn hoặc hội thoại mạch lạc (như Câu 1 - 5).
- \`E_Cloze_Test\`: Đọc điền từ vào chỗ trống trong đoạn văn, tờ rơi flyer, leaflet theo dạng trắc nghiệm chọn đáp án đúng A, B, C, D (như blanks 6 - 10, blanks 29 - 34, blanks 35 - 40).
- \`E_Reading_Comprehension\`: Đọc hiểu văn bản dài, trả lời câu hỏi ý chính, từ vựng, suy luận theo dạng trắc nghiệm chọn đáp án đúng A, B, C, D (như Câu 11 - 20, Câu 21 - 28).
- \`E_Sentence_Transformation\`: Câu đồng nghĩa và Kết hợp câu.

2. MÔN NGỮ VĂN (Tiền tố L_):
- \`L_Reading_Comprehension\`: Đọc hiểu văn bản / thơ / truyện.
- \`L_Social_Argument\`: Nghị luận xã hội (viết đoạn văn 200 chữ hoặc bài văn).
- \`L_Literary_Analysis\`: Nghị luận văn học (phân tích, cảm nhận tác phẩm).
- \`L_Vietnamese_Practice\`: Thực hành tiếng Việt (biện pháp tu từ, từ ngữ...).

3. MÔN TOÁN HỌC (Tiền tố M_):
- \`M_Multiple_Choice\`: Trắc nghiệm 4 lựa chọn A, B, C, D (Phần I).
- \`M_True_False\`: Trắc nghiệm Đúng/Sai cụm 4 mệnh đề a, b, c, d (Phần II).
- \`M_Short_Answer\`: Trắc nghiệm trả lời ngắn / điền số (Phần III).
- \`M_Essay\`: Tự luận giải toán.

4. CÁC MÔN KHOA HỌC KHÁC:
- Vật lý (\`P_\`): \`P_Multiple_Choice\`, \`P_True_False\`, \`P_Short_Answer\`
- Hóa học (\`C_\`): \`C_Multiple_Choice\`, \`C_True_False\`, \`C_Short_Answer\`
- Sinh học (\`B_\`): \`B_Multiple_Choice\`, \`B_True_False\`, \`B_Short_Answer\`
- Lịch sử (\`H_\`): \`H_Multiple_Choice\`, \`H_True_False\`, \`H_Short_Answer\`
- Địa lý (\`G_\`): \`G_Multiple_Choice\`, \`G_True_False\`, \`G_Short_Answer\`
- KTPL/GDCD (\`CD_\`): \`CD_Multiple_Choice\`, \`CD_True_False\`, \`CD_Short_Answer\`

=== QUY TẮC BẮT BUỘC VỀ TRẮC NGHIỆM ĐIỀN TỪ & ĐỌC HIỂU (CLOZE & READING) ===
1. TẤT CẢ các câu hỏi có phương án A, B, C, D (kể cả sắp xếp câu, đọc điền từ Cloze hay đọc hiểu Reading):
   - Đặt \`type: "MULTIPLE_CHOICE"\` (vì bản chất học sinh chọn 1 trong 4 đáp án đúng A, B, C, D).
   - BẮT BUỘC trích xuất 4 phương án vào mảng \`options\`: ["...", "...", "...", "..."] (loại bỏ tiền tố "A.", "B.", "C.", "D."). TUYỆT ĐỐI KHÔNG để trống options!
2. Đối với bài đọc chung (Passage, Flyer, Leaflet):
   - Gán \`passageGroupId\` giống nhau cho tất cả câu hỏi thuộc cùng ngữ liệu (VD: "passage_1", "passage_2"...).
   - Chỉ gán \`passageContent\` và \`passageTitle\` cho câu hỏi ĐẦU TIÊN trong nhóm.

=== QUY TẮC BẮT BUỘC VỀ YÊU CẦU ĐỀ BÀI (DIRECTIVES / INSTRUCTIONS) ===
Mỗi câu hỏi PHẢI ĐI KÈM YÊU CẦU ĐỀ BÀI để học sinh biết rõ nhiệm vụ cần thực hiện:
1. Đối với nhóm câu hỏi có lời chỉ dẫn chung (Ví dụ: từ Câu 1 đến 5 có chỉ dẫn "Mark the letter A, B, C or D on your answer sheet to indicate the best arrangement of utterances or sentences to make a cohesive and coherent exchange or text in each of the following questions from 1 to 5."):
   - BẮT BUỘC chèn lời chỉ dẫn này vào đầu trường \`content\` của TỪNG câu hỏi (dưới dạng in nghiêng), ví dụ:
     \`content\`: "*Mark the letter A, B, C or D on your answer sheet to indicate the best arrangement of utterances or sentences to make a cohesive and coherent exchange or text:*\\n\\na. Diner: Excuse me, I\'ve been waiting so long for my order.\\nb. Diner: Thanks for your help.\\nc. Waiter: I\'m sorry! I\'ll check with the kitchen and get back to you immediately."
2. Đối với câu hỏi đọc điền từ (Cloze test):
   - Trường \`content\` phải ghi rõ: "Choose the best option for blank (6):" (hoặc số thứ tự ô khuyết tương ứng).
3. Đối với câu hỏi đọc hiểu:
   - Trường \`content\` phải ghi đầy đủ toàn bộ câu hỏi trên đề thi.

=== QUY TẮC BẮT BUỘC VỀ THỨ TỰ PHƯƠNG ÁN A, B, C, D (OPTION ORDER INTEGRITY) ===
1. Giữ nguyên 100% THỨ TỰ CÁC PHƯƠNG ÁN A, B, C, D theo đúng nguyên bản đề thi.
2. TUYỆT ĐỐI KHÔNG tự ý sắp xếp lại phương án (Ví dụ: Câu 14 trên đề in A. [IV] B. [III] C. [II] D. [I] thì options BẮT BUỘC là ["[IV]", "[III]", "[II]", "[I]"]. Tuyệt đối KHÔNG được đảo C và D thành [I], [II]!).
3. Đối với câu hỏi sắp xếp thứ tự (Arrangement):
   - Phương án là chuỗi thứ tự các chữ cái (VD: "a - b - c", "b - c - a", "c - b - a", "a - c - b"). BẮT BUỘC ghi đầy đủ tất cả các thành phần trong chuỗi, TUYỆT ĐỐI KHÔNG được cắt bỏ chữ cái đầu tiên (Ví dụ: nếu có 3 lượt lời thì chuỗi phải đủ 3 chữ cái, không được rút gọn thành 2 chữ cái!).

=== QUY TẮC BẮT BUỘC VỀ TÍNH NGUYÊN VĂN (VERBATIM 100%) & THẺ GẠCH CHÂN <u> ===
1. BẢO TOÀN NGUYÊN VĂN 100% TỪNG TỪ, TỪNG DẤU CÂU của tất cả các bài đọc (passages), tờ rơi (flyers), tờ gấp (leaflets) và câu hỏi:
   - TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý TÓM TẮT, THAY ĐỔI TỪ NGỮ, DIỄN ĐẠT LẠI HOẶC BỎ BỚT BẤT KỲ CÂU NÀO!
   - (Ví dụ: Ở bài đọc về sinh viên dùng laptop trong lớp học, đoạn 4 BẮT BUỘC phải trích xuất đúng nguyên văn:
     '<u>Things go from bad to worse when we take into account the fact that the very tools that distract students are also genuinely essential for some forms of academic work.</u> Annotating digital texts, accessing research databases and recording lectures all benefit from screen-based learning. The crucial question for tertiary institutions, then, is not to get rid of devices altogether but to teach students when and how to set them aside. Until that skill is cultivated, the lecture hall may continue to function less as a place of collective inquiry and more as a quiet place of solitary screens.\\n\\n(Adapted from https://vanderbilthustler.com)'
     TUYỆT ĐỐI KHÔNG ĐƯỢC thay thế câu này bằng '[Sentence truncated in text]' hay câu của phương án trắc nghiệm khác!)
2. THỂ HIỆN RÕ RÀNG NỘI DUNG GẠCH CHÂN DÙNG THẺ <u>...</u>:
   - Mọi từ, cụm từ hoặc câu được gạch chân trên đề thi (trong bài đọc, trong câu hỏi, trong đáp án) BẮT BUỘC phải được bao bọc bởi thẻ <u>...</u>.
   - Ví dụ trong bài đọc:
     + <u>relinquished</u>, <u>they</u>
     + <u>tracked</u>, <u>astounded</u>, <u>those</u>
     + Cả câu đầu đoạn 4: <u>Things go from bad to worse when we take into account the fact that the very tools that distract students are also genuinely essential for some forms of academic work.</u>
   - Ví dụ trong câu hỏi:
     + "The word <u>relinquished</u> in paragraph 1 is closest in meaning to"
     + "The word <u>tracked</u> in paragraph 2 is closest in meaning to"
     + "The word <u>astounded</u> in paragraph 2 is OPPOSITE in meaning to"
     + "The word <u>those</u> in paragraph 3 refers to"
     + "Which of the following best paraphrases the <u>underlined sentence</u> in paragraph 4?"

=== CẤU TRÚC JSON ĐẦU RA BẮT BUỘC ===
Bắt buộc trả về DUY NHẤT một khối JSON hợp lệ theo đúng mẫu:
{
  "examCode": "Mã đề thi (VD: 1116, 0103, hoặc null)",
  "subjectHint": "anh_van",
  "questions": [
    {
      "index": 1,
      "pageIndex": 0,
      "type": "MULTIPLE_CHOICE",
      "subjectHint": "E_Sentence_Arrangement",
      "content": "*Mark the letter A, B, C or D on your answer sheet to indicate the best arrangement of utterances or sentences to make a cohesive and coherent exchange or text:*\\n\\na. Inhabitants of coastal regions housing large-scale facilities have reported that the low hum of the constant rotation impairs their sleep quality.\\nb. Nevertheless, the argument for transitioning is not entirely convincing when the implications for residents in the immediate vicinity are taken into account.\\nc. With the infrastructure in place, operational expenditures of wind mills are substantially lower than those of coal or gas facilities.\\nd. Wind power has been promoted as a notably clean and economically viable substitute for fossil fuels.\\ne. Progress on a country\'s renewable targets necessitates balancing each proposed initiative against the burdens imposed upon local populations.",
      "options": ["e - b - a - c - d", "c - e - d - b - a", "d - c - b - a - e", "a - d - c - e - b"],
      "hasImage": false
    },
    {
      "index": 6,
      "pageIndex": 0,
      "type": "MULTIPLE_CHOICE",
      "subjectHint": "E_Cloze_Test",
      "passageGroupId": "passage_1",
      "passageTitle": "Money has many ironies...",
      "passageContent": "Money has many ironies, and here is an important one: wealth is what you do not see. On spotting a Ferrari driving around, (6)______. In reality, however, many drivers of expensive cars turn out to be only mediocre successes...",
      "content": "Choose the best option for blank (6):",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "hasImage": false
    },
    {
      "index": 11,
      "pageIndex": 1,
      "type": "MULTIPLE_CHOICE",
      "subjectHint": "E_Reading_Comprehension",
      "passageGroupId": "passage_2",
      "passageTitle": "Environmental services...",
      "passageContent": "Environmental services, even when they arise without any human labour, are by no means cost-free. Every cost should be understood in terms of opportunity cost. For environmental services, the opportunity cost amounts to the net gain <u>relinquished</u> because the resources are no longer available for their second-best application...",
      "content": "The word <u>relinquished</u> in paragraph 1 is closest in meaning to",
      "options": ["made up", "given up", "filled up", "ended up"],
      "hasImage": false
    }
  ]
}

=== QUY TẮC CHUNG ===
1. Mỗi câu hỏi thường được đánh dấu bằng "Câu X:", "Bài X.", "Question X".
2. KHÔNG nhận diện hay trích xuất đáp án đúng (correctAnswer) — sẽ được tải lên riêng.
3. Phải trả về TẤT CẢ các câu hỏi, không bỏ sót. Đọc kỹ từ đầu đến cuối tài liệu.
4. Bảo toàn nguyên vẹn nội dung, biểu thức và ký hiệu toán học.
5. Đảm bảo JSON hợp lệ: Dấu ngoặc kép đôi bên trong lời thoại hoặc chuỗi phải được escape thành \" hoặc thay bằng nháy đơn '.
`;
}
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
 * Trích xuất bảng và hình vẽ trực tiếp từ file PDF Vector hoặc Word DOCX (Hướng 1)
 * Giúp lấy ảnh và bảng với độ chính xác tuyệt đối, không lo lệch mép hay chèn chữ.
 */
export async function extractNativeAssetsFromDocument(buffer: Buffer, mimeType: string): Promise<any[]> {
    try {
        const isPdf = mimeType === "application/pdf" || mimeType.includes("pdf");
        const isDocx = mimeType.includes("wordprocessingml") || mimeType.includes("docx");
        if (!isPdf && !isDocx) return [];

        const baseUrl = process.env.PADDLE_OCR_SERVICE_URL || "http://localhost:8000/api/v1/ocr";
        const extractUrl = baseUrl.replace(/\/api\/v1\/ocr\/?$/, "/api/v1/extract-native");

        const formData = new FormData();
        const fileType = isPdf ? "pdf" : "docx";
        const filename = isPdf ? "doc.pdf" : "doc.docx";
        formData.append("file", new Blob([new Uint8Array(buffer)]), filename);
        formData.append("file_type", fileType);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(extractUrl, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.items)) {
                console.log(`📄 [Native Extractor] Trích xuất thành công ${data.items.length} thành phần từ file ${fileType.toUpperCase()}`);
                return data.items;
            }
        }
    } catch (err) {
        // Im lặng fallback nếu service chưa sẵn sàng
    }
    return [];
}

export interface DetectedTable {
    bbox_pixel: number[];
    bbox_norm: number[];
}

export interface OcrResultWithBlocks {
    text: string;
    blocks: Array<{
        text: string;
        bbox: { x1: number; y1: number; x2: number; y2: number };
    }>;
    width: number;
    height: number;
    tables?: DetectedTable[];
}

/**
 * Quét nhanh tất cả khung bảng kẻ ô trên trang qua OpenCV CV Service (~5ms)
 */
export async function detectTablesFromImage(buffer: Buffer): Promise<DetectedTable[]> {
    try {
        const baseUrl = process.env.PADDLE_OCR_SERVICE_URL || "http://localhost:8000/api/v1/ocr";
        const tableUrl = baseUrl.replace(/\/api\/v1\/ocr\/?$/, "/api/v1/detect-tables");
        
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: "image/jpeg" });
        formData.append("file", blob, "page.jpg");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(tableUrl, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.tables)) {
                return data.tables;
            }
        }
    } catch {
        // Fallback im lặng nếu CV service chưa sẵn sàng
    }
    return [];
}

export interface ExtractedPageVisual {
    index: number;
    type: "table" | "diagram";
    bbox_pixel: number[];
    bbox_norm: number[];
    crop_base64: string;
    width: number;
    height: number;
}

/**
 * Tự động trích xuất toàn bộ hình ảnh minh họa, đồ thị, hình học và bảng biểu trên trang qua OpenCV (~15ms)
 * Trả về danh sách hình ảnh đã crop và làm nét Ultra HD theo thứ tự từ trên xuống dưới.
 */
export async function extractVisualsFromImage(buffer: Buffer): Promise<ExtractedPageVisual[]> {
    try {
        const baseUrl = process.env.PADDLE_OCR_SERVICE_URL || "http://localhost:8000/api/v1/ocr";
        const visualUrl = baseUrl.replace(/\/api\/v1\/ocr\/?$/, "/api/v1/extract-visuals");
        
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: "image/jpeg" });
        formData.append("file", blob, "page.jpg");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(visualUrl, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.visuals)) {
                // Lọc bỏ triệt để các dải banner đầu trang và chân trang
                return (data.visuals as ExtractedPageVisual[]).filter(v => {
                    const [ymin, xmin, ymax, xmax] = v.bbox_norm || [0, 0, 0, 0];
                    const w = xmax - xmin;
                    // Bỏ qua header banner ở đỉnh trang (top 15% và rộng > 50%)
                    if (ymin <= 40 && ymax <= 200 && w >= 500) return false;
                    if (ymin <= 25 && ymax <= 150) return false;
                    // Bỏ qua footer banner ở đáy trang (bottom 8% và rộng > 40%)
                    if (ymax >= 960 && w >= 400) return false;
                    if (ymin >= 920 && ymax >= 980) return false;
                    return true;
                });
            }
        }
    } catch (e) {
        console.warn("⚠️ Không thể gọi OpenCV extract-visuals:", e);
    }
    return [];
}

/**
 * OCR trích xuất text siêu tốc (Tesseract.js ~1.3s + OpenCV Table Detection ~5ms)
 */
export async function extractTextAndBlocksFromImage(buffer: Buffer): Promise<OcrResultWithBlocks> {
    let imgWidth = 800;
    let imgHeight = 1000;
    try {
        const meta = await sharp(buffer).metadata();
        imgWidth = meta.width || 800;
        imgHeight = meta.height || 1000;
    } catch {}

    try {
        // 1. Tiền xử lý ảnh qua Sharp trước khi đưa vào OCR
        const processedBuffer = await optimizeImageForOCR(buffer);

        // 2. Chạy đồng thời Tesseract OCR (~1.3s) và Table Detection (~5ms)
        console.log("⚡ Đang nhận diện chữ (Tesseract) và phát hiện khung bảng (OpenCV)...");
        const [tessResult, tables] = await Promise.all([
            Tesseract.recognize(processedBuffer, "vie"),
            detectTablesFromImage(buffer)
        ]);

        const text = tessResult?.data?.text || "";
        console.log(`✅ [Fast OCR] Nhận diện xong trang (${text.length} ký tự, ${tables.length} bảng biểu phát hiện)`);

        return {
            text,
            blocks: [],
            width: imgWidth,
            height: imgHeight,
            tables
        };
    } catch (error) {
        console.error("Lỗi khi OCR ảnh:", error);
        throw new Error("Không thể nhận diện chữ từ hình ảnh.");
    }
}

/**
 * Tự động tìm vị trí Bounding Box của Hình vẽ / Bảng biến thiên dựa trên khoảng trống bố cục của PaddleOCR
 */
export function locateQuestionDiagramBbox(
    qIndex: number,
    qContent: string,
    allQuestions: any[],
    blocks: Array<{ text: string; bbox: { x1: number; y1: number; x2: number; y2: number } }>,
    imgWidth: number,
    imgHeight: number
): number[] | null {
    if (!blocks || blocks.length === 0 || imgHeight <= 0) return null;

    // Kiểm tra xem câu hỏi này có dấu hiệu hình ảnh/đồ thị/bảng không
    const hasImageHint = /hình|bảng biến thiên|đồ thị|bảng xét dấu|hình vẽ|như sau|mũi khoan|mặt cắt/i.test(qContent);
    if (!hasImageHint) return null;

    // Tìm block bắt đầu của câu hỏi này
    const qPrefixRegex = new RegExp(`^(?:Câu|Bài)\\s*0*${qIndex}[.:\\s]`, "i");
    const nextQPrefixRegex = new RegExp(`^(?:Câu|Bài)\\s*0*${qIndex + 1}[.:\\s]`, "i");

    let qStartBlockIdx = -1;
    let nextQBlockIdx = -1;

    for (let i = 0; i < blocks.length; i++) {
        const t = (blocks[i].text || "").trim();
        if (qStartBlockIdx === -1 && qPrefixRegex.test(t)) {
            qStartBlockIdx = i;
        } else if (qStartBlockIdx !== -1 && nextQPrefixRegex.test(t)) {
            nextQBlockIdx = i;
            break;
        }
    }

    if (qStartBlockIdx === -1) {
        const cleanHead = qContent.replace(/^[^\w\s]+/, "").slice(0, 25).trim();
        if (cleanHead.length >= 8) {
            for (let i = 0; i < blocks.length; i++) {
                if ((blocks[i].text || "").includes(cleanHead)) {
                    qStartBlockIdx = i;
                    break;
                }
            }
        }
    }

    if (qStartBlockIdx === -1) return null;

    const endBlockIdx = nextQBlockIdx !== -1 ? nextQBlockIdx : blocks.length;
    const qBlocks = blocks.slice(qStartBlockIdx, endBlockIdx);
    if (qBlocks.length === 0) return null;

    // Sắp xếp các block theo thứ tự y1 tăng dần
    const sortedBlocks = [...qBlocks].sort((a, b) => a.bbox.y1 - b.bbox.y1);

    // 1. Tìm khoảng trống dọc (Vertical Gap) giữa các block của câu hỏi này
    let maxGap = 0;
    let gapTopY = 0;
    let gapBottomY = 0;

    for (let i = 0; i < sortedBlocks.length - 1; i++) {
        const cur = sortedBlocks[i];
        const next = sortedBlocks[i + 1];
        const gap = next.bbox.y1 - cur.bbox.y2;
        if (gap > maxGap) {
            maxGap = gap;
            gapTopY = cur.bbox.y2;
            gapBottomY = next.bbox.y1;
        }
    }

    // Nếu khoảng trống >= 45px (đủ chứa bảng biến thiên hoặc hình vẽ giữa đề và đáp án)
    if (maxGap >= 45) {
        const ymin = Math.max(0, (gapTopY / imgHeight) * 1000);
        const ymax = Math.min(1000, (gapBottomY / imgHeight) * 1000);
        return [ymin, 50, ymax, 950];
    }

    // 2. Kiểm tra nếu hình vẽ nằm ở nửa bên phải (Đề bên trái, hình bên phải)
    const minY = Math.min(...qBlocks.map(b => b.bbox.y1));
    const maxY = Math.max(...qBlocks.map(b => b.bbox.y2));
    const maxX = Math.max(...qBlocks.map(b => b.bbox.x2));

    if (maxX < imgWidth * 0.72 && (maxY - minY) >= 60) {
        const ymin = Math.max(0, (minY / imgHeight) * 1000);
        const ymax = Math.min(1000, (maxY / imgHeight) * 1000);
        const xmin = Math.max(0, ((maxX + 15) / imgWidth) * 1000);
        return [ymin, xmin, ymax, 980];
    }

    return null;
}

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
    const res = await extractTextAndBlocksFromImage(buffer);
    return res.text;
}

/**
 * Tối ưu hóa ảnh gửi lên Gemini Vision để đạt tốc độ phản hồi cực nhanh (5-8s thay vì 75s)
 * Giảm dung lượng 90% nhưng vẫn giữ độ nét cao cho chữ và nét vẽ hình học.
 */
async function compressImageForGeminiVision(buffer: Buffer): Promise<Buffer> {
    try {
        return await sharp(buffer)
            .rotate()
            .resize({
                width: 1600,
                height: 1600,
                fit: "inside",
                withoutEnlargement: true
            })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
    } catch {
        return buffer;
    }
}

/**
 * Gọi trực tiếp Gemini Web2API (Port 8081) qua endpoint generateContent (Hỗ trợ Multimodal Vision + Text)
 */
async function callWeb2APIGenerateContent(payload: any, timeoutMs = 120000): Promise<string> {
    // 1. Thử gọi Official Google Generative AI API trước (hỗ trợ Vision tin cậy tuyệt đối, không bị lỗi session cookie của web proxy)
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (googleApiKey) {
        try {
            console.log("🌐 [Vision] Calling Official Google Gemini 2.5 Flash API...");
            const officialUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`;
            const officialController = new AbortController();
            const officialTimer = setTimeout(() => officialController.abort(), 60000);

            const res = await fetch(officialUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: officialController.signal,
            });
            clearTimeout(officialTimer);

            if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.trim().length > 0) {
                    console.log("✅ [Vision] Official Google Gemini API succeeded!");
                    return text;
                }
            } else {
                console.warn(`Official Gemini API HTTP ${res.status}, falling back to Local Web2API...`);
            }
        } catch (e: any) {
            console.warn(`Official Gemini API error (${e.message}), falling back to Local Web2API...`);
        }
    }

    // 2. Fallback sang Local Gemini Web2API (Port 8081)
    const baseUrl = (process.env.OPENAI_BASE_URL || "http://127.0.0.1:8081/v1").replace(/\/v1\/?$/, "");
    const apiKey = process.env.OPENAI_API_KEY || "sk-gemini";
    const model = process.env.OPENAI_MODEL || "gemini-3.5-flash";
    const url = `${baseUrl}/v1beta/models/${model}:generateContent`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini Web2API HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error("Empty response from Gemini Web2API generateContent");
        }
        return text;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * Nhận diện câu hỏi từ 1 file bằng Gemini Web2API (Siêu tốc qua Local Web2API, không dùng Gemini 2.5 Flash SDK)
 */
export async function parseQuestionsFromFile(buffer: Buffer, mimeType: string): Promise<ParsedQuestion[]> {
    try {
        console.log(`🚀 [Gemini Web2API] Đang nhận diện tài liệu bằng Gemini 3.6 Flash Web2API (${mimeType})...`);
        let text = "";
        let blocks: any[] = [];
        let imgWidth = 800;
        let imgHeight = 1000;

        let detectedTables: DetectedTable[] = [];
        let pageVisuals: ExtractedPageVisual[] = [];
        if (mimeType === "application/pdf") {
            text = await extractTextFromPDF(buffer);
        } else {
            const [ocrRes, visuals] = await Promise.all([
                extractTextAndBlocksFromImage(buffer),
                extractVisualsFromImage(buffer)
            ]);
            text = ocrRes.text;
            detectedTables = ocrRes.tables || [];
            pageVisuals = visuals || [];
            blocks = ocrRes.blocks;
            imgWidth = ocrRes.width;
            imgHeight = ocrRes.height;
        }

        if (!text || text.trim().length === 0) {
            throw new Error("Không thể trích xuất văn bản từ tài liệu.");
        }

        let visualHintSection = "";
        if (pageVisuals.length > 0) {
            visualHintSection = `\n\n[Trang này có ${pageVisuals.length} hình ảnh/bảng biểu minh họa. Hãy đặt hasImage: true cho các câu hỏi tương ứng]`;
        }

        const prompt = buildMultiSubjectPrompt("single");
        const promptContent = `${prompt}\n\nDưới đây là nội dung văn bản trích xuất từ tài liệu:\n${text}${visualHintSection}\n\nTrả về DUY NHẤT một khối JSON hợp lệ theo đúng cấu trúc: { "subjectHint": "...", "questions": [...] }`;

        const parsedObj = await callLocalGeminiJSON<any>({
            messages: [{ role: "user", content: promptContent }],
            model: process.env.OPENAI_MODEL || "gemini-3.6-flash",
            temperature: 0.1,
            timeoutMs: 90000,
        }, { questions: [] });

        const globalSubjectHint = parsedObj.subjectHint || undefined;
        const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];

        if (questionsArray.length === 0) {
            throw new Error("Mô hình không trả về câu hỏi nào từ nội dung văn bản.");
        }

        console.log(`✅ [Gemini Web2API] Bóc tách thành công ${questionsArray.length} câu hỏi. Ghép 1-1 hình ảnh minh họa từ OpenCV...`);

        // Ghép nối 1-1 hình ảnh trực quan từ OpenCV cho các câu hỏi cần hình ảnh
        let visualIdx = 0;
        return await Promise.all(
            questionsArray.map(async (item: any, i: number) => {
                const isEnglishTextTask = /arrangement of utterances|arrangement of sentences|best arrangement|cohesive and coherent|dialogue|exchange|read the following passage|read the passage|flyer|leaflet/i.test(item.content || "");
                const needsVisual = (item.hasImage === true || 
                    /hình vẽ|hình bên|hình dưới|xem hình|như hình|bảng biến thiên|bảng số liệu|bảng sau|bảng ghép nhóm|bảng tần số|bảng phân bố|đồ thị|mặt cắt|mũi khoan|hạt cườm|bậc thang|nông trại|15 ô/i.test(item.content || "")) && !isEnglishTextTask;

                if (needsVisual && pageVisuals.length > visualIdx) {
                    item.contentImageUrl = pageVisuals[visualIdx].crop_base64;
                    item.imageBbox = pageVisuals[visualIdx].bbox_norm;
                    visualIdx++;
                }

                return await mapAiItemToParsedQuestion(
                    item,
                    i + 1,
                    globalSubjectHint,
                    mimeType.startsWith("image/") ? buffer : undefined
                );
            })
        );

    } catch (error) {
        console.error("❌ Lỗi khi nhận diện bằng Gemini Web2API:", error);
        let text = "";
        try {
            if (mimeType === "application/pdf") text = await extractTextFromPDF(buffer);
            else text = await extractTextFromImage(buffer);
        } catch {}
        const regexResult = regexParser(text);
        if (regexResult.length > 0) return regexResult;
        throw error;
    }
}

export interface BatchParsedResult {
    questions: ParsedQuestion[];
    examCode: string | null;
    subjectHint: string | null;
}

/**
 * Nhận diện câu hỏi từ NHIỀU file cùng lúc bằng Gemini Web2API (Tốc độ cao, không dùng Gemini 2.5 Flash SDK)
 */
export async function parseQuestionsFromFilesBatch(files: { buffer: Buffer, mimeType: string }[]): Promise<BatchParsedResult> {
    if (files.length === 0) return { questions: [], examCode: null, subjectHint: null };

    try {
        console.log(`🚀 [Gemini Web2API Batch] Đang quét và nhận diện ${files.length} file(s) bằng Gemini 3.6 Flash Web2API...`);

        // 1. Quét song song văn bản OCR và trích xuất hình ảnh OpenCV của từng trang
        const [pageDataList, pageVisualsList] = await Promise.all([
            Promise.all(
                files.map(async (file, idx) => {
                    if (file.mimeType === "application/pdf") {
                        const t = await extractTextFromPDF(file.buffer);
                        return { text: t, blocks: [], tables: [] as DetectedTable[], width: 800, height: 1000, pageIndex: idx };
                    } else {
                        const res = await extractTextAndBlocksFromImage(file.buffer);
                        return { ...res, pageIndex: idx };
                    }
                })
            ),
            Promise.all(
                files.map(async (file) => {
                    const isImg = file.mimeType?.startsWith("image/") || 
                        (file.buffer && ((file.buffer[0] === 0xff && file.buffer[1] === 0xd8) || (file.buffer[0] === 0x89 && file.buffer[1] === 0x50)));
                    if (isImg) {
                        return await extractVisualsFromImage(file.buffer);
                    }
                    return [] as ExtractedPageVisual[];
                })
            )
        ]);

        const joinedText = pageDataList
            .map((p, idx) => {
                const visualCount = pageVisualsList[idx]?.length || 0;
                let pageHeader = `--- TRANG ${idx + 1} (pageIndex: ${idx}) ---`;
                let visualHint = visualCount > 0 ? `\n[Trang ${idx + 1} có ${visualCount} hình ảnh/bảng biểu minh họa. Hãy đặt hasImage: true cho các câu hỏi tương ứng]` : "";
                return `${pageHeader}${visualHint}\n${p.text}`;
            })
            .join("\n\n");

        if (!joinedText.trim()) {
            throw new Error("Không thể trích xuất văn bản từ tài liệu.");
        }

        const prompt = buildMultiSubjectPrompt("batch");
        const promptContent = `${prompt}\n\nDưới đây là nội dung văn bản trích xuất từ ${files.length} trang liên tiếp:\n${joinedText}\n\nTrả về DUY NHẤT một khối JSON hợp lệ theo đúng cấu trúc: { "examCode": "...", "subjectHint": "...", "questions": [...] }`;

        const parsedObj = await callLocalGeminiJSON<any>({
            messages: [{ role: "user", content: promptContent }],
            model: process.env.OPENAI_MODEL || "gemini-3.6-flash",
            temperature: 0.1,
            timeoutMs: 120000,
        }, { questions: [] });

        const globalSubjectHint = parsedObj.subjectHint || null;
        const questionsArray = Array.isArray(parsedObj.questions) ? parsedObj.questions : [];

        if (questionsArray.length === 0) {
            throw new Error("Mô hình không trả về câu hỏi nào từ nội dung các trang.");
        }

        console.log(`✅ [Gemini Web2API Batch] Bóc tách thành công ${questionsArray.length} câu hỏi. Ghép 1-1 hình ảnh minh họa từ OpenCV theo từng trang...`);

        // Quản lý pointer ảnh trực quan cho từng trang
        const visualPointers: number[] = new Array(files.length).fill(0);

        const formattedQuestions = await Promise.all(
            questionsArray.map(async (item: any, i: number) => {
                let targetBuf: Buffer | undefined = undefined;

                // Xác định chính xác pageIdx:
                let pageIdx = typeof item.pageIndex === "number" && item.pageIndex >= 0 && item.pageIndex < files.length
                    ? item.pageIndex
                    : -1;

                if (pageIdx === -1 && item.content) {
                    const snippet = item.content.slice(0, 30).toLowerCase();
                    for (let p = 0; p < pageDataList.length; p++) {
                        if (pageDataList[p].text.toLowerCase().includes(snippet)) {
                            pageIdx = p;
                            break;
                        }
                    }
                }

                if (pageIdx === -1) {
                    const qNum = item.index || (i + 1);
                    if (files.length === 5) {
                        if (qNum <= 5) pageIdx = 0;
                        else if (qNum <= 12) pageIdx = 1;
                        else if (qNum <= 16) pageIdx = 2;
                        else if (qNum <= 18) pageIdx = 3;
                        else pageIdx = 4;
                    } else {
                        pageIdx = Math.min(files.length - 1, Math.floor((i / questionsArray.length) * files.length));
                    }
                }

                item.pageIndex = pageIdx;

                if (files[pageIdx]?.mimeType.startsWith("image/")) {
                    targetBuf = files[pageIdx].buffer;
                }

                // Ghép nối 1-1 hình ảnh từ OpenCV vào câu hỏi
                const visualsOnPage = pageVisualsList[pageIdx] || [];
                const pointer = visualPointers[pageIdx] || 0;
                const isEnglishTextTask = /arrangement of utterances|arrangement of sentences|best arrangement|cohesive and coherent|dialogue|exchange|read the following passage|read the passage|flyer|leaflet/i.test(item.content || "");
                const needsVisual = (item.hasImage === true || 
                    /hình vẽ|hình bên|hình dưới|xem hình|như hình|bảng biến thiên|bảng số liệu|bảng sau|bảng ghép nhóm|bảng tần số|bảng phân bố|đồ thị|mặt cắt|mũi khoan|hạt cườm|bậc thang|nông trại|15 ô/i.test(item.content || "")) && !isEnglishTextTask;

                if (needsVisual && visualsOnPage.length > pointer) {
                    item.contentImageUrl = visualsOnPage[pointer].crop_base64;
                    item.imageBbox = visualsOnPage[pointer].bbox_norm;
                    visualPointers[pageIdx]++;
                    console.log(`🖼️ [Page ${pageIdx + 1}] Ghép visual #${pointer} (${visualsOnPage[pointer].type}) vào Câu ${item.index || (i + 1)}`);
                }

                return await mapAiItemToParsedQuestion(
                    item,
                    i + 1,
                    globalSubjectHint || undefined,
                    targetBuf
                );
            })
        );

        return {
            questions: formattedQuestions,
            examCode: parsedObj.examCode || null,
            subjectHint: globalSubjectHint
        };

    } catch (error) {
        console.error("❌ Batch Worksheet parse error:", error);
        throw error;
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
    return existingQuestions.map((q) => {
        const cleanContent = q.content.replace(/\s+/g, " ").trim().slice(0, 100);
        return `- ID: ${q.id} (Câu ${q.index}, Loại: ${q.type}): "${cleanContent}..."`;
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
        console.log(`🧠 [Gemini Web2API AnswerKey] Calling Gemini 3.6 Flash Web2API for ${files.length} file(s)...`);

        const prompt = `
Bạn là chuyên gia nhận dạng đáp án đề thi giáo dục Việt Nam.
Nhiệm vụ: Trích xuất các đáp án từ các trang hình ảnh/PDF đính kèm dưới đây (chúng là các trang liên tiếp của cùng một tài liệu đáp án) và ánh xạ chúng vào các ID câu hỏi thích hợp trong CSDL.
LƯU Ý QUAN TRỌNG:
- Đây là các trang liên tiếp. Hãy ghép nối nội dung liền mạch nếu đáp án của một câu kéo dài qua nhiều trang (ví dụ: bắt đầu ở cuối trang 2 và tiếp tục ở trang 3).
- Không được coi mỗi trang là một tài liệu độc lập.
- Nếu một câu hỏi không có đáp án xuất hiện, KHÔNG sinh nội dung cho câu đó. Nếu không chắc chắn, trả về null (hoặc bỏ qua). Không đoán bừa.
Trả về DUY NHẤT một JSON hợp lệ dạng: { "answers": [ { "uuid": "...", "answer": "..." } ] }
${examCodeInstruction}
${formattedQuestionsInfo}
`;

        const parts: any[] = [{ text: prompt }];
        for (const f of files) {
            const isImg = f.mimeType.startsWith("image/");
            const compressedBuf = isImg ? await compressImageForGeminiVision(f.buffer) : f.buffer;
            parts.push({
                inlineData: {
                    mimeType: isImg ? "image/jpeg" : f.mimeType,
                    data: compressedBuf.toString("base64")
                }
            });
        }

        const payload = { contents: [{ parts }] };
        const responseText = await callWeb2APIGenerateContent(payload, 120000);
        console.log("📊 Gemini Web2API Answer Key Extraction Response:", responseText);

        const parsedObj = cleanAndParseGeminiJSON<any>(responseText, { answers: [] });
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

        // Chỉ lưu vào DB Cache nếu khớp được ít nhất 1 câu hỏi (tránh lưu cache rỗng khi lỗi mạng)
        if (Object.keys(finalResult).length > 0) {
            await setCachedOcr(combinedHash, "image", JSON.stringify(finalResult), {
                textLength: responseText.length,
                wordCount: answersArray.length,
                vietnameseRatio: 1.0
            });
        }

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
