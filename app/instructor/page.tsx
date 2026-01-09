import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UploadCloud, PlayCircle, BookOpen } from "lucide-react";

export default async function InstructorDashboard() {
  // Lấy thống kê cơ bản (Demo: Lấy hết video, sau này lọc theo authorId nếu có)
  const totalVideos = await prisma.video.count();
  const totalPlaylists = await prisma.playlist.count();

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-stone-800">Xin chào, Giảng viên!</h2>
          <p className="text-stone-500">Đây là khu vực quản lý bài giảng của bạn.</p>
        </div>
        
        {/* Nút Upload Nhanh */}
        <Link 
          href="/instructor/upload" 
          className="bg-[#1a1a1a] text-[#C5A059] px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg"
        >
          <UploadCloud size={20} />
          Upload Bài Mới
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen />
          </div>
          <div>
            <h4 className="text-stone-500 text-sm font-medium">Tổng khóa học</h4>
            <p className="text-2xl font-bold text-stone-800">{totalPlaylists}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <PlayCircle />
          </div>
          <div>
            <h4 className="text-stone-500 text-sm font-medium">Tổng video</h4>
            <p className="text-2xl font-bold text-stone-800">{totalVideos}</p>
          </div>
        </div>
      </div>

      {/* Khu vực nội dung chính */}
      <div className="bg-white p-8 rounded-2xl border border-dashed border-stone-300 text-center py-20">
        <p className="text-stone-400 mb-4">Bạn chưa chọn khóa học nào để quản lý.</p>
        <Link href="/instructor/courses" className="text-blue-600 hover:underline font-medium">
          Xem tất cả khóa học →
        </Link>
      </div>
    </div>
  );
}