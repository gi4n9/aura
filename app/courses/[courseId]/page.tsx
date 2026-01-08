
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import VideoPlayer from "@/app/components/VideoPlayer";
import CourseSidebar from "@/app/components/CourseSidebar";

async function getCourseDetail(courseId: string) {
  const course = await prisma.playlist.findMany({
    where: { id: courseId },
    include: {
      videos: {
        orderBy: { stt: "asc" },
      },
    },
  });
  return course[0];
}

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ videoId?: string }>;
};

export default async function CourseDetailPage(props: Props) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const course = await getCourseDetail(params.courseId);

  if (!course) {
    return notFound();
  }

  const currentVideoId = searchParams.videoId || course.videos[0]?.youtubeId;
  const currentVideo = course.videos.find((v) => v.youtubeId === currentVideoId);

  if (!currentVideo && course.videos.length > 0) {
     return <div className="p-20 text-center font-serif text-xl text-stone-500">Video không tồn tại hoặc đã bị xóa.</div>;
  }

  return (
    <div className="min-h-screen bg-[#F9F8F4] text-[#1a1a1a]">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm/50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-stone-500">
            <Link href="/" className="hover:text-[#C5A059] transition-colors flex items-center gap-1">
                <Home size={14} className="mb-0.5" /> Home
            </Link> 
            <ChevronRight size={12} className="text-stone-300"/> 
            <Link href="/courses" className="hover:text-[#C5A059] transition-colors">Khóa học</Link> 
            <ChevronRight size={12} className="text-stone-300"/> 
            <span className="text-[#1a1a1a] truncate max-w-[200px] md:max-w-md">{course.title}</span>
          </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-6">
            {currentVideo ? (
                <VideoPlayer 
                    videoId={currentVideo.youtubeId}
                    title={currentVideo.title}
                    description={`Bài ${currentVideo.stt}: ${currentVideo.title}`}
                />
            ) : (
                <div className="aspect-video bg-stone-200 flex items-center justify-center rounded-xl text-stone-500 font-serif">
                    Chưa có nội dung video
                </div>
            )}
          </div>

          {/* Sidebar Playlist */}
          <div className="lg:col-span-1 lg:sticky lg:top-24">
              {/* Đã xóa wrapper div thừa, component tự xử lý style */}
              <CourseSidebar 
                  courseId={course.id}
                  videos={course.videos}
                  currentVideoId={currentVideoId}
              />
          </div>
        </div>
      </div>
    </div>
  );
}