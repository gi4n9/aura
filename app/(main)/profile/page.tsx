import ProfileForm from "@/app/components/profile/ProfileForm";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Compass, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function StudentProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Fetch data từ DB của bạn
    const dbUser = await prisma.profile.findUnique({
        where: { id: user.id }, // Hoặc email tùy schema
    });

    if (!dbUser) return redirect("/");

    // Fetch full category details for user's interests
    const interests = dbUser.interests || [];
    const categories = interests.length > 0 ? await prisma.category.findMany({
        where: { slug: { in: interests } },
        select: { id: true, name: true, slug: true, icon: true }
    }) : [];

    // Fetch roadmap summary
    const roadmap = await prisma.userRoadmap.findUnique({
        where: { userId: user.id },
        select: { progressPercentage: true, totalCourses: true, createdAt: true }
    });

    return (
        <div className="container mx-auto px-6 py-10 pt-[80px]">
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-stone-900">Hồ sơ học tập</h1>
                <p className="text-stone-500">Quản lý thông tin cá nhân và tiến độ của bạn</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Cột trái: Form thông tin cá nhân */}
                <div className="lg:col-span-2">
                    <ProfileForm
                        initialData={{
                            id: dbUser.id,
                            email: dbUser.email,
                            name: dbUser.fullName,
                            avatarUrl: dbUser.avatarUrl,
                            role: dbUser.role
                        }}
                    />
                </div>

                {/* Cột phải: Tổng quan lộ trình & Sở thích */}
                <div className="space-y-6">
                    {/* Roadmap Summary */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-900 pointer-events-none">
                            <Compass size={120} />
                        </div>
                        
                        <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                            <Compass className="text-indigo-600" size={20} />
                            Tiến độ Lộ trình
                        </h2>
                        
                        {roadmap ? (
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-stone-500 font-medium">Hoàn thành</span>
                                        <span className="font-bold text-indigo-600">{roadmap.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200">
                                        <div 
                                            className="bg-indigo-600 h-3 rounded-full transition-all duration-1000" 
                                            style={{ width: `${roadmap.progressPercentage}%` }} 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-stone-600 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                    <BookOpen size={16} className="text-indigo-500" />
                                    <span>Tổng cộng <strong>{roadmap.totalCourses}</strong> khóa học</span>
                                </div>
                                
                                <Link 
                                    href="/roadmap"
                                    className="block w-full py-2.5 mt-2 text-center bg-stone-900 text-white font-semibold rounded-lg hover:bg-stone-800 transition-colors text-sm"
                                >
                                    Tiếp tục học
                                </Link>
                            </div>
                        ) : (
                            <div className="text-center py-4 relative z-10">
                                <p className="text-stone-500 text-sm mb-4">Bạn chưa thiết lập lộ trình học tập.</p>
                                <Link 
                                    href="/onboarding"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                    Thiết lập ngay <ArrowRight size={16} />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Lĩnh vực quan tâm (Interests) */}
                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-600" size={20} />
                            Chuyên môn quan tâm
                        </h2>
                        
                        {categories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <span 
                                        key={cat.id} 
                                        className="px-3 py-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-sm font-medium rounded-lg flex items-center gap-2"
                                    >
                                        {cat.name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-stone-500 italic">Chưa chọn lĩnh vực nào.</p>
                        )}
                        
                        <Link 
                            href="/onboarding"
                            className="inline-block mt-6 text-sm text-indigo-600 font-semibold hover:underline"
                        >
                            + Chỉnh sửa lĩnh vực
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}