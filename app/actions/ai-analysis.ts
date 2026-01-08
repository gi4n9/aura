"use server";

import { prisma } from "@/lib/prisma";

import { revalidatePath } from "next/cache";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export async function analyzeTranscript(videoId: string) {
  // Lấy dữ liệu video từ DB
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { transcript: true, title: true },
  });

  if (!video?.transcript) {
    return { error: "Chưa có transcript để phân tích" };
  }

  try {
    // 3. Gọi Model mới
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",

      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Bạn là trợ lý giáo dục Aura AI. Hãy phân tích nội dung bài giảng: "${video.title}".
              
              Transcript:
              """
              ${video.transcript}
              """
              `,
            },
          ],
        },
      ],

      // Cấu hình Output trả về JSON chuẩn
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            summary: {
              type: "STRING",
              description: "Tóm tắt nội dung video khoảng 3-5 câu.",
            },
            mindMap: {
              type: "STRING",
              description: "Mã Mermaid.js (graph TD) biểu diễn sơ đồ tư duy.",
            },
            questions: {
              type: "ARRAY",
              description: "Danh sách 5 câu hỏi ôn tập kèm đáp án.",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING" },
                  answer: { type: "STRING" },
                },
                required: ["question", "answer"],
              },
            },
          },
          required: ["summary", "mindMap", "questions"],
        },
      },
    });

    // 4. Xử lý kết quả
    const jsonText = response.text?.trim();

    if (!jsonText) {
      throw new Error("AI không trả về dữ liệu.");
    }

    const data = JSON.parse(jsonText);

    // 5. Lưu vào Database
    await prisma.video.update({
      where: { id: videoId },
      data: {
        summary: data.summary,
        mindMap: data.mindMap,
        questions: data.questions,
        isAnalyzed: true,
      },
    });

    revalidatePath(`/courses/${videoId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error("Google GenAI Error:", error);
    return { error: "Lỗi phân tích AI: " + error.message };
  }
}
