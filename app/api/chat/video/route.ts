import { chatWithVideo } from "@/app/actions/video-chat";

export async function POST(req: Request) {
  const { messages, lessonId } = await req.json();
  const lastMessage = messages[messages.length - 1];
  
  if (!lessonId) {
      return new Response("Missing lessonId", { status: 400 });
  }

  // Delegate to the server action logic
  // Note: Server Actions are usually for mutations called from client directly,
  // but here we are wrapping it in an API route for useChat compatibility.
  return chatWithVideo(lessonId, lastMessage.content);
}
