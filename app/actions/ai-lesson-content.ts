"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI, SchemaType, Schema, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { off } from "process";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

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
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: mindmapSchema,
                temperature: 0.4,
                maxOutputTokens: 8192,
            },
            safetySettings,
        });

        const prompt = `
        Tạo mindmap từ transcript video bài giảng sau. 
        Bạn PHẢI trả về ĐÚNG ĐỊNH DẠNG JSON hợp lệ. Bắt buộc bắt đầu bằng dấu '{' và kết thúc bằng dấu '}'.
        Tuyệt đối không có bất kỳ văn bản giải thích nào, chỉ xuất JSON thuần.
        
        RÀNG BUỘC QUAN TRỌNG ĐỂ TRÁNH LỖI JSON (CRITICAL RULES):
        1. KHÔNG SỬ DỤNG dấu ngoặc kép (") hoặc dấu nháy đơn (') bên trong nội dung văn bản (các trường name). 
        2. KHÔNG xuống dòng (Enter) bên trong chuỗi đoạn text.
        3. Tên (name) của các node PHẢI NGẮN GỌN VÀ SÚC TÍCH (Tối đa 6-8 từ). 
        4. Cấu trúc chi tiết, phân tích sâu nội dung: 
           - 1 root chính. 
           - Root chứa 4-7 children (những mạch ý chính của video). 
           - Mỗi child chứa 3-5 details (ý phụ).
           - Tùy ý có thể lồng sâu thêm 1 cấp (sub-details) nếu kiến thức cần giải thích chi tiết.
        5. Lược bỏ trường "timestamp" nếu không xác định được. Tên key bắt buộc là "name", mạng lưới con là "children".
        6. Đảm bảo cấu trúc giống hệt mẫu JSON dưới đây:
        
        Mẫu JSON hợp lệ:
        {
          "root": {
            "name": "Tên chủ đề chính (vd: Lập trình JavaScript)",
            "children": [
              {
                "name": "Ý chính 1 (vd: Khái niệm cơ bản)",
                "children": [
                  { 
                    "name": "Ý phụ 1 (vd: Biến và Hằng số)",
                    "children": [
                         { "name": "Cách khai báo var, let, const" }
                    ]
                  },
                  { "name": "Ý phụ 2" }
                ]
              }
            ]
          }
        }
        
        Transcript:
        ${transcript.substring(0, 30000)}
        `;

        let data: any = null;
        const MAX_RETRIES = 3;

        // Vòng lặp Retry xử lý lỗi 503
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                data = cleanAndParseJSON(responseText);
                break; // Gọi API và parse thành công thì thoát vòng lặp
            } catch (error: any) {
                if (error.status === 503 || (error.message && error.message.includes('503'))) {
                    if (attempt < MAX_RETRIES - 1) {
                        const waitTime = Math.pow(2, attempt) * 1000;
                        console.warn(`[Lỗi 503] Mindmap: Server Gemini quá tải. Thử lại sau ${waitTime / 1000}s... (Lần ${attempt + 1}/${MAX_RETRIES})`);
                        await delay(waitTime);
                        continue;
                    }
                }
                throw error;
            }
        }

        if (!data || !data.root) {
            console.warn("⚠️ Bỏ qua tạo Mindmap do AI trả về JSON lỗi.");
            return { success: false, error: "Malformed JSON from AI" };
        }

        // Convert Tree to React Flow Nodes & Edges
        const { nodes, edges } = convertTreeToReactFlow(data.root);
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
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: flashcardSchema,
                temperature: 0.4,
            },
            safetySettings,
        });

        const prompt = `
        Tạo flashcards học tập từ transcript video bài giảng sau.
        
        RÀNG BUỘC QUAN TRỌNG ĐỂ TRÁNH LỖI JSON (CRITICAL RULES):
        1. TUYỆT ĐỐI KHÔNG SỬ DỤNG dấu ngoặc kép (") hoặc dấu nháy đơn (') bên trong nội dung mặt trước (front) và mặt sau (back).
        2. TUYỆT ĐỐI KHÔNG xuống dòng (Enter) bên trong giá trị chuỗi (string).
        3. Tạo CHÍNH XÁC 10 flashcards.
        4. Front ngắn gọn (dưới 15 từ), Back xúc tích (dưới 30 từ).
        
        Transcript:
        ${transcript.substring(0, 30000)}
        `;

        let data: any = null;
        const MAX_RETRIES = 3;

        // Vòng lặp Retry xử lý lỗi 503
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                data = cleanAndParseJSON(responseText);
                break; // Gọi API và parse thành công thì thoát vòng lặp
            } catch (error: any) {
                // Kiểm tra nếu là lỗi 503 từ Google
                if (error.status === 503 || (error.message && error.message.includes('503'))) {
                    if (attempt < MAX_RETRIES - 1) {
                        const waitTime = Math.pow(2, attempt) * 1000; // Đợi 1s, 2s...
                        console.warn(`[Lỗi 503] Flashcards: Server Gemini quá tải. Thử lại sau ${waitTime / 1000}s... (Lần ${attempt + 1}/${MAX_RETRIES})`);
                        await delay(waitTime);
                        continue;
                    }
                }
                // Nếu là lỗi khác hoặc hết số lần thử, ném lỗi ra khối catch bên ngoài
                throw error;
            }
        }

        if (!data || !data.flashcards) {
            console.warn("⚠️ Bỏ qua tạo Flashcard do AI trả về JSON lỗi.");
            return { success: false, error: "Malformed JSON from AI" };
        }

        // Save to DB
        await db.lesson.update({
            where: { id: lessonId },
            data: {
                flashcards: {
                    create: data.flashcards.map((fc: any) => ({
                        front: fc.front,
                        back: fc.back,
                        timestamp: fc.timestamp || null
                    }))
                }
            }
        });

        return { message: "Flashcards generated successfully", success: true, data: data.flashcards };

    } catch (error: any) {
        console.error("Generate Flashcards Error:", error);
        return { message: "Generate Flashcards Error", success: false, error: error.message };
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
