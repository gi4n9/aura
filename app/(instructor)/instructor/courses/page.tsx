import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, BookOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";


export default async function CoursesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/");
    }

    const { page: pageStr } = (await searchParams) || {};
    const currentPage = Math.max(1, parseInt(pageStr || "1", 10) || 1);
    const PAGE_SIZE = 8;

    const totalCourses = await prisma.course.count({
        where: {
            instructorId: user.id,
        },
    });

    const totalPages = Math.ceil(totalCourses / PAGE_SIZE) || 1;

    // 1. Lấy danh sách khóa học của giảng viên phân trang
    const courses = await prisma.course.findMany({
        where: {
            instructorId: user.id,
        },
        orderBy: {
            createdAt: "desc", // Mới nhất lên đầu
        },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Khóa học của tôi</h1>
                    <p className="text-slate-500 mt-1">
                        Quản lý và biên tập nội dung các khóa học
                    </p>
                </div>

                <Link href="/instructor/create-course">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-medium shadow-lg shadow-slate-200">
                        <PlusCircle size={18} />
                        Tạo khóa học
                    </button>
                </Link>
            </div>

            {/* --- EMPTY STATE --- */}
            {courses.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Chưa có khóa học nào</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">
                        Hãy bắt đầu chia sẻ kiến thức của bạn bằng cách tạo khóa học đầu tiên ngay hôm nay.
                    </p>
                    <Link href="/instructor/create-course">
                        <span className="text-indigo-600 font-medium hover:underline cursor-pointer">
                            Tạo khóa học mới &rarr;
                        </span>
                    </Link>
                </div>
            )}

            {/* --- COURSE GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.map((course) => (
                    <Link
                        key={course.id}
                        href={`/instructor/courses/${course.id}/settings`} // Link đến trang chi tiết bạn đã có
                        className="group block"
                    >
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300 h-full flex flex-col">

                            {/* IMAGE THUMBNAIL */}
                            <div className="aspect-video relative bg-slate-100 overflow-hidden">
                                {course.thumbnailUrl ? (
                                    <Image
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        width={300}
                                        height={200}
                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <BookOpen size={24} />
                                        <span className="text-xs mt-2 font-medium">No Image</span>
                                    </div>
                                )}

                                {/* Overlay Status Badge */}
                                <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-md ${course.status
                                        ? "bg-emerald-500/90 text-white"
                                        : "bg-slate-500/90 text-white"
                                        }`}>
                                        {course.status ? "PUBLISHED" : "DRAFT"}
                                    </span>
                                </div>
                            </div>

                            {/* CONTENT */}
                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-700 transition-colors">
                                    {course.title}
                                </h3>

                                <div className="mt-auto pt-4 flex items-center justify-between text-sm">
                                    {/* PRICE */}
                                    <div className="font-medium text-slate-900">
                                        {course.price
                                            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(course.price))
                                            : "Miễn phí"
                                        }
                                    </div>

                                    {/* EDIT ICON HINT */}
                                    <div className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                                        Chỉnh sửa &rarr;
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* --- PAGINATION CONTROLS --- */}
            {totalCourses > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-8 border-t border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">
                        Hiển thị <strong className="text-slate-800 font-bold">{(currentPage - 1) * PAGE_SIZE + 1}</strong> - <strong className="text-slate-800 font-bold">{Math.min(currentPage * PAGE_SIZE, totalCourses)}</strong> trên tổng số <strong className="text-slate-800 font-bold">{totalCourses}</strong> khóa học
                    </p>
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/instructor/courses?page=${Math.max(1, currentPage - 1)}`}
                            className={`px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs ${
                                currentPage === 1 ? "pointer-events-none opacity-40 cursor-not-allowed" : ""
                            }`}
                        >
                            Trước
                        </Link>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Link
                                key={p}
                                href={`/instructor/courses?page=${p}`}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition ${
                                    currentPage === p
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {p}
                            </Link>
                        ))}
                        <Link
                            href={`/instructor/courses?page=${Math.min(totalPages, currentPage + 1)}`}
                            className={`px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs ${
                                currentPage === totalPages ? "pointer-events-none opacity-40 cursor-not-allowed" : ""
                            }`}
                        >
                            Sau
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}