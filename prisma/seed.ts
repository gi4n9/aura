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
    channel: string;
    category_slug?: string;
    category_parent_slug?: string;
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
    icon?: string;
  }[];
}

const CATEGORIES: CategoryDef[] = [
  {
    name: "Lập trình & CNTT",
    slug: "lap-trinh",
    description: "Chinh phục thế giới công nghệ với các khóa học Lập trình từ cơ bản đến nâng cao.",
    icon: "terminal", 
    children: [
      { name: "Frontend Development", slug: "frontend", description: "Lập trình giao diện Web với React, Vue, HTML, CSS, Next.js", icon: "layout" },
      { name: "Backend Development", slug: "backend", description: "Xây dựng hệ thống Server & API với Node.js, Python, Java, Go, SQL", icon: "server" },
      { name: "Fullstack Development", slug: "fullstack", description: "Lập trình Web & App toàn diện từ Frontend tới Backend", icon: "layers" },
      { name: "Mobile App", slug: "mobile", description: "Phát triển ứng dụng di động với Flutter, React Native, iOS & Android", icon: "smartphone" },
      { name: "DevOps & Cloud", slug: "devops", description: "Triển khai & quản trị đám mây với AWS, Docker, Kubernetes, CI/CD", icon: "cloud" },
      { name: "Data Science & AI", slug: "data-science", description: "Phân tích dữ liệu lớn và học máy với Python, SQL & Big Data", icon: "database" },
    ]
  },
  {
    name: "AI & Machine Learning",
    slug: "ai",
    description: "Khám phá Trí tuệ nhân tạo, Học máy và Kỹ thuật Prompt hiện đại.",
    icon: "cpu",
    children: [
      { name: "Machine Learning & Prompt Engineering", slug: "machine-learning", description: "Xây dựng mô hình AI, LLM và tối ưu hóa Prompt Engineering", icon: "sparkles" }
    ]
  },
  {
    name: "Ngoại ngữ",
    slug: "ngoai-ngu", 
    description: "Nâng cao trình độ ngoại ngữ và phát triển sự nghiệp toàn cầu.",
    icon: "globe",
    children: [
      { name: "IELTS", slug: "ielts", description: "Luyện thi IELTS 4 kỹ năng Nghe, Nói, Đọc, Viết đạt Band điểm cao", icon: "award" },
      { name: "Luyện thi TOEIC", slug: "toeic", description: "Bí quyết luyện thi TOEIC Listening & Reading hiệu quả", icon: "file-text" },
      { name: "Tiếng Anh Giao tiếp", slug: "tieng-anh-giao-tiep", description: "Rèn luyện phản xạ giao tiếp Tiếng Anh tự tin và chuẩn bản xứ", icon: "message-circle" },
      { name: "Tiếng Nhật", slug: "tieng-nhat", description: "Chinh phục Tiếng Nhật từ trình độ sơ cấp N5 đến cao cấp N1", icon: "subtitles" },
      { name: "Tiếng Trung", slug: "tieng-trung", description: "Học Tiếng Trung giao tiếp và luyện thi chứng chỉ HSK", icon: "landmark" },
    ]
  },
  {
    name: "Thiết kế & Sáng tạo",
    slug: "thiet-ke",
    description: "Thỏa sức sáng tạo với các công cụ thiết kế UI/UX, Đồ họa và Video.",
    icon: "pen-tool",
    children: [
      { name: "UI/UX Design", slug: "ui-ux", description: "Thiết kế trải nghiệm & giao diện người dùng chuyên nghiệp với Figma", icon: "component" },
      { name: "Graphic Design", slug: "graphic-design", description: "Thiết kế đồ họa truyền thông với Photoshop & Illustrator", icon: "image" },
      { name: "Video Editing", slug: "video-editing", description: "Dựng video & hiệu ứng hình ảnh với Premiere Pro, CapCut, After Effects", icon: "video" },
    ]
  },
  {
    name: "Kinh doanh & Start-up",
    slug: "kinh-doanh",
    description: "Kiến thức thực chiến về Marketing, Quản trị, Khởi nghiệp & Tài chính.",
    icon: "briefcase",
    children: [
      { name: "Digital Marketing", slug: "marketing", description: "Chiến lược Marketing Online, SEO, Facebook Ads, TikTok Ads", icon: "megaphone" },
      { name: "Khởi nghiệp", slug: "startup", description: "Xây dựng & vận hành mô hình kinh doanh khởi nghiệp thành công", icon: "rocket" },
      { name: "Tài chính cá nhân", slug: "tai-chinh", description: "Quản lý tài chính, dòng tiền và chiến lược đầu tư thông minh", icon: "dollar-sign" },
    ]
  },
  {
    name: "Khác & Tổng hợp",
    slug: "khac",
    description: "Tổng hợp các bài giảng và các lĩnh vực tri thức mở rộng khác.",
    icon: "grid",
    children: [
      { name: "Bài giảng tổng hợp", slug: "bai-giang-tong-hop", description: "Các bài giảng đa dạng thuộc nhiều chủ đề kiến thức", icon: "book-marked" }
    ]
  }
];

