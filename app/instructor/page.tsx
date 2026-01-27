import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UploadCloud, PlayCircle, BookOpen, Eye } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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

      {/* --- RECENT ACTIVITY (Placeholder) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-stone-800 mb-4">Hoạt động gần đây</h3>
          <div className="text-center py-10 text-stone-400 text-sm">
            Chưa có hoạt động nào được ghi nhận.
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-stone-800 mb-4">Mẹo phát triển kênh</h3>
          <ul className="space-y-3 text-sm text-stone-600">
            <li className="flex gap-2">
              <span className="text-[#C5A059] font-bold">•</span>
              Tạo tiêu đề hấp dẫn để tăng tỷ lệ click.
            </li>
            <li className="flex gap-2">
              <span className="text-[#C5A059] font-bold">•</span>
              Tương tác với học viên qua phần bình luận.
            </li>
            <li className="flex gap-2">
              <span className="text-[#C5A059] font-bold">•</span>
              Đăng tải nội dung đều đặn hàng tuần.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}