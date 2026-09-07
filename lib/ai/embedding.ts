import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';

// Google Gemini Embedding Model
// gemini-embedding-001 produces an embedding with 3072 dimensions
const EMBEDDING_MODEL = google.textEmbeddingModel('gemini-embedding-001');

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: text,
    });
    return embedding;
  } catch (error: any) {
    console.error("Embedding Error:", error.message);
    // Return empty array on error to prevent crash
    return [];
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Xử lý embed một batch có kèm retry và tự động chờ khi chạm rate limit (100 RPM của Gemini Free Tier)
 */
async function embedBatchWithRetry(
  slice: string[],
  batchIndex: number,
  maxRetries = 4
): Promise<number[][]> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const { embeddings } = await embedMany({
        model: EMBEDDING_MODEL,
        values: slice,
      });
      return embeddings;
    } catch (error: any) {
      attempt++;
      const errorMessage = error?.message || "";
      const isRateLimit =
        errorMessage.includes("quota") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("rate-limit") ||
        errorMessage.includes("429");

      if (isRateLimit && attempt < maxRetries) {
        // Trích xuất số giây retry nếu Google phản hồi (ví dụ: Please retry in 2.90311182s)
        const match = errorMessage.match(/retry in ([0-9.]+)s/i);
        const waitSeconds = match ? Math.ceil(parseFloat(match[1])) + 1 : attempt * 3;
        console.warn(
          `⏳ [Gemini Embedding] Chạm giới hạn Free Tier (100 RPM). Tự động chờ ${waitSeconds}s trước khi thử lại batch ${batchIndex} (lần ${attempt}/${maxRetries})...`
        );
        await delay(waitSeconds * 1000);
      } else {
        if (attempt >= maxRetries) {
          console.error(`❌ [Gemini Embedding] Thất bại sau ${maxRetries} lần thử cho batch ${batchIndex}:`, errorMessage);
          return slice.map(() => []);
        }
        await delay(1000 * attempt);
      }
    }
  }

  return slice.map(() => []);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];

  // Google Gemini API limit: tối đa 100 requests per batch.
  // Đặt BATCH_SIZE = 45 để an toàn dưới ngưỡng 100 RPM
  const BATCH_SIZE = 45;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatchWithRetry(slice, i);
    allEmbeddings.push(...embeddings);

    // Nếu còn batch tiếp theo, nghỉ nhẹ 600ms để tránh request dồn dập
    if (i + BATCH_SIZE < texts.length) {
      await delay(600);
    }
  }

  return allEmbeddings;
}


