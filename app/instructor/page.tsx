import Link from "next/link";
import { db } from "@/lib/prisma";
import { UploadCloud, PlayCircle, BookOpen, Users } from "lucide-react"; // Changed Eye to Users
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ActivityChart } from "@/app/components/dashboard/ActivityChart";

export default async function InstructorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch Courses with Enrollments
  const courses = await db.course.findMany({
    where: { instructorId: user.id },
    include: {
      _count: {
        select: {
          chapters: true,
        }
      },
      chapters: {
        include: {
          lessons: true
        }
      },
      enrollments: true // Fetch all enrollments for calc
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate Stats
  const totalCourses = courses.length;

  const totalVideos = courses.reduce((acc, course) => {
    const lessonsInCourse = course.chapters.reduce((chapterAcc, chapter) => chapterAcc + chapter.lessons.length, 0);
    return acc + lessonsInCourse;
  }, 0);

  const totalEnrollments = courses.reduce((acc, course) => acc + course.enrollments.length, 0);

  // --- CHART DATA PREP ---
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d,
      label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), // "28/01"
      key: d.toISOString().split('T')[0], // "2026-01-28" (UTC based, practically sufficient)
      value: 0
    };
  });

  const allEnrollments = courses.flatMap(c => c.enrollments);

  allEnrollments.forEach(enroll => {
    // Use enrollment date (Assuming UTC stored)
    const dateKey = enroll.joinedAt.toISOString().split('T')[0];
    const dayStat = last7Days.find(d => d.key === dateKey);
    if (dayStat) dayStat.value += 1;
  });

  const chartData = last7Days.map(d => ({ label: d.label, value: d.value }));

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
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <BookOpen size={24} />
          </div>
          <div>
            <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest">Khóa học</h4>
            <p className="text-2xl font-serif font-bold text-stone-800">{totalCourses}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <PlayCircle size={24} />
          </div>
          <div>
            <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest">Video bài giảng</h4>
            <p className="text-2xl font-serif font-bold text-stone-800">{totalVideos}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Users size={24} />
          </div>
          <div>
            <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest">Học viên</h4>
            <p className="text-2xl font-serif font-bold text-stone-800">{totalEnrollments}</p>
          </div>
        </div>
      </div>

      {/* --- RECENT ACTIVITY & TIPS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* CHART VISUALIZATION */}
        <ActivityChart
          data={chartData}
          title="Xu hướng học viên"
          description="Số lượng học viên đăng ký mới trong 7 ngày qua"
        />

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
            <li className="flex gap-2">
              <span className="text-[#C5A059] font-bold">•</span>
              Chia sẻ khóa học lên mạng xã hội để thu hút học viên mới.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}