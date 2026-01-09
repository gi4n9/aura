import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 1. Query Database với các trường cần thiết cho hiển thị
  const courses = await prisma.playlist.findMany({
    select: {
      id: true,
      title: true,
      channel: true,
      description: true,
      videos: {
        orderBy: { stt: "asc" },
        take: 1, // Chỉ lấy video đầu để làm thumbnail
        select: { youtubeId: true },
      },
    },
  });

  console.log(`📚 Tìm thấy ${courses.length} khóa học trong database.`);

  // 2. Format dữ liệu đầu vào cho AI (Context Engineering)
  const contextData = courses
    .map((course) => {
      // Tạo link ảnh từ video đầu tiên (nếu có)
      const firstVideo = course.videos[0];
      const thumbnail = firstVideo
        ? `https://img.youtube.com/vi/${firstVideo.youtubeId}/mqdefault.jpg`
        : "Không có hình ảnh";

      // Tạo link khóa học
      const fullLink = `${baseUrl}/courses/${course.id}`;

      return `
    ---
    ID: ${course.id}
    Tên: ${course.title}
    Tác giả: ${course.channel}
    Mô tả: ${course.description}
    Thumbnail: ${thumbnail}
    URL_SẴN: ${fullLink}
    ---
    `;
    })
    .join("\n");

  // 3. System Prompt nâng cao
  const systemPrompt = `
    Bạn là Aura AI. Dưới đây là dữ liệu khóa học:
    ${contextData}

    QUY TẮC TRẢ LỜI (BẮT BUỘC):
    1. Khi giới thiệu khóa học, PHẢI hiển thị link dưới dạng Markdown chuẩn:
       [👉 Bấm vào đây để học ngay](URL_SẴN)
    
    2. Tuyệt đối KHÔNG hiển thị link trần (http://...).
    
    3. Luôn kèm ảnh thumbnail bằng cú pháp: ![Ảnh khóa học](Thumbnail)
    
    4. Nếu trường 'URL_SẴN' trong dữ liệu là gì, hãy copy y nguyên vào phần (URL) của Markdown.
  `;

  const result = streamText({
    model: google("models/gemini-2.5-flash"),
    messages: await convertToModelMessages(messages),
    system: systemPrompt,
  });

  return result.toUIMessageStreamResponse();
}
