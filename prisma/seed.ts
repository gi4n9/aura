// prisma/seed.ts
import { PrismaClient, UserRole, CourseStatus } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Cấu trúc JSON file (Cập nhật để đọc channel name nếu cần)
type JsonData = {
  title: string;
  description: string;
  thumbnailUrl: string | null;
  price: number;
  status: CourseStatus;
  _meta?: {
    channel: string; // Lấy tên kênh từ meta data cào được
  };
  chapters: Array<{
    title: string;
    position: number;
    lessons: Array<{
      title: string;
      youtubeVideoId: string;
      duration: number;
      position: number;
    }>;
  }>;
};

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu...");

  // ---------------------------------------------------------
  // 1. TẠO ORGANIZATION MẶC ĐỊNH
  // ---------------------------------------------------------
  // Chúng ta tạo một tổ chức "bảo trợ" cho tất cả video từ Youtube
  const defaultOrg = await prisma.organization.upsert({
    where: { id: "org-youtube-free" }, // Dùng ID cố định để không bị tạo trùng
    update: {},
    create: {
      id: "org-youtube-free",
      name: "Học liệu mở YouTube",
      description: "Tổng hợp các khóa học miễn phí chất lượng cao từ YouTube",
      logoUrl:
        "https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png",
    },
  });

  console.log(`🏢 Đã tạo Organization: ${defaultOrg.name}`);

  // ---------------------------------------------------------
  // 2. TẠO INSTRUCTOR (Thuộc về Org trên)
  // ---------------------------------------------------------
  const instructorEmail = "teacher@edustream.com";

  const instructor = await prisma.profile.upsert({
    where: { email: instructorEmail },
    update: {
      organizationId: defaultOrg.id, // Update: Nếu user đã có thì gán vào Org này
    },
    create: {
      email: instructorEmail,
      fullName: "Giảng Viên YouTube",
      role: UserRole.INSTRUCTOR,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      organizationId: defaultOrg.id, // Gán vào Organization
    },
  });

  console.log(
    `👤 Instructor: ${instructor.fullName} (Thuộc Org: ${defaultOrg.name})`
  );

  // ---------------------------------------------------------
  // 3. QUÉT FILE VÀ IMPORT KHÓA HỌC
  // ---------------------------------------------------------
  // (Đoạn code lấy folder giữ nguyên như cũ của bạn)
  const args = process.argv.slice(2);
  let targetDir = args[0]
    ? path.resolve(args[0])
    : path.join(__dirname, "data");

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Folder không tồn tại: ${targetDir}`);
    return;
  }

  const files = fs
    .readdirSync(targetDir)
    .filter((file) => file.startsWith("Course_") && file.endsWith(".json"));

  for (const fileName of files) {
    try {
      const filePath = path.join(targetDir, fileName);
      const rawData = fs.readFileSync(filePath, "utf-8");
      const courseData: JsonData = JSON.parse(rawData);

      console.log(`⏳ Processing: ${courseData.title}`);

      // Nếu muốn Cách 2 (Tên Kênh = Tên Org), bạn sẽ xử lý logic tạo Org ở đây dựa vào courseData._meta.channel

      const createdCourse = await prisma.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          thumbnailUrl: courseData.thumbnailUrl,
          price: 0, // Youtube thì free
          status: CourseStatus.PUBLISHED,
          instructorId: instructor.id,
          organizationId: defaultOrg.id, // QUAN TRỌNG: Gán khóa học vào Org

          chapters: {
            create: courseData.chapters.map((chapter) => ({
              title: chapter.title,
              position: chapter.position,
              lessons: {
                create: chapter.lessons.map((lesson) => ({
                  title: lesson.title,
                  position: lesson.position,
                  youtubeVideoId: lesson.youtubeVideoId,
                  duration: lesson.duration,
                  transcript: "",
                })),
              },
            })),
          },
        },
      });

      console.log(`   ✅ Course created: ${createdCourse.title}`);
    } catch (error) {
      console.error(`❌ Error file ${fileName}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
