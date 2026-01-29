// prisma/seed.ts
import { PrismaClient, UserRole, CourseStatus } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Cấu trúc JSON file
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

interface CategoryDef {
  name: string;
  slug: string;
  description: string;
  icon?: string;
  children?: {
    name: string;
    slug: string;
    description?: string;
  }[];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: "Lập trình & CNTT",
    slug: "lap-trinh",
    description: "Chinh phục thế giới công nghệ với các khóa học từ cơ bản đến chuyên sâu.",
    icon: "terminal", 
    children: [
      { name: "Backend Development", slug: "backend", description: "Node.js, Python, Java, Go..." },
      { name: "Frontend Development", slug: "frontend", description: "React, Vue, Angular, CSS..." },
      { name: "Mobile App", slug: "mobile", description: "Flutter, React Native, iOS, Android..." },
      { name: "DevOps & Cloud", slug: "devops", description: "AWS, Docker, Kubernetes, CI/CD..." },
      { name: "Data Science & AI", slug: "data-science", description: "Python, Machine Learning, Big Data..." },
    ]
  },
  {
    name: "Ngoại ngữ",
    slug: "ngoai-ngu", 
    description: "Mở rộng cơ hội nghề nghiệp toàn cầu.",
    icon: "globe",
    children: [
      { name: "Tiếng Anh Giao tiếp", slug: "tieng-anh-giao-tiep" },
      { name: "Luyện thi TOEIC", slug: "toeic" },
      { name: "IELTS", slug: "ielts" },
      { name: "Tiếng Nhật", slug: "tieng-nhat" },
      { name: "Tiếng Trung", slug: "tieng-trung" },
    ]
  },
  {
    name: "Thiết kế & Sáng tạo",
    slug: "thiet-ke",
    description: "Thỏa sức sáng tạo với UI/UX, Graphic Design.",
    icon: "pen-tool",
    children: [
      { name: "UI/UX Design", slug: "ui-ux" },
      { name: "Graphic Design", slug: "graphic-design" },
      { name: "Video Editing", slug: "video-editing" },
    ]
  },
  {
    name: "Kinh doanh & Start-up",
    slug: "kinh-doanh",
    description: "Kiến thức thực chiến về Marketing, Quản trị và Khởi nghiệp.",
    icon: "briefcase",
    children: [
      { name: "Digital Marketing", slug: "marketing" },
      { name: "Khởi nghiệp", slug: "startup" },
      { name: "Tài chính cá nhân", slug: "tai-chinh" },
    ]
  }
];

// Hàm helper để map keyword từ tên khóa học sang category slug
function matchCategory(courseTitle: string): string | null {
  const title = courseTitle.toLowerCase();
  
  if (title.includes("react") || title.includes("vue") || title.includes("css") || title.includes("html") || title.includes("frontend") || title.includes("web")) 
    return "frontend";
  if (title.includes("node") || title.includes("backend") || title.includes("java") || title.includes("api") || title.includes("database") || title.includes("sql")) 
    return "backend";
  if (title.includes("mobile") || title.includes("android") || title.includes("flutter") || title.includes("ios")) 
    return "mobile";
  if (title.includes("data") || title.includes("python") || title.includes("ai") || title.includes("learning")) 
    return "data-science";
  if (title.includes("deploy") || title.includes("docker") || title.includes("cloud") || title.includes("aws")) 
    return "devops";
    
  if (title.includes("toeic")) return "toeic";
  if (title.includes("ielts")) return "ielts";
  if (title.includes("english") || title.includes("tiếng anh")) return "tieng-anh-giao-tiep";
  if (title.includes("japanese") || title.includes("tiếng nhật")) return "tieng-nhat";
  
  if (title.includes("design") || title.includes("ux") || title.includes("ui") || title.includes("thiết kế")) return "ui-ux";

  // Mặc định mapping vào parent nếu không tìm thấy child cụ thể, hoặc null
  if (title.includes("lập trình") || title.includes("code")) return "lap-trinh"; // Fallback to parent category slug if possible, but our schema relation is to one category. 
  // Để đơn giản, ta sẽ chỉ tìm child category.
  
  return null;
}

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu...");

  // ---------------------------------------------------------
  // 1. SEED CATEGORIES
  // ---------------------------------------------------------
  console.log("📂 Seeding Categories...");
  
  // Map để lưu ID của các category đã tạo để dùng sau này (map slug -> id)
  const categoryMap = new Map<string, string>();

  for (const cat of CATEGORIES) {
    // Tạo Parent Category
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon 
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon
      }
    });

    categoryMap.set(parent.slug, parent.id);
    console.log(`  - Parent: ${parent.name}`);

    // Tạo Children Categories
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) {
        const childCat = await prisma.category.upsert({
          where: { slug: child.slug },
          update: {
            name: child.name,
            parentId: parent.id, // Link to parent
            description: child.description || ""
          },
          create: {
            name: child.name,
            slug: child.slug,
            parentId: parent.id,
            description: child.description || ""
          }
        });
        categoryMap.set(child.slug, childCat.id);
        console.log(`    Training --> ${childCat.name}`);
      }
    }
  }

  // ---------------------------------------------------------
  // 2. TẠO ORGANIZATION MẶC ĐỊNH
  // ---------------------------------------------------------
  const defaultOrg = await prisma.organization.upsert({
    where: { id: "org-youtube-free" },
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
  // 3. TẠO INSTRUCTOR
  // ---------------------------------------------------------
  const instructorEmail = "teacher@edustream.com";

  const instructor = await prisma.profile.upsert({
    where: { email: instructorEmail },
    update: {
      organizationId: defaultOrg.id,
    },
    create: {
      email: instructorEmail,
      fullName: "Giảng Viên YouTube",
      role: UserRole.INSTRUCTOR,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
      organizationId: defaultOrg.id,
    },
  });

  console.log(
    `👤 Instructor: ${instructor.fullName} (Thuộc Org: ${defaultOrg.name})`
  );

  // ---------------------------------------------------------
  // 4. IMPORT KHÓA HỌC & MAP CATEGORY
  // ---------------------------------------------------------
  const args = process.argv.slice(2);
  let targetDir = args[0]
    ? path.resolve(args[0])
    : path.join(__dirname, "data");

  if (!fs.existsSync(targetDir)) {
    console.log(`⚠️ Folder data không tồn tại: ${targetDir}. Chỉ seed categories.`);
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

      // Simple Auto-Category Matching based on title
      const matchedSlug = matchCategory(courseData.title);
      const categoryId = matchedSlug ? categoryMap.get(matchedSlug) : null;

      console.log(`⏳ Processing: ${courseData.title} --> Category: ${matchedSlug || "None"}`);

      const createdCourse = await prisma.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          thumbnailUrl: courseData.thumbnailUrl,
          price: 0,
          status: CourseStatus.PUBLISHED,
          instructorId: instructor.id,
          organizationId: defaultOrg.id,
          categoryId: categoryId, // <--- Link Category here

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
