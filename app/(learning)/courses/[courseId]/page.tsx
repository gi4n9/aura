import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Clock, CheckCircle, PlayCircle, Star, Users } from "lucide-react";
import CourseSidebar from "@/app/components/CourseSidebar";
import VideoPlayer from "@/app/components/VideoPlayer";


// Định nghĩa params cho Next.js 15+ (Promise)
interface PageProps {
    params: Promise<{ courseId: string }>;
    searchParams: Promise<{ videoId?: string }>;
}

export default async function CoursePage({ params, searchParams }: PageProps) {
    const { courseId } = await params;
    const { videoId } = await searchParams; // Lấy videoId từ URL (?videoId=...)

    // 1. Fetch dữ liệu khóa học
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            instructor: true,
            organization: true,
            chapters: {
                orderBy: { position: "asc" },
                include: {
                    lessons: { orderBy: { position: "asc" } },
                },
            },
        },
    });

    if (!course) return notFound();

    // Tìm bài học đầu tiên (để nút "Bắt đầu học" biết trỏ đi đâu)
    const firstLesson = course.chapters[0]?.lessons[0];

    // Xác định bài học đang active (nếu có videoId trên URL)
    let activeLesson = null;
    if (videoId) {
        // Tìm trong toàn bộ các chương xem bài nào có videoId trùng khớp
        for (const chapter of course.chapters) {
            const found = chapter.lessons.find(l => l.youtubeVideoId === videoId);
            if (found) {
                activeLesson = found;
                break;
            }
        }
    }

    // --- TRƯỜNG HỢP 1: CHẾ ĐỘ HỌC (VIEWING MODE) ---
    // Nếu có activeLesson -> Hiển thị Player + Sidebar
    if (activeLesson) {
        return (
            <div className="min-h-screen bg-[#F9F8F4] pb-20 pt-6">
                <div className="container mx-auto px-4 lg:px-6">

                    {/* Breadcrumb nhỏ */}
                    <div className="mb-6 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-stone-400">
                        <Link href="/courses" className="hover:text-[#C5A059]">Courses</Link>
                        <span>/</span>
                        <Link href={`/courses/${courseId}`} className="hover:text-[#C5A059] line-clamp-1">{course.title}</Link>
                        <span>/</span>
                        <span className="text-[#C5A059]">Learning</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* CỘT TRÁI: VIDEO PLAYER */}
                        <div className="lg:col-span-8">
                            <VideoPlayer
                                videoId={activeLesson.youtubeVideoId || ""}
                                title={activeLesson.title}
                                description={activeLesson.transcript || "Chưa có mô tả cho bài học này."}
                            />
                        </div>

                        {/* CỘT PHẢI: SIDEBAR */}
                        <div className="lg:col-span-4">
                            <div className="sticky top-6">
                                <CourseSidebar
                                    courseId={course.id}
                                    chapters={course.chapters} // Truyền toàn bộ cấu trúc chapters
                                    currentVideoId={activeLesson.youtubeVideoId || ""}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- TRƯỜNG HỢP 2: CHẾ ĐỘ TỔNG QUAN (OVERVIEW MODE) ---
    // Nếu KHÔNG có videoId -> Hiển thị trang giới thiệu (Theme AlphaQubit)
    return (
        <div className="min-h-screen bg-[#F9F8F4] text-stone-900 pb-20">

            {/* Hero Section */}
            <div className="bg-white border-b border-stone-200 pt-24 pb-16">
                <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold tracking-widest uppercase rounded-full mb-6 border border-stone-200">
                            {course.organization?.name || "Professional Course"}
                        </div>
                        <h1 className="font-serif text-4xl md:text-6xl text-stone-900 mb-6 leading-tight">
                            {course.title}
                        </h1>
                        <p className="text-xl text-stone-600 font-light leading-relaxed mb-8">
                            {course.description || "Khóa học chuyên sâu giúp bạn làm chủ kiến thức từ cơ bản đến nâng cao."}
                        </p>

                        {/* Metadata Authors */}
                        <div className="flex items-center gap-6 pt-6 border-t border-stone-100">
                            <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-stone-200">
                                    <Image
                                        src={course.instructor?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                        alt="Instructor" fill className="object-cover"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Instructor</div>
                                    <div className="font-serif text-base font-medium">{course.instructor?.fullName}</div>
                                </div>
                            </div>

                            <div className="h-8 w-[1px] bg-stone-200"></div>

                            <div className="flex items-center gap-2">
                                <div className="flex text-[#C5A059]">
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                    <Star size={16} fill="currentColor" />
                                </div>
                                <span className="text-sm font-bold text-stone-600">(4.9)</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Card Bên Phải */}
                    <div className="lg:col-span-5">
                        <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-xl">
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-stone-900 mb-4 group cursor-pointer">
                                <Image
                                    src={course.thumbnailUrl || "/placeholder-course.jpg"}
                                    alt="Thumbnail" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                                />
                                {/* Nút Play to đùng */}
                                {firstLesson && (
                                    <Link
                                        href={`/courses/${course.id}?videoId=${firstLesson.youtubeVideoId}`}
                                        className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
                                    >
                                        <div className="w-16 h-16 bg-[#C5A059] rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                            <PlayCircle size={32} className="text-white fill-white" />
                                        </div>
                                    </Link>
                                )}
                            </div>

                            <div className="px-4 pb-4">
                                <div className="text-3xl font-serif text-stone-900 mb-2 text-center">
                                    {Number(course.price) === 0 ? "Miễn phí" : new Intl.NumberFormat("vi-VN").format(Number(course.price)) + " đ"}
                                </div>

                                {firstLesson ? (
                                    <Link
                                        href={`/courses/${course.id}?videoId=${firstLesson.youtubeVideoId}`}
                                        className="block w-full py-4 bg-[#1a1a1a] text-white text-center font-bold tracking-widest uppercase text-sm rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg"
                                    >
                                        Vào học ngay
                                    </Link>
                                ) : (
                                    <button disabled className="block w-full py-4 bg-stone-300 text-white font-bold tracking-widest uppercase text-sm rounded-lg cursor-not-allowed">
                                        Chưa có bài học
                                    </button>
                                )}

                                <p className="text-center text-xs text-stone-400 mt-3 font-serif italic">
                                    Truy cập trọn đời • Hoàn tiền trong 30 ngày
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nội dung chi tiết (Syllabus) */}
            <div className="container mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8">
                    <div className="mb-8 flex items-end gap-4">
                        <h2 className="font-serif text-3xl text-stone-900">Nội dung khóa học</h2>
                        <div className="flex-1 h-[1px] bg-stone-200 mb-2"></div>
                    </div>

                    {/* Chapter List */}
                    <div className="space-y-6">
                        {course.chapters.map((chapter) => (
                            <div key={chapter.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-6 py-4 bg-[#F9F8F4] border-b border-stone-200 flex justify-between items-center">
                                    <h3 className="font-serif text-lg font-bold text-stone-800">{chapter.title}</h3>
                                    <span className="text-[10px] font-bold tracking-widest text-stone-500 uppercase bg-white border border-stone-200 px-2 py-1 rounded">
                                        {chapter.lessons.length} Bài
                                    </span>
                                </div>
                                <div className="divide-y divide-stone-100">
                                    {chapter.lessons.map((lesson) => (
                                        <Link
                                            key={lesson.id}
                                            href={`/courses/${course.id}?videoId=${lesson.youtubeVideoId}`}
                                            className="px-6 py-4 flex items-center justify-between group hover:bg-stone-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-stone-100 text-[#C5A059] flex items-center justify-center border border-stone-200 group-hover:border-[#C5A059] transition-colors">
                                                    <PlayCircle size={16} />
                                                </div>
                                                <span className="text-stone-600 font-medium group-hover:text-stone-900 transition-colors">
                                                    {lesson.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                {/* Duration mockup */}
                                                <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {lesson.duration ? Math.floor(lesson.duration / 60) + "p" : "--"}
                                                </span>
                                                {/* Nút xem thử */}
                                                <span className="text-xs font-bold text-[#C5A059] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                                                    Học ngay
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar Info (Feature List) */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Box 1: Features */}
                    <div className="bg-white p-6 rounded-xl border border-stone-200">
                        <h3 className="font-serif text-lg font-bold mb-4">Khóa học này bao gồm:</h3>
                        <ul className="space-y-4 text-sm text-stone-600">
                            <li className="flex items-center gap-3">
                                <BookOpen size={18} className="text-[#C5A059]" />
                                <span>{course.chapters.length} chương chuyên sâu</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <PlayCircle size={18} className="text-[#C5A059]" />
                                <span>Video chất lượng Full HD</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle size={18} className="text-[#C5A059]" />
                                <span>Truy cập trên Mobile và TV</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Users size={18} className="text-[#C5A059]" />
                                <span>Cộng đồng học tập riêng</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}