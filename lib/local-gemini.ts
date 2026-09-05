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
 * Tiền xử lý chuỗi JSON chứa công thức LaTeX và ký tự điều khiển từ LLM
 */
function sanitizeJsonWithLatex(jsonStr: string): string {
  let inString = false;
  let result = "";
  let i = 0;

  while (i < jsonStr.length) {
    const ch = jsonStr[i];

    if (!inString) {
      if (ch === "\"") inString = true;
      result += ch;
      i++;
    } else {
      if (ch === "\"") {
        inString = false;
        result += ch;
        i++;
      } else if (ch === "\\") {
        const next = jsonStr[i + 1];
        if (next === undefined) {
          result += "\\\\";
          i++;
          continue;
        }

        if (next === "\"" || next === "\\") {
          result += "\\" + next;
          i += 2;
          continue;
        }

        if (next === "u" && /^[0-9a-fA-F]{4}/.test(jsonStr.slice(i + 2, i + 6))) {
          result += jsonStr.slice(i, i + 6);
          i += 6;
          continue;
        }

        // Nhận diện các lệnh LaTeX phổ biến bắt đầu bằng các ký tự escape hợp lệ (f, b, t, n, r)
        const rest = jsonStr.slice(i + 1, i + 10);
        const isLatex = /^(frac|begin|beta|binom|bar|times|text|theta|tau|neq|nu|nabla|rho|right|bf|partial|phi|left)/i.test(rest);

        if (isLatex) {
          result += "\\\\";
          i++;
        } else if (next === "n" || next === "r" || next === "t" || next === "/" || next === "b" || next === "f") {
          result += "\\" + next;
          i += 2;
        } else {
          result += "\\\\";
          i++;
        }
      } else if (ch === "\n") {
        result += "\\n";
        i++;
      } else if (ch === "\r") {
        result += "\\r";
        i++;
      } else if (ch === "\t") {
        result += "\\t";
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  return result;
}

/**
 * Trích xuất và parse JSON an toàn từ phản hồi của Gemini (hỗ trợ LaTeX và chuỗi phức tạp)
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
  } catch {}

  // 3. Cắt lấy khối JSON chính { ... } hoặc [ ... ]
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  let extracted = cleaned;
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    extracted = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    const firstArr = cleaned.indexOf("[");
    const lastArr = cleaned.lastIndexOf("]");
    if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
      extracted = cleaned.slice(firstArr, lastArr + 1);
    }
  }

  try {
    return JSON.parse(extracted);
  } catch {}

  // 4. Áp dụng bộ khử lỗi LaTeX và ký tự điều khiển
  try {
    const sanitized = sanitizeJsonWithLatex(extracted);
    return JSON.parse(sanitized);
  } catch (err) {
    console.warn("⚠️ JSON parse thất bại sau khi khử lỗi LaTeX:", err);
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
