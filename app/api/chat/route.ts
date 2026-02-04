import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 1. Query Database: Lấy danh sách khóa học ĐÃ XUẤT BẢN từ bảng Course (Schema mới)
  const courses = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      instructor: {
        select: {
          fullName: true,
        },
      },
      category: {
        select: {
          name: true
        }
      }
    },
  });

  console.log(`📚 Tìm thấy ${courses.length} khóa học Published trong database.`);

  // 2. Format dữ liệu đầu vào cho AI (Context Engineering)
  const contextData = courses
    .map((course) => {
      // Thumbnail từ DB hoặc placeholder
      const thumbnail = course.thumbnailUrl || "https://placehold.co/600x400?text=No+Image";

      // Tạo link khóa học
      const fullLink = `${baseUrl}/courses/${course.id}`;
      const instructorName = course.instructor.fullName || "Đội ngũ Aura";
      const categoryName = course.category?.name || "Chung";

      return `
    ---
    ID: ${course.id}
    Tên: ${course.title}
    Giảng viên: ${instructorName}
    Danh mục: ${categoryName}
    Mô tả: ${course.description || "Chưa có mô tả"}
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
    model: google("gemini-2.5-flash"),
    messages: await convertToModelMessages(messages),
    system: systemPrompt,
  });

  return result.toUIMessageStreamResponse();
}
