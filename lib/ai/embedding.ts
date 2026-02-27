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

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: texts,
    });
    return embeddings;
  } catch (error: any) {
    console.error("Embeddings Error:", error.message);
    // Return empty arrays on error
    return texts.map(() => []);
  }
}
