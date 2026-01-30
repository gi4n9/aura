import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { BookOpen, Clock, PlayCircle, Award, Sparkles } from "lucide-react";

export const metadata = {
    title: "Khóa học của tôi | Aura Learning",
    description: "Quản lý tiến độ học tập và các khóa học đã đăng ký của bạn.",
};

export default async function MyCoursesPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login?next=/my-courses");
    }

    // Fetch enrollments (paid or free)
    const enrollments = await prisma.enrollment.findMany({
        where: {
            userId: user.id,
        },
        include: {
            course: {
                include: {
                    instructor: {
                        select: {
                            fullName: true,
                            avatarUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            chapters: true,
                        },
                    },
                    // We might want to count total lessons to calculate real progress if needed
                    // but Enrollment has a 'progress' field which implies it's cached/updated.
                    chapters: {
                        include: {
                            lessons: {
                                select: { id: true, duration: true }
                            }
                        }
                    }
                },
            },
        },
        orderBy: {
            joinedAt: "desc",
        },
    });

    // Calculate total duration roughly or use lesson count
    const myCourses = enrollments.map((enrollment) => {
        const totalLessons = enrollment.course.chapters.reduce(
            (acc, chap) => acc + chap.lessons.length,
            0
        );

        // Estimate total hours (if duration is in seconds)
        const totalSeconds = enrollment.course.chapters.reduce(
            (acc, chap) => acc + chap.lessons.reduce((lAcc, l) => lAcc + (l.duration || 0), 0),
            0
        );

        return {
            ...enrollment,
            totalLessons,
            totalHours: Math.round(totalSeconds / 3600), // hours
        };
    });

    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-28 pb-20">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* HEADER */}
                <div className="mb-12">
                    <h1 className="text-4xl font-serif font-bold text-stone-900 mb-4 flex items-center gap-3">
                        <BookOpen className="text-[#C5A059]" strokeWidth={2.5} size={40} />
                        Khóa học của tôi
                    </h1>
                    <p className="text-stone-500 text-lg max-w-2xl">
                        Chào mừng trở lại! Hãy tiếp tục hành trình chinh phục tri thức của bạn.
                    </p>
                </div>

                {/* STATS SUMMARY (Optional decoration) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-stone-800">{enrollments.length}</h3>
                            <p className="text-sm text-stone-500 font-medium">Khóa học đã tham gia</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-stone-800">
                                {myCourses.reduce((acc, c) => acc + c.totalHours, 0)}h
                            </h3>
                            <p className="text-sm text-stone-500 font-medium">Thời gian học tập</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                            <Award size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-stone-800">
                                {finishCount(enrollments)}
                            </h3>
                            <p className="text-sm text-stone-500 font-medium">Chứng chỉ đạt được</p>
                        </div>
                    </div>
                </div>

                {/* COURSES GRID */}
                {enrollments.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
                        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-400">
                            <Sparkles size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-stone-800 mb-2">Bạn chưa đăng ký khóa học nào</h3>
                        <p className="text-stone-500 max-w-md mx-auto mb-8">
                            Khám phá hàng trăm khóa học hấp dẫn để bắt đầu hành trình học tập ngay hôm nay.
                        </p>
                        <Link
                            href="/categories"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-[#C5A059] text-white font-bold rounded-xl hover:bg-[#b08d4b] transition shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                            Khám phá ngay
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {myCourses.map((item) => (
                            <div
                                key={item.id}
                                className="group bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:border-[#C5A059]/30 transition-all duration-300 flex flex-col h-full"
                            >
                                {/* Thumbnail */}
                                <div className="aspect-video relative bg-stone-100 overflow-hidden">
                                    <Link href={`/courses/${item.course.id}`}>
                                        {item.course.thumbnailUrl ? (
                                            <Image
                                                src={item.course.thumbnailUrl}
                                                alt={item.course.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                <BookOpen size={32} />
                                            </div>
                                        )}
                                        {/* Overlay Play Button */}
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#C5A059] shadow-lg transform scale-50 group-hover:scale-100 transition-all">
                                                <PlayCircle size={24} fill="currentColor" className="text-white" />
                                            </div>
                                        </div>
                                    </Link>
                                </div>

                                {/* Content */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-stone-800 line-clamp-2 mb-2 group-hover:text-[#C5A059] transition-colors">
                                            <Link href={`/courses/${item.course.id}`}>
                                                {item.course.title}
                                            </Link>
                                        </h3>
                                        <p className="text-sm text-stone-500 mb-4 line-clamp-1">
                                            Giảng viên: <span className="font-medium text-stone-700">{item.course.instructor.fullName || "Aura Instructor"}</span>
                                        </p>
                                    </div>

                                    {/* Progress Section */}
                                    <div className="mt-4 pt-4 border-t border-stone-100">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tiến độ</span>
                                            <span className="text-sm font-bold text-[#C5A059]">{item.progress}%</span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#C5A059] to-[#E6C985] rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between items-center mt-4">
                                            <span className="text-xs text-stone-400 font-medium bg-stone-50 px-2 py-1 rounded">
                                                {item.totalLessons} bài học
                                            </span>

                                            <Link
                                                href={`/courses/${item.course.id}`} // Or direct to /courses/[id]/learn if exists
                                                className="text-sm font-bold text-stone-800 hover:text-[#C5A059] flex items-center gap-1 transition-colors"
                                            >
                                                {item.progress > 0 ? "Tiếp tục học" : "Bắt đầu học"} &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function finishCount(enrollments: any[]) {
    return enrollments.filter(e => e.progress === 100).length;
}
