import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { encryptMessage } from "@/lib/security/chat-crypto";

export const maxDuration = 30;

// Cấu hình OpenAI provider cho gemini-web2api local server
const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "http://localhost:8081/v1",
  apiKey: process.env.OPENAI_API_KEY || "sk-gemini",
});

export async function POST(req: Request) {
  // 1. Kiểm duyệt Đăng nhập ở Server (Bắt buộc phải đăng nhập mới được trò chuyện với AI)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Vui lòng đăng nhập để trò chuyện với Aura AI." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = await req.json();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // 2. Query Database Context (Courses, Categories, Groups, FAQs & Summary)
  const [courses, categories, groups, faqs, totalCourses, totalCategories, totalGroups, totalLessons] = await Promise.all([
    prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        price: true,
        isFree: true,
        status: true,
        instructor: {
          select: {
            fullName: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            chapters: true,
          },
        },
      },
      take: 30,
    }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            courses: true,
          },
        },
      },
    }),
    prisma.conversation.findMany({
      where: { isGroup: true },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        maxMembers: true,
        course: {
          select: {
            title: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      take: 30,
    }),
    prisma.courseFaq.findMany({
      take: 10,
      select: {
        question: true,
        answer: true,
        course: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.course.count(),
    prisma.category.count(),
    prisma.conversation.count({ where: { isGroup: true } }),
    prisma.lesson.count(),
  ]);

  // Extract last user prompt for logging
  const lastUserMsg = messages[messages.length - 1];
  let userText = "";
  if (typeof lastUserMsg?.content === "string") {
    userText = lastUserMsg.content;
  } else if (lastUserMsg?.text) {
    userText = lastUserMsg.text;
  } else if (Array.isArray(lastUserMsg?.parts)) {
    userText = lastUserMsg.parts
      .filter((p: any) => p.type === "text" && p.text)
      .map((p: any) => p.text)
      .join("\n");
  }

  console.log(`💬 User Question: "${userText.trim()}"`);
  console.log(`📚 DB Context loaded: ${courses.length} khóa học, ${categories.length} danh mục, ${groups.length} nhóm, ${totalLessons} bài học.`);

  // 2. Format dữ liệu gọn gàng, tránh làm nhiễu AI (Context Engineering)
  const courseContext = courses.length > 0
    ? courses
        .map((c) => {
          const priceText = c.isFree || Number(c.price) === 0 ? "Miễn phí" : `${Number(c.price).toLocaleString("vi-VN")} VNĐ`;
          return `- **${c.title}** (Giảng viên: ${c.instructor?.fullName || "Aura"}, Danh mục: ${c.category?.name || "Chung"}, Giá: ${priceText}, ${c._count.chapters} chương)
  - Mô tả: ${c.description || "Chưa có mô tả"}
  - Link: ${baseUrl}/courses/${c.id}`;
        })
        .join("\n")
    : "Chưa có khóa học nào.";

  const categoryContext = categories.length > 0
    ? categories
        .map((cat) => `- **${cat.name}** (${cat._count.courses} khóa học): ${cat.description || "Không có mô tả"}`)
        .join("\n")
    : "Chưa có danh mục nào.";

  const communityPageUrl = `${baseUrl}/community`;

  const groupContext = groups.length > 0
    ? groups
        .map((g) => {
          const courseTitle = g.course?.title ? ` (Thuộc khóa: ${g.course.title})` : "";
          const privacy = g.isPublic ? "Công khai" : "Riêng tư";
          const groupUrl = `${baseUrl}/community/${g.id}`;
          return `- **${g.name || "Nhóm học tập"}**${courseTitle}
  - Mô tả: ${g.description || "Chưa có mô tả"}
  - Thành viên: ${g._count.participants}/${g.maxMembers} (${privacy})
  - Link tham gia nhóm: ${groupUrl}`;
        })
        .join("\n")
    : "Chưa có nhóm cộng đồng nào.";

  const faqContext = faqs.length > 0
    ? faqs
        .map((f) => `Hỏi (${f.course.title}): ${f.question}\nĐáp: ${f.answer}`)
        .join("\n\n")
    : "Chưa có FAQ.";

  // 3. System Prompt tập trung cao độ vào câu hỏi của người dùng
  const systemPrompt = `
Bạn là Aura AI - Trợ lý thông minh chính thức của nền tảng giáo dục trực tuyến Aura.

=== QUY TẮC QUAN TRỌNG NHẤT (PHẢI TUÂN THỦ) ===
1. ĐỌC KỸ CÂU HỎI CỦA HỌC VIÊN VÀ TRẢ LỜI ĐÚNG VÀO TRỌNG TÂM CÂU HỎI ĐÓ. Tuyệt đối KHÔNG trả lời lan man hoặc nói về các chủ đề không liên quan đến câu hỏi.
2. Nếu người dùng CHÀO HỎI (VD: "xin chào", "hi", "bạn là ai"), hãy chào lại ngắn gọn, lịch sự và hỏi xem bạn có thể giúp gì cho học viên.
3. Nếu người dùng hỏi về NHÓM CỘNG ĐỒNG / NHÓM CHAT / GROUP:
   - Hãy liệt kê các nhóm phù hợp từ phần [DỮ LIỆU NHÓM CỘNG ĐỒNG] bên dưới.
   - BẮT BUỘC chèn link Markdown: [👉 Bấm vào đây để tham gia nhóm ngay](Link tham gia nhóm)
   - Hoặc hướng dẫn xem tất cả nhóm tại: [👉 Xem tất cả nhóm cộng đồng](${communityPageUrl})
4. Nếu người dùng hỏi về KHÓA HỌC:
   - Liệt kê khóa học phù hợp từ phần [DỮ LIỆU KHÓA HỌC] bên dưới.
   - BẮT BUỘC chèn link Markdown: [👉 Bấm vào đây để học ngay](Link)
5. Tuyệt đối KHÔNG hiển thị link trần (chưa đóng ngoặc Markdown).

=== DỮ LIỆU THỰC TẾ TỪ CƠ SỞ DỮ LIỆU AURA ===

[TỔNG QUAN HỆ THỐNG]
- Tổng số khóa học: ${totalCourses} | Tổng số bài học: ${totalLessons} | Danh mục: ${totalCategories} | Nhóm cộng đồng: ${totalGroups}

[DỮ LIỆU DANH MỤC]
${categoryContext}

[DỮ LIỆU KHÓA HỌC]
${courseContext}

[DỮ LIỆU NHÓM CỘNG ĐỒNG (GROUP CHAT)]
${groupContext}

[CÂU HỎI THƯỜNG GẶP (FAQ)]
${faqContext}
`;

  // 4. Mã hóa & Lưu lịch sử chat vào Supabase / Prisma Database
  let sessionId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      let chatSession = await prisma.chatSession.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      });

      if (!chatSession) {
        chatSession = await prisma.chatSession.create({
          data: {
            userId: user.id,
            title: "Hội thoại với Aura AI",
          },
        });
      }

      sessionId = chatSession.id;

      // Trích xuất tin nhắn mới nhất của người dùng
      const lastUserMsg = messages[messages.length - 1];
      let userText = "";
      if (typeof lastUserMsg?.content === "string") {
        userText = lastUserMsg.content;
      } else if (lastUserMsg?.text) {
        userText = lastUserMsg.text;
      } else if (Array.isArray(lastUserMsg?.parts)) {
        userText = lastUserMsg.parts
          .filter((p: any) => p.type === "text" && p.text)
          .map((p: any) => p.text)
          .join("\n");
      }

      if (userText.trim()) {
        const encryptedUserContent = encryptMessage(userText.trim());
        await prisma.message.create({
          data: {
            sessionId: chatSession.id,
            role: "user",
            content: encryptedUserContent,
          },
        });
      }
    }
  } catch (err) {
    console.error("[Chat API] Session/Encryption error saving user message:", err);
  }

  // 5. Khởi tạo Stream Text với Gemini AI
  const modelName = process.env.OPENAI_MODEL || "gemini-3.5-flash";

  const result = streamText({
    model: openai.chat(modelName),
    messages: await convertToModelMessages(messages),
    system: systemPrompt,
    onFinish: async ({ text }) => {
      if (sessionId && text) {
        try {
          const encryptedAiContent = encryptMessage(text);
          await prisma.message.create({
            data: {
              sessionId,
              role: "assistant",
              content: encryptedAiContent,
            },
          });
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
          });
          console.log(`🔒 [Chat API] Saved encrypted AI message for session ${sessionId}`);
        } catch (err) {
          console.error("[Chat API] Encryption error saving AI message:", err);
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

