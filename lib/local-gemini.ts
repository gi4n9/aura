/**
 * Client kết nối trực tiếp đến Local Gemini Web2API Service (Port 8081)
 * Hoạt động độc lập, không giới hạn Token Per Minute (TPM), hỗ trợ context lớn và phản hồi siêu tốc.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallGeminiOptions {
  messages: ChatMessage[];
  model?: "gemini-3.6-flash" | "gemini-3.5-flash" | "gemini-3.5-flash-thinking" | "gemini-auto" | string;
  temperature?: number;
  timeoutMs?: number;
}

const LOCAL_GEMINI_URL = (process.env.OPENAI_BASE_URL || "http://127.0.0.1:8081/v1").replace(/\/$/, "");
const LOCAL_GEMINI_KEY = process.env.OPENAI_API_KEY || "sk-gemini";

/**
 * Gọi Gemini Web2API trả về chuỗi văn bản
 */
export async function callLocalGemini(options: CallGeminiOptions): Promise<string> {
  const {
    messages,
    model = "gemini-3.6-flash",
    temperature = 0.2,
    timeoutMs = 180000, // 3 phút cho các transcript lớn
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${LOCAL_GEMINI_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOCAL_GEMINI_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Web2API HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Gemini Web2API");
    }

    return content.trim();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Gemini Web2API timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  }
}

/**
 * Trích xuất và parse JSON an toàn từ phản hồi của Gemini
 */
export function cleanAndParseGeminiJSON<T = any>(rawText: string, fallback: T = {} as T): T {
  if (!rawText || typeof rawText !== "string") return fallback;

  // 1. Loại bỏ markdown code blocks ```json ... ```
  let cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 2. Thử parse trực tiếp
  try {
    return JSON.parse(cleaned);
  } catch {
    // 3. Tìm khối JSON { ... } hoặc [ ... ] lớn nhất
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {}
    }

    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[0]);
      } catch {}
    }
  }

  return fallback;
}

/**
 * Gọi Gemini Web2API và tự động parse JSON
 */
export async function callLocalGeminiJSON<T = any>(
  options: CallGeminiOptions,
  fallback: T = {} as T
): Promise<T> {
  const rawText = await callLocalGemini(options);
  return cleanAndParseGeminiJSON<T>(rawText, fallback);
}