// Hàm helper để map keyword từ tên khóa học sang category slug
function matchCategory(courseTitle: string): string | null {
  const title = courseTitle.toLowerCase();
  
  if (title.includes("ielts") || title.includes("writing") || title.includes("speaking") || title.includes("listening") || title.includes("reading")) return "ielts";
  if (title.includes("toeic")) return "toeic";
  if (title.includes("english") || title.includes("tiếng anh")) return "tieng-anh-giao-tiep";
  if (title.includes("japanese") || title.includes("tiếng nhật")) return "tieng-nhat";
  if (title.includes("chinese") || title.includes("tiếng trung")) return "tieng-trung";

  if (title.includes("fullstack") || title.includes("full-stack") || title.includes("full stack")) return "fullstack";
  if (title.includes("react") || title.includes("vue") || title.includes("css") || title.includes("html") || title.includes("frontend") || title.includes("web")) 
    return "frontend";
  if (title.includes("node") || title.includes("backend") || title.includes("java") || title.includes("api") || title.includes("database") || title.includes("sql")) 
    return "backend";
  if (title.includes("mobile") || title.includes("android") || title.includes("flutter") || title.includes("ios")) 
    return "mobile";
  if (title.includes("data") || title.includes("python") || title.includes("ai") || title.includes("machine learning") || title.includes("learning")) 
    return "data-science";
  if (title.includes("deploy") || title.includes("docker") || title.includes("cloud") || title.includes("aws")) 
    return "devops";
    
  if (title.includes("video") || title.includes("capcut") || title.includes("premiere") || title.includes("edit")) return "video-editing";
  if (title.includes("photoshop") || title.includes("illustrator") || title.includes("graphic")) return "graphic-design";
  if (title.includes("design") || title.includes("ux") || title.includes("ui") || title.includes("thiết kế") || title.includes("figma")) return "ui-ux";
  
  if (title.includes("marketing") || title.includes("kinh doanh")) return "marketing";
  if (title.includes("lập trình") || title.includes("code")) return "frontend";
  
  return null;
}

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu...");

  // ---------------------------------------------------------
  // 1. SEED CATEGORIES (Đồng bộ icon & description đầy đủ)
  // ---------------------------------------------------------
  console.log("📂 Seeding Categories & updating Icons/Descriptions...");
  
  const categoryMap = new Map<string, string>();

  for (const cat of CATEGORIES) {
    // 1.1 Cập nhật / Tạo mới Parent Category
    let parent = await prisma.category.findUnique({
      where: { slug: cat.slug }
    });

    if (parent) {
      parent = await prisma.category.update({
        where: { id: parent.id },
        data: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon
        }
      });
      console.log(`  🔄 Cập nhật Parent Category: ${parent.name} (Icon: ${parent.icon})`);
    } else {
      parent = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon 
        }
      });
      console.log(`  ✅ Đã tạo Parent Category: ${parent.name} (Icon: ${parent.icon})`);
    }

    categoryMap.set(parent.slug, parent.id);

    // 1.2 Cập nhật / Tạo mới Children Categories
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) {
        let childCat = await prisma.category.findUnique({
          where: { slug: child.slug }
        });

        if (childCat) {
          childCat = await prisma.category.update({
            where: { id: childCat.id },
            data: {
              name: child.name,
              parentId: parent.id,
              description: child.description || "",
              icon: child.icon || null
            }
          });
          console.log(`    🔄 Cập nhật Child Category: ${childCat.name} (Icon: ${childCat.icon})`);
        } else {
          childCat = await prisma.category.create({
            data: {
              name: child.name,
              slug: child.slug,
              parentId: parent.id,
              description: child.description || "",
              icon: child.icon || null
            }
          });
          console.log(`    ✅ Đã tạo Child Category: ${childCat.name} (Icon: ${childCat.icon})`);
        }
        categoryMap.set(child.slug, childCat.id);
      }
    }
  }

  // ---------------------------------------------------------
  // 2. TẠO ORGANIZATION MẶC ĐỊNH
  // ---------------------------------------------------------
  let defaultOrg = await prisma.organization.findUnique({
    where: { id: "org-youtube-free" }
  });

  if (defaultOrg) {
    console.log(`⏩ Organization đã tồn tại (Bỏ qua): ${defaultOrg.name}`);
  } else {
    defaultOrg = await prisma.organization.create({
      data: {
        id: "org-youtube-free",
        name: "Học liệu mở YouTube",
        description: "Tổng hợp các khóa học miễn phí chất lượng cao từ YouTube",
        logoUrl:
          "https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png",
      },
    });
    console.log(`🏢 Đã tạo Organization: ${defaultOrg.name}`);
  }

  // ---------------------------------------------------------
  // 3. TẠO INSTRUCTOR
  // ---------------------------------------------------------
  const instructorEmail = "teacher@edustream.com";

  let instructor = await prisma.profile.findUnique({
    where: { email: instructorEmail }
  });

  if (instructor) {
    console.log(`⏩ Instructor đã tồn tại (Bỏ qua): ${instructor.fullName} (${instructor.email})`);
  } else {
    instructor = await prisma.profile.create({
      data: {
        email: instructorEmail,
        fullName: "Giảng Viên YouTube",
        role: UserRole.INSTRUCTOR,
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
        organizationId: defaultOrg.id,
      },
    });
    console.log(
      `👤 Đã tạo Instructor: ${instructor.fullName} (Thuộc Org: ${defaultOrg.name})`
    );
  }

  // ---------------------------------------------------------
  // 4. IMPORT KHÓA HỌC & MAP CATEGORY CHA - CON (BẮT BUỘC)
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

      // Kiểm tra xem khóa học theo title đã tồn tại trên Supabase/Database chưa
      const existingCourse = await prisma.course.findFirst({
        where: {
          title: courseData.title,
        },
      });

      if (existingCourse) {
        console.log(`⏩ Bỏ qua Khóa học đã tồn tại trên Supabase: ${courseData.title}`);
        continue;
      }

      // Xử lý Category Cha - Con cho Khóa học (Đảm bảo KHÔNG bị mồ côi)
      let categoryId: string | null = null;
      let matchedSlug: string | null = null;

      // 1. Ưu tiên lấy category_slug từ JSON _meta
      if (courseData._meta && courseData._meta.category_slug) {
        matchedSlug = courseData._meta.category_slug;
      }

      // 2. Nếu chưa có trong JSON _meta, tự động match từ tên khóa học
      if (!matchedSlug) {
        matchedSlug = matchCategory(courseData.title);
      }

      // 3. Tra cứu ID từ categoryMap
      if (matchedSlug && categoryMap.has(matchedSlug)) {
        categoryId = categoryMap.get(matchedSlug)!;
      }

      // 4. Nếu vẫn không xác định được, gán vào Category con thuộc Parent "Khác & Tổng hợp"
      if (!categoryId) {
        categoryId = categoryMap.get("bai-giang-tong-hop") || null;
        console.log(`📌 Khóa học "${courseData.title}" được gắn vào Category mặc định: [Khác & Tổng hợp -> Bài giảng tổng hợp] (Tránh data mồ côi)`);
      } else {
        console.log(`⏳ Đang tạo khóa học: ${courseData.title} --> Category Slug: ${matchedSlug}`);
      }

      const createdCourse = await prisma.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          thumbnailUrl: courseData.thumbnailUrl,
          price: 0,
          status: CourseStatus.PUBLISHED,
          instructorId: instructor.id,
          organizationId: defaultOrg.id,
          categoryId: categoryId,

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

      console.log(`   ✅ Đã tạo khóa học thành công (Linked Category): ${createdCourse.title}`);
    } catch (error) {
      console.error(`❌ Lỗi xử lý file ${fileName}:`, error);
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
