// Supabase Edge Function client helper
// Dùng để gọi Edge Functions từ client

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface SendMessageParams {
  conversationId: string;
  content: string;
  senderId: string;
  accessToken?: string;
}

interface SendMessageResponse {
  success?: boolean;
  message?: {
    id: string;
    content: string;
    senderId: string;
    conversationId: string;
    createdAt: string;
  };
  error?: string;
  latency?: string;
}

/**
 * Gửi tin nhắn qua Edge Function (nhanh hơn Server Action)
 * Latency: ~20-50ms thay vì 200-500ms
 */
export async function sendMessageEdge(params: SendMessageParams): Promise<SendMessageResponse> {
  const { conversationId, content, senderId, accessToken } = params;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header nếu Edge Function yêu cầu JWT verification
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          conversationId,
          content,
          senderId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || `HTTP ${response.status}` };
    }

    return result;
  } catch (error) {
    console.error('Edge Function call failed:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Fallback: Gửi tin nhắn qua Server Action (nếu Edge Function fail)
 */
export { sendMessage as sendMessageFallback } from '@/app/actions/chat';
