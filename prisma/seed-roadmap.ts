import { PrismaClient, CourseStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu tạo dữ liệu mẫu cho Lộ trình (Roadmap)...");

  // 1. Tổ chức mặc định
  const defaultOrg = await prisma.organization.upsert({
    where: { id: "org-youtube-free" },
    update: {},
    create: {
      id: "org-youtube-free",
      name: "Học liệu mở",
      description: "Tổ chức tạo dữ liệu mẫu",
      logoUrl: "",
    },
  });

  // 2. Giáo viên mặc định
  const instructor = await prisma.profile.upsert({
    where: { email: "teacher@edustream.com" },
    update: { organizationId: defaultOrg.id },
    create: {
      email: "teacher@edustream.com",
      fullName: "Giảng Viên Mẫu",
      role: "INSTRUCTOR",
      organizationId: defaultOrg.id,
    },
  });

  // 3. Danh mục
  const categoriesData = [
    { name: "Frontend Development", slug: "frontend", description: "Lập trình giao diện" },
    { name: "Backend Development", slug: "backend", description: "Lập trình máy chủ" },
    { name: "AI & Machine Learning", slug: "ai", description: "Trí tuệ nhân tạo" },
    { name: "Fullstack Development", slug: "fullstack", description: "Lập trình toàn diện" },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    categories[cat.slug] = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // 4. Tạo khóa học Frontend
  const htmlCss = await prisma.course.create({
    data: {
      title: "HTML/CSS Cơ bản",
      description: "Nhập môn lập trình Web với HTML và CSS",
      thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/6/61/HTML5_logo_and_wordmark.svg",
      price: 0,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      organizationId: defaultOrg.id,
      categoryId: categories["frontend"].id,
    }
  });

  const jsBasic = await prisma.course.create({
    data: {
      title: "Javascript Nền tảng",
      description: "Học lập trình Javascript từ con số 0",
      thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/9/99/Unofficial_JavaScript_logo_2.svg",
      price: 0,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      organizationId: defaultOrg.id,
      categoryId: categories["frontend"].id,
    }
  });

  const reactCourse = await prisma.course.create({
    data: {
      title: "ReactJS Thực chiến",
      description: "Xây dựng ứng dụng web hiện đại với ReactJS",
      thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
      price: 0,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      organizationId: defaultOrg.id,
      categoryId: categories["frontend"].id,
    }
  });

  // 5. Thiết lập điều kiện tiên quyết (Prerequisites) cho Frontend
  // Phải học HTML/CSS trước khi học JS
  await prisma.coursePrerequisite.create({
    data: {
      courseId: jsBasic.id,
      prerequisiteId: htmlCss.id,
    }
  });

  // Phải học JS trước khi học React
  await prisma.coursePrerequisite.create({
    data: {
      courseId: reactCourse.id,
      prerequisiteId: jsBasic.id,
    }
  });

  // 6. Tạo khóa học Backend
  const nodejs = await prisma.course.create({
    data: {
      title: "Node.js Cơ bản",
      description: "Lập trình server với Node.js",
      price: 0,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      organizationId: defaultOrg.id,
      categoryId: categories["backend"].id,
    }
  });

  const database = await prisma.course.create({
    data: {
      title: "SQL & Cơ sở dữ liệu",
      description: "Thiết kế và truy vấn CSDL",
      price: 0,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      organizationId: defaultOrg.id,
      categoryId: categories["backend"].id,
    }
  });

  const apiDesign = await prisma.course.create({
    data: {
      title: "Thiết kế RESTful API",
      description: "Tạo API chuẩn REST",
      price: 0,
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      organizationId: defaultOrg.id,
      categoryId: categories["backend"].id,
    }
  });

  // Thiết lập điều kiện Backend
  // Học Node.js và Database xong mới thiết kế được API
  await prisma.coursePrerequisite.createMany({
    data: [
      { courseId: apiDesign.id, prerequisiteId: nodejs.id },
      { courseId: apiDesign.id, prerequisiteId: database.id },
    ]
  });

  console.log("✅ Đã tạo xong dữ liệu mẫu thành công!");
  console.log("👉 Bạn có thể quay lại trang /roadmap, ấn Bắt đầu thiết lập và chọn Frontend hoặc Backend để test Lộ trình.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
