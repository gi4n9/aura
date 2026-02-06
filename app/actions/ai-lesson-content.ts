"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { GoogleGenerativeAI, SchemaType, Schema, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

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

// --- ACTIONS ---

export async function generateMindmap(lessonId: string, transcript: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: mindmapSchema,
                temperature: 0.1,
            },
            safetySettings,
        });

        const prompt = `
        Tạo mindmap từ transcript video bài giảng sau.
        
        Yêu cầu:
        - Root: Chủ đề chính của bài học
        - Children: Các khái niệm/mục chính (tối đa 5)
        - Mỗi child có thể có children là chi tiết cụ thể (tối đa 3)
        - Thêm timestamp (giây) nếu biết khi nào khái niệm xuất hiện
        
        Transcript:
        ${transcript.substring(0, 30000)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        // Convert Tree to React Flow Nodes & Edges
        const { nodes, edges } = convertTreeToReactFlow(data.root);
        const mindMapData = { nodes, edges };

        // Save to DB
        await db.lesson.update({
            where: { id: lessonId },
            data: { mindMapData: mindMapData as any }
        });

        return { success: true, data: mindMapData };

    } catch (error: any) {
        console.error("Generate Mindmap Error:", error);
        return { success: false, error: error.message };
    }
}

export async function generateFlashcards(lessonId: string, transcript: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: flashcardSchema,
                temperature: 0.1,
            },
            safetySettings,
        });

        const prompt = `
        Tạo flashcards học tập từ transcript video bài giảng sau.
        
        Yêu cầu:
        - Mỗi flashcard có front (câu hỏi/thuật ngữ) và back (trả lời/định nghĩa)
        - Thêm timestamp (giây) nếu biết khi nào khái niệm xuất hiện
        - Tạo 10-15 flashcards chất lượng cao
        - Tập trung vào kiến thức quan trọng, có thể ra đề thi
        
        Transcript:
        ${transcript.substring(0, 30000)}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        // Save to DB
        await db.lesson.update({
            where: { id: lessonId },
            data: { flashcards: data.flashcards as any }
        });

        return { success: true, data: data.flashcards };

    } catch (error: any) {
        console.error("Generate Flashcards Error:", error);
        return { success: false, error: error.message };
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
            type: parentId ? 'default' : 'input'
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
