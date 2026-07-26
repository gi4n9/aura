"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, Sparkles, Folder } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    color?: string;
    children: {
        id: string;
        name: string;
        slug: string;
        _count: {
            courses: number;
        };
    }[];
}

const defaultGradients: Record<string, string> = {
    "kinh-doanh": "from-amber-500 to-orange-600",
    "lap-trinh": "from-blue-600 to-indigo-700",
    "ngoai-ngu": "from-emerald-500 to-teal-700",
    "thiet-ke": "from-purple-500 to-pink-600",
    "ai": "from-cyan-500 to-blue-600",
    "fullstack": "from-violet-600 to-purple-800"
};

const defaultIconsBySlug: Record<string, any> = {
    "ai": LucideIcons.Sparkles,
    "fullstack": LucideIcons.Code,
    "lap-trinh": LucideIcons.Terminal,
    "thiet-ke": LucideIcons.Palette,
    "kinh-doanh": LucideIcons.Briefcase,
    "ngoai-ngu": LucideIcons.Globe,
};

function toPascalCase(str: string): string {
    return str
        .split(/[-_]/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
}

function CategoryIcon({ iconName, slug }: { iconName: string | null; slug: string }) {
    if (defaultIconsBySlug[slug]) {
        const SlugIcon = defaultIconsBySlug[slug];
        return <SlugIcon size={28} />;
    }

    if (iconName) {
        const pascalName = toPascalCase(iconName.trim());
        const DynamicIcon = (LucideIcons as any)[pascalName] || (LucideIcons as any)[iconName];
        if (DynamicIcon) {
            return <DynamicIcon size={28} />;
        }
    }

    return <Folder size={28} />;
}

export default function CategoriesClient({ categories }: { categories: Category[] }) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCategories = categories.filter(cat => {
        const catName = t(`categoryData.${cat.slug}.name`, cat.name);
        const term = searchTerm.toLowerCase();
        return (
            catName.toLowerCase().includes(term) ||
            cat.name.toLowerCase().includes(term) ||
            cat.children.some(child => child.name.toLowerCase().includes(term))
        );
    });

    return (
        <div className={`min-h-screen pt-24 pb-20 transition-colors duration-500 ${
            isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
        }`}>

            {/* Hero Section */}
            <div className="container mx-auto px-4 mb-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 liquid-glass rounded-full mb-6">
                        <Sparkles size={16} className="text-[#C5A059]" />
                        <span className="text-xs font-bold tracking-widest uppercase text-[#C5A059]">
                            {t("categories.exploreTitle", "Khám phá tri thức")}
                        </span>
                    </div>

                    <h1 className={`text-4xl md:text-6xl font-serif font-bold mb-6 ${isDark ? "text-white" : "text-stone-900"}`}>
                        {t("categories.pageTitle", "Lĩnh vực & Chủ đề tại Aura")}
                    </h1>
                    <p className={`text-lg mb-8 max-w-2xl mx-auto font-light ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                        {t("categories.pageSubtitle", "Tìm kiếm lộ trình học tập phù hợp nhất với bạn trong kho tàng kiến thức đa dạng của chúng tôi.")}
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-xl mx-auto">
                        <input
                            type="text"
                            placeholder={t("categories.searchPlaceholder", "Tìm kiếm lĩnh vực, kỹ năng bạn muốn học...")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full px-6 py-4 pl-14 rounded-full shadow-lg outline-none focus:outline-none transition-all font-medium liquid-glass-strong ${
                                isDark
                                    ? "text-white placeholder-stone-500 focus:border-[#C5A059]"
                                    : "text-stone-800 placeholder-stone-400 focus:border-[#C5A059]"
                            }`}
                        />
                        <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${isDark ? "text-stone-500" : "text-stone-400"}`} size={24} />
                    </div>
                </motion.div>
            </div>

            {/* Categories Grid */}
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-8">
                    {filteredCategories.map((category, idx) => {
                        const gradient = defaultGradients[category.slug] || "from-[#C5A059] to-amber-600";
                        const categoryName = t(`categoryData.${category.slug}.name`, category.name);
                        const categoryDesc = t(`categoryData.${category.slug}.desc`, category.description || "");

                        return (
                            <motion.div
                                key={category.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="relative group"
                            >
                                {/* Card Container */}
                                <div className={`rounded-3xl p-8 transition-all duration-300 relative overflow-hidden group-hover:-translate-y-1 liquid-glass ${
                                    isDark ? "text-white" : "text-stone-900 shadow-md"
                                }`}>

                                    {/* Decorative Background Gradient */}
                                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity duration-500 group-hover:opacity-20`} />

                                    <div className="relative z-10 flex flex-col md:flex-row gap-8">
                                        {/* Left Side: Icon & Info */}
                                        <div className="md:w-1/3 flex flex-col items-start space-y-4">
                                            <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg flex items-center justify-center`}>
                                                <CategoryIcon iconName={category.icon} slug={category.slug} />
                                            </div>
                                            <div>
                                                <h2 className={`text-2xl font-bold mb-2 group-hover:text-[#C5A059] transition-colors ${
                                                    isDark ? "text-white" : "text-stone-800"
                                                }`}>
                                                    {categoryName}
                                                </h2>
                                                <p className={`leading-relaxed text-sm ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                                    {categoryDesc}
                                                </p>
                                            </div>

                                            <Link
                                                href={`/categories/${category.slug}`}
                                                className={`mt-auto inline-flex items-center gap-2 font-bold transition-colors group/link ${
                                                    isDark ? "text-stone-300 hover:text-[#C5A059]" : "text-stone-600 hover:text-[#C5A059]"
                                                }`}
                                            >
                                                {t("categories.viewAllCourses", "Xem tất cả khóa học")} <ArrowRight size={18} className="group-hover/link:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>

                                        {/* Right Side: Topics Grid */}
                                        <div className={`md:w-2/3 border-l md:pl-8 pt-4 md:pt-0 ${
                                            isDark ? "border-white/10" : "border-stone-200"
                                        }`}>
                                            <h3 className="text-sm font-bold text-[#C5A059] uppercase tracking-wider mb-4">
                                                {t("categories.featuredTopics", "Các chủ đề nổi bật")}
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {category.children.map((child) => (
                                                    <Link
                                                        key={child.id}
                                                        href={`/categories/${category.slug}/${child.slug}`}
                                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group/child ${
                                                            isDark
                                                                ? "border-white/10 bg-white/3 hover:bg-[#C5A059]/15 hover:border-[#C5A059]/40"
                                                                : "border-stone-200 bg-white/70 hover:bg-white hover:border-[#C5A059]/40 shadow-sm"
                                                        }`}
                                                    >
                                                        <span className={`font-medium text-sm ${isDark ? "text-stone-200 group-hover/child:text-white" : "text-stone-700 group-hover/child:text-stone-900"}`}>
                                                            {child.name}
                                                        </span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm ${
                                                            isDark ? "bg-white/10 text-stone-300 group-hover/child:text-[#C5A059]" : "bg-stone-100 text-stone-500 group-hover/child:text-[#C5A059]"
                                                        }`}>
                                                            {child._count.courses}
                                                        </span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {filteredCategories.length === 0 && (
                        <div className="text-center py-20">
                            <p className={`text-lg ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                {t("categories.notFound", "Không tìm thấy lĩnh vực phù hợp với từ khóa của bạn.")}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Decorative Bottom */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-20" />
        </div>
    );
}
