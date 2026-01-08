import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { PlayCircle, Star, ArrowRight, BookOpen, Layers } from "lucide-react";

// Revalidate data mỗi 60 giây (ISR)
export const revalidate = 60;

// Hàm lấy dữ liệu từ DB
async function getCourses() {
  const courses = await prisma.playlist.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      videos: {
        take: 1,
        orderBy: {
          stt: "asc",
        },
      },
    },
  });
  return courses;
}

export default async function CoursePage() {
  const courses = await getCourses();

  return (
    // Nền màu Kem đặc trưng (#F9F8F4)
    <div className="min-h-screen bg-[#F9F8F4] text-[#1a1a1a] py-20 px-4 md:px-8">
      <div className="container mx-auto max-w-7xl">
        
        {/* --- HEADER SECTION --- */}
        <div className="text-center mb-16">
          <div className="inline-block mb-3 text-[10px] font-bold tracking-[0.2em] text-stone-500 uppercase">
            Curriculum
          </div>
          <h1 className="font-serif text-4xl md:text-5xl mb-6 text-[#1a1a1a]">
            Khám phá lộ trình học tập
          </h1>
          {/* Thanh gạch chân màu vàng Gold */}
          <div className="w-16 h-0.5 bg-[#C5A059] mx-auto opacity-60 mb-6"></div>
          <p className="text-stone-600 max-w-2xl mx-auto text-lg font-light leading-relaxed">
            Tổng hợp các khóa học chất lượng cao từ cộng đồng, giúp bạn làm chủ kiến thức từ cơ bản đến nâng cao.
          </p>
        </div>

        {/* --- COURSE GRID --- */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => {
              const firstVideo = course.videos[0];
              const thumbnail = firstVideo
                ? `https://img.youtube.com/vi/${firstVideo.youtubeId}/maxresdefault.jpg`
                : "https://via.placeholder.com/640x360?text=No+Image";

              return (
                <Link
                  href={`/courses/${course.id}`}
                  key={course.id}
                  className="group flex flex-col bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:border-[#C5A059]/50 transition-all duration-500 transform hover:-translate-y-1"
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-video w-full overflow-hidden bg-stone-100">
                    <Image
                      src={thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    
                    {/* Overlay Effect */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                    {/* Badge số bài học (Style AlphaQubit) */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-[#1a1a1a] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm shadow-sm flex items-center gap-1.5">
                      <Layers size={12} className="text-[#C5A059]" />
                      {course.totalVideos} Bài
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="flex flex-col flex-grow p-6">
                    {/* Meta info */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#C5A059]">
                        Miễn phí
                      </span>
                      <span className="text-xs text-stone-400 font-serif italic truncate max-w-[120px] text-right">
                        by {course.channel}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-xl text-[#1a1a1a] mb-3 line-clamp-2 group-hover:text-[#C5A059] transition-colors leading-snug">
                      {course.title}
                    </h3>
                    
                    {/* Divider & Footer */}
                    <div className="mt-auto pt-5 border-t border-stone-100 flex items-center justify-between">
                       <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map((star) => (
                             <Star key={star} size={12} fill="#C5A059" className="text-[#C5A059]" />
                          ))}
                          <span className="text-[10px] font-bold text-stone-400 ml-2 mt-0.5">(5.0)</span>
                       </div>
                       
                       <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 group-hover:text-[#1a1a1a] transition-colors">
                          Học ngay
                          <span className="w-6 h-6 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                              <ArrowRight size={12} />
                          </span>
                       </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-dashed border-stone-300">
             <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-6">
                <BookOpen size={24} className="text-stone-400" />
             </div>
             <h3 className="font-serif text-2xl text-[#1a1a1a] mb-2">Chưa có khóa học nào</h3>
             <p className="text-stone-500 font-light">Dữ liệu đang được cập nhật, vui lòng quay lại sau.</p>
          </div>
        )}
      </div>
    </div>
  );
}