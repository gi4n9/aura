import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Clock, Trophy, ArrowRight, Target, BookOpen, Sparkles, CheckCircle2 } from "lucide-react";

export const metadata = {
    title: "Test Practice | Aura Learning",
    description: "Luyện tập và kiểm tra kiến thức với các bài test thực hành.",
};

export default async function PracticePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch user's enrolled courses for practice suggestions
    const enrollments = await db.enrollment.findMany({
        where: { userId: user.id },
        include: {
            course: {
                select: {
                    id: true,
                    title: true,
                    thumbnailUrl: true,
                    category: { select: { name: true } },
                    chapters: {
                        select: {
                            title: true,
                            lessons: { select: { id: true, title: true } }
                        }
                    }
                }
            }
        },
        orderBy: { joinedAt: 'desc' },
        take: 6
    });

    // Mock practice categories (this would come from DB in production)
    const practiceCategories = [
        { id: "quiz", name: "Trắc nghiệm", icon: "📝", description: "Kiểm tra kiến thức nhanh", count: 0, color: "bg-blue-50 text-blue-600 border-blue-100" },
        { id: "coding", name: "Bài tập code", icon: "💻", description: "Luyện tập lập trình thực tế", count: 0, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
        { id: "flashcard", name: "Flashcard", icon: "🃏", description: "Ôn tập với thẻ ghi nhớ", count: 0, color: "bg-purple-50 text-purple-600 border-purple-100" },
        { id: "challenge", name: "Challenge", icon: "🏆", description: "Thử thách nâng cao", count: 0, color: "bg-amber-50 text-amber-600 border-amber-100" },
    ];

    return (
        <div className="pt-[80px] pb-12">
            {/* HEADER */}
            <div className="mb-10">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg">
                        <FileText size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900">Test Practice</h1>
                        <p className="text-stone-500">Luyện tập và kiểm tra kiến thức để củng cố kỹ năng</p>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <div className="text-3xl font-bold text-stone-900 mb-1">0</div>
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">Bài đã làm</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <div className="text-3xl font-bold text-[#C5A059] mb-1">0</div>
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">Điểm trung bình</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">0</div>
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">Streak ngày</div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">0</div>
                    <div className="text-xs text-stone-500 font-medium uppercase tracking-wider">Cups đạt được</div>
                </div>
            </div>

            {/* Practice Categories */}
            <div className="mb-10">
                <h2 className="font-serif font-bold text-xl text-stone-800 mb-5">Hình thức luyện tập</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {practiceCategories.map(cat => (
                        <div
                            key={cat.id}
                            className={`p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${cat.color}`}
                        >
                            <div className="text-3xl mb-3">{cat.icon}</div>
                            <h3 className="font-bold text-lg mb-1">{cat.name}</h3>
                            <p className="text-sm opacity-70 mb-3">{cat.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold opacity-50">{cat.count} bài</span>
                                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Course-based Practice */}
            <div className="">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-serif font-bold text-xl text-stone-800">Luyện tập theo khóa học</h2>
                </div>

                {enrollments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-12 text-center">
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                            <Sparkles size={32} />
                        </div>
                        <h3 className="font-bold text-lg text-stone-800 mb-2">Chưa có khóa học</h3>
                        <p className="text-stone-500 text-sm mb-6">Đăng ký khóa học để bắt đầu luyện tập</p>
                        <Link
                            href="/categories"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold hover:bg-stone-800 transition"
                        >
                            Khám phá khóa học
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrollments.map(enrollment => {
                            const totalLessons = enrollment.course.chapters.reduce((a, c) => a + c.lessons.length, 0);
                            return (
                                <div key={enrollment.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md hover:border-[#C5A059]/30 transition-all group">
                                    <div className="p-6">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 flex-shrink-0">
                                                <BookOpen size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-stone-800 line-clamp-2 group-hover:text-[#C5A059] transition-colors">{enrollment.course.title}</h4>
                                                <p className="text-xs text-stone-400 mt-0.5">{enrollment.course.category?.name || "Chung"} • {totalLessons} bài</p>
                                            </div>
                                        </div>

                                        {/* Chapters Preview */}
                                        <div className="space-y-2 mb-4">
                                            {enrollment.course.chapters.slice(0, 3).map((ch, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs text-stone-500">
                                                    <CheckCircle2 size={12} className="text-stone-300" />
                                                    <span className="truncate">{ch.title}</span>
                                                    <span className="ml-auto text-stone-300 flex-shrink-0">{ch.lessons.length} bài</span>
                                                </div>
                                            ))}
                                            {enrollment.course.chapters.length > 3 && (
                                                <p className="text-xs text-stone-400 pl-5">+{enrollment.course.chapters.length - 3} chương khác</p>
                                            )}
                                        </div>

                                        {/* Action */}
                                        <button className="w-full py-2.5 bg-stone-50 hover:bg-[#C5A059] hover:text-white text-stone-600 rounded-xl font-bold text-sm transition-all">
                                            Bắt đầu luyện tập
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}