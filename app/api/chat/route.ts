import { google } from "@ai-sdk/google";
import { streamText, convertToCoreMessages } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: google("models/gemini-1.5-flash"), // Model
    messages: convertToCoreMessages(messages), // Tự động xử lý history
    system: "Bạn là trợ lý học tập Aura AI. Hãy trả lời ngắn gọn, thân thiện.",
    temperature: 0.7,
  });

  return result.toDataStreamResponse();
}
