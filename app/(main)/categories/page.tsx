"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Code,
    Globe,
    Terminal,
    Database,
    Cpu,
    PenTool,
    Music,
    Camera,
    Briefcase,
    Search,
    ArrowRight,
    Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

// Mock Data (Simulating database result)
const CATEGORIES = [
    {
        id: "programming",
        name: "Lập trình & CNTT",
        slug: "lap-trinh",
        description: "Chinh phục thế giới công nghệ với các khóa học từ cơ bản đến chuyên sâu.",
        icon: <Terminal size={32} />,
        color: "from-blue-500 to-cyan-400",
        bgPattern: "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]", // Example pattern or none
        children: [
            { id: "backend", name: "Backend Development", count: 120 },
            { id: "frontend", name: "Frontend Development", count: 85 },
            { id: "mobile", name: "Mobile App", count: 40 },
            { id: "devops", name: "DevOps & Cloud", count: 32 },
            { id: "datascience", name: "Data Science", count: 55 },
        ]
    },
    {
        id: "languages",
        name: "Ngoại ngữ",
        slug: "ngoai-ngu",
        description: "Mở rộng cơ hội nghề nghiệp toàn cầu với Tiếng Anh, Nhật, Trung...",
        icon: <Globe size={32} />,
        color: "from-emerald-500 to-teal-400",
        children: [
            { id: "english", name: "Tiếng Anh Giao tiếp", count: 210 },
            { id: "toeic", name: "Luyện thi TOEIC", count: 95 },
            { id: "ielts", name: "IELTS Master", count: 70 },
            { id: "japanese", name: "Tiếng Nhật N3-N1", count: 45 },
            { id: "korean", name: "Tiếng Hàn", count: 30 },
        ]
    },
    {
        id: "design",
        name: "Thiết kế & Sáng tạo",
        slug: "thiet-ke",
        description: "Thỏa sức sáng tạo với UI/UX, Graphic Design và Video Editing.",
        icon: <PenTool size={32} />,
        color: "from-purple-500 to-pink-500",
        children: [
            { id: "uiux", name: "UI/UX Design", count: 65 },
            { id: "graphic", name: "Graphic Design", count: 110 },
            { id: "3d", name: "BS - 3D Modeling", count: 25 },
        ]
    },
    {
        id: "business",
        name: "Kinh doanh & Start-up",
        slug: "kinh-doanh",
        description: "Kiến thức thực chiến về Marketing, Quản trị và Khởi nghiệp.",
        icon: <Briefcase size={32} />,
        color: "from-amber-500 to-orange-400",
        children: [
            { id: "marketing", name: "Digital Marketing", count: 150 },
            { id: "startup", name: "Khởi nghiệp", count: 40 },
            { id: "finance", name: "Tài chính cá nhân", count: 60 },
        ]
    },
];

export default function CategoriesPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCategories = CATEGORIES.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.children.some(child => child.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-20">

            {/* Hero Section */}
            <div className="container mx-auto px-4 mb-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm mb-6">
                        <Sparkles size={16} className="text-[#C5A059]" />
                        <span className="text-xs font-bold tracking-widest uppercase text-stone-500">Khám phá tri thức</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-stone-900 mb-6">
                        Lĩnh vực & Chủ đề <span className="text-[#C5A059]">tại Aura</span>
                    </h1>
                    <p className="text-lg text-stone-500 mb-8 max-w-2xl mx-auto">
                        Tìm kiếm lộ trình học tập phù hợp nhất với bạn trong kho tàng kiến thức đa dạng của chúng tôi.
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-xl mx-auto">
                        <input
                            type="text"
                            placeholder="Tìm kiếm lĩnh vực, kỹ năng bạn muốn học..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-6 py-4 pl-14 bg-white rounded-full shadow-lg border-2 border-transparent focus:border-[#C5A059] focus:outline-none text-stone-700 placeholder-stone-400 transition-all font-medium"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400" size={24} />
                    </div>
                </motion.div>
            </div>

            {/* Categories Grid */}
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-8">
                    {filteredCategories.map((category, idx) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative group"
                        >
                            {/* Card Container */}
                            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group-hover:-translate-y-1">

                                {/* Decorative Background Gradient */}
                                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${category.color} opacity-10 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity duration-500 group-hover:opacity-20`} />

                                <div className="relative z-10 flex flex-col md:flex-row gap-8">
                                    {/* Left Side: Icon & Info */}
                                    <div className="md:w-1/3 flex flex-col items-start space-y-4">
                                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${category.color} text-white shadow-lg`}>
                                            {category.icon}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-stone-800 mb-2 group-hover:text-[#C5A059] transition-colors">
                                                {category.name}
                                            </h2>
                                            <p className="text-stone-500 leading-relaxed text-sm">
                                                {category.description}
                                            </p>
                                        </div>

                                        <Link
                                            href={`/categories/${category.slug}`}
                                            className="mt-auto inline-flex items-center gap-2 font-bold text-stone-600 hover:text-[#C5A059] transition-colors group/link"
                                        >
                                            Xem tất cả khóa học <ArrowRight size={18} className="group-hover/link:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>

                                    {/* Right Side: Topics Grid */}
                                    <div className="md:w-2/3 border-l border-stone-100 md:pl-8 pt-4 md:pt-0">
                                        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Các chủ đề nổi bật</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {category.children.map((child) => (
                                                <Link
                                                    key={child.id}
                                                    href={`/categories/${category.slug}/${child.id}`}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-[#C5A059]/10 border border-stone-100 hover:border-[#C5A059]/30 transition-all cursor-pointer group/child"
                                                >
                                                    <span className="font-medium text-stone-700 text-sm group-hover/child:text-stone-900">{child.name}</span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-stone-400 group-hover/child:text-[#C5A059] shadow-sm">
                                                        {child.count}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {filteredCategories.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-stone-400 text-lg">Không tìm thấy lĩnh vực phù hợp với từ khóa của bạn.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Decorative Bottom */}
            <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-20" />
        </div>
    );
}