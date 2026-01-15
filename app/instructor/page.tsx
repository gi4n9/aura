import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UploadCloud, PlayCircle, BookOpen, Eye, Search, Edit3, } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function InstructorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const courses = await prisma.course.findMany({
    where: { instructorId: user.id },
    include: {
      _count: {
        select: {
          chapters: true, // Đếm số chương
          // Nếu bạn muốn đếm bài học, cần query sâu hơn hoặc tính bên dưới
        }
      },
      chapters: {
        include: {
          lessons: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc', // Mới nhất lên đầu
    },
  });

  // Lấy thống kê cơ bản (Demo: Lấy hết video, sau này lọc theo authorId nếu có)
  const totalCourses = courses.length;
  const totalVideos = courses.reduce((acc, course) => {
    const lessonsInCourse = course.chapters.reduce((chapterAcc, chapter) => chapterAcc + chapter.lessons.length, 0);
    return acc + lessonsInCourse;
  }, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto bg-[#F9F8F4] min-h-screen">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-800">Kênh của bạn</h2>
          <p className="text-stone-500 font-sans text-sm">Quản lý nội dung và thống kê hiệu quả.</p>
        </div>

        <Link
          href="/instructor/create-course"
          className="bg-[#1a1a1a] text-[#C5A059] px-6 py-3 rounded-full font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
        >
          <UploadCloud size={18} />
          Tạo khóa học mới
        </Link>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <BookOpen size={24} />
          </div>
          <div>
            <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest">Khóa học</h4>
            <p className="text-2xl font-serif font-bold text-stone-800">{totalCourses}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <PlayCircle size={24} />
          </div>
          <div>
            <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest">Video bài giảng</h4>
            <p className="text-2xl font-serif font-bold text-stone-800">{totalVideos}</p>
          </div>
        </div>

        {/* Card 3 (Placeholder doanh thu/học viên) */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Eye size={24} />
          </div>
          <div>
            <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest">Lượt xem (Demo)</h4>
            <p className="text-2xl font-serif font-bold text-stone-800">1.2K</p>
          </div>
        </div>
      </div>

      {/* --- CONTENT LIST (YOUTUBE STUDIO STYLE) --- */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between gap-4">
          <h3 className="font-serif font-bold text-lg text-stone-800">Nội dung đã đăng</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-[#C5A059] w-64"
            />
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase tracking-wider">
          <div className="col-span-6">Khóa học</div>
          <div className="col-span-2 text-center">Trạng thái</div>
          <div className="col-span-2 text-center">Giá bán</div>
          <div className="col-span-2 text-center">Ngày tạo</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-stone-100">
          {courses.length === 0 ? (
            <div className="p-12 text-center text-stone-400">
              <p className="mb-4">Bạn chưa có nội dung nào.</p>
              <Link href="/instructor/create" className="text-[#C5A059] font-bold hover:underline">Tạo ngay</Link>
            </div>
          ) : (
            courses.map((course) => {
              const lessonCount = course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);

              return (
                <div key={course.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-stone-50 transition-colors group">

                  {/* Column 1: Info */}
                  <div className="col-span-6 flex gap-4">
                    <div className="relative w-32 aspect-video bg-stone-200 rounded overflow-hidden flex-shrink-0 border border-stone-200">
                      <Image
                        src={course.thumbnailUrl || "/placeholder-course.jpg"}
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-stone-800 line-clamp-1 group-hover:text-[#C5A059] transition-colors cursor-pointer">
                        {course.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {course._count.chapters} chương</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><PlayCircle size={12} /> {lessonCount} bài học</span>
                      </div>
                      {/* Quick Actions on Hover */}
                      <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/instructor/courses/${course.id}/edit`} className="text-stone-500 hover:text-[#C5A059] text-xs font-bold uppercase flex items-center gap-1">
                          <Edit3 size={12} /> Chỉnh sửa
                        </Link>
                        <Link href={`/courses/${course.id}`} className="text-stone-500 hover:text-[#C5A059] text-xs font-bold uppercase flex items-center gap-1">
                          <Eye size={12} /> Xem thử
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Status */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${course.status === 'PUBLISHED'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}>
                      {course.status === 'PUBLISHED' ? 'Công khai' : 'Nháp'}
                    </span>
                  </div>

                  {/* Column 3: Price */}
                  <div className="col-span-2 text-center text-sm font-bold text-stone-700 font-mono">
                    {Number(course.price) === 0 ? "Miễn phí" : new Intl.NumberFormat("vi-VN").format(Number(course.price)) + " đ"}
                  </div>

                  {/* Column 4: Date */}
                  <div className="col-span-2 text-center flex flex-col items-center justify-center text-xs text-stone-500">
                    <span>{new Date(course.createdAt).toLocaleDateString("vi-VN")}</span>
                    <span className="text-[10px] text-stone-400">{new Date(course.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}