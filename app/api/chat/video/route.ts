import { chatWithVideo } from "@/app/actions/video-chat";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support cả 2 format: { messages, lessonId } (từ useChat) hoặc { query, lessonId }
    const lessonId = body.lessonId;
    const query = body.query || body.messages?.[body.messages.length - 1]?.content;

    if (!lessonId) {
      return new Response(JSON.stringify({ error: "Missing lessonId" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return chatWithVideo(lessonId, query);
  } catch (error: any) {
    console.error("Video Chat API Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
