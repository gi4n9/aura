
import { getCategoryBySlug } from "@/services/categories/categories";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const category = await getCategoryBySlug(slug);

    if (!category) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-20">
            <div className="container mx-auto px-4">
                <Link href="/categories" className="inline-flex items-center text-stone-500 hover:text-[#C5A059] mb-8 transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> Quay lại danh mục
                </Link>

                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm mb-6">
                        <Sparkles size={16} className="text-[#C5A059]" />
                        <span className="text-xs font-bold tracking-widest uppercase text-stone-500">Danh mục</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4">
                        {category.name}
                    </h1>
                    {category.description && (
                        <p className="text-lg text-stone-500 max-w-2xl">
                            {category.description}
                        </p>
                    )}
                </div>

                {/* Children Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.children.map((child) => (
                        <Link
                            key={child.id}
                            href={`/categories/${category.slug}/${child.slug}`}
                            className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-[#C5A059]/50 transition-all group"
                        >
                            <h3 className="text-xl font-bold text-stone-800 mb-2 group-hover:text-[#C5A059] transition-colors">
                                {child.name}
                            </h3>
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-sm text-stone-500">
                                    {child._count.courses} khóa học
                                </span>
                                <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-[#C5A059] group-hover:text-white transition-colors">
                                    <ArrowLeft size={14} className="rotate-180" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                {category.children.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
                        <p className="text-stone-400">Chưa có chủ đề nào trong danh mục này.</p>
                    </div>
                )}
            </div>
        </div>
    )
}