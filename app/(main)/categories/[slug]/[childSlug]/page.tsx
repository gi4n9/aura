
import { getCategoryWithCoursesAction } from "@/app/actions/categories";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";

// Helper to format currency
const formatPrice = (price: any) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
}

export default async function ChildCategoryPage({ params }: { params: Promise<{ slug: string, childSlug: string }> }) {
    const { childSlug, slug: parentSlug } = await params;

    const category = await getCategoryWithCoursesAction(childSlug);

    if (!category) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-20">
            <div className="container mx-auto px-4">
                <Link href={`/categories/${parentSlug}`} className="inline-flex items-center text-stone-500 hover:text-[#C5A059] mb-8 transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> Quay lại {category.name}
                </Link>

                <div className="mb-12">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
                        {category.name}
                    </h1>
                    {category.description && (
                        <p className="text-stone-500 max-w-2xl">
                            {category.description}
                        </p>
                    )}
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {category.courses?.map((course) => (
                        <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full"
                        >
                            <div className="aspect-video relative bg-stone-200">
                                {course.thumbnailUrl ? (
                                    <Image
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                                        <BookOpen size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="font-bold text-stone-800 mb-2 line-clamp-2 group-hover:text-[#C5A059] transition-colors">
                                    {course.title}
                                </h3>
                                {/* Simple meta */}
                                <div className="flex items-center gap-4 text-xs text-stone-500 mb-4 mt-auto">
                                    <span className="flex items-center gap-1">
                                        <BookOpen size={14} /> {course.chapters.length} chương
                                    </span>
                                </div>
                                <div className="flex items-center justify-between font-medium">
                                    <span className="text-[#C5A059]">
                                        {Number(course.price) === 0 ? "Miễn phí" : formatPrice(course.price)}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {(!category.courses || category.courses.length === 0) && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
                        <p className="text-stone-400">Chưa có khóa học nào trong chủ đề này.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
