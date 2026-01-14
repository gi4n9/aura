import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, User, Clock, ArrowRight } from "lucide-react"; // Cần cài: npm install lucide-react

export default async function FeaturedCourses() {
    // 1. Fetch dữ liệu (Giữ nguyên logic cũ)
    const rawCourses = await prisma.course.findMany({
        where: { status: "PUBLISHED" },
        take: 4,
        orderBy: { createdAt: "desc" },
        include: {
            instructor: true,
            organization: true,
            _count: { select: { chapters: true } }
        }
    });

    return (
        <section className="py-24 bg-[#F9F8F4] border-t border-stone-200">
            <div className="container mx-auto px-6">

                {/* Header Section - Style giống phần "Introduction" trong App.tsx */}
                <div className="mb-16 max-w-2xl">
                    <div className="inline-block mb-3 text-xs font-bold tracking-widest text-stone-500 uppercase">
                        Curriculum
                    </div>
                    <h2 className="font-serif text-4xl md:text-5xl mb-6 text-stone-900">
                        Featured Collections
                    </h2>
                    <div className="w-16 h-1 bg-[#C5A059] mb-6"></div> {/* Màu vàng Nobel Gold */}
                    <p className="text-lg text-stone-600 font-light leading-relaxed">
                        Explore our curated selection of quantum computing and engineering courses, designed to take you from theory to practice.
                    </p>
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {rawCourses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className="group flex flex-col bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:border-[#C5A059]/50 transition-all duration-500 hover:-translate-y-1"
                        >
                            {/* Image Container */}
                            <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                                <Image
                                    src={course.thumbnailUrl || "/placeholder-course.jpg"}
                                    alt={course.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105 saturate-50 group-hover:saturate-100" // Hiệu ứng chuyển từ nhạt sang đậm màu
                                />
                                {/* Badge Organization */}
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-stone-200 shadow-sm">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-stone-600">
                                        {course.organization?.name || "Free Content"}
                                    </span>
                                </div>
                            </div>

                            {/* Content Container */}
                            <div className="flex flex-col flex-grow p-6">
                                {/* Title */}
                                <h3 className="font-serif text-xl text-stone-900 leading-tight mb-3 group-hover:text-[#C5A059] transition-colors line-clamp-2">
                                    {course.title}
                                </h3>

                                {/* Divider */}
                                <div className="w-8 h-0.5 bg-stone-200 mb-4 group-hover:bg-[#C5A059] transition-colors"></div>

                                {/* Metadata */}
                                <div className="mt-auto space-y-4">

                                    {/* Instructor */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                                            <Image
                                                src={course.instructor?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                                alt="Avatar"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Instructor</span>
                                            <span className="text-sm font-medium text-stone-700 font-serif italic">
                                                {course.instructor?.fullName || "Alpha Team"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Footer Stats */}
                                    <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs text-stone-500 font-mono">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <BookOpen size={14} className="text-[#C5A059]" />
                                                <span>{course._count.chapters} Chapters</span>
                                            </div>
                                        </div>

                                        <div className="font-bold text-stone-900 text-sm">
                                            {Number(course.price) === 0
                                                ? "Free"
                                                : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(course.price))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* View All Button */}
                <div className="mt-16 text-center">
                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-stone-500 hover:text-[#C5A059] transition-colors group"
                    >
                        View All Curriculum
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

            </div>
        </section>
    );
}