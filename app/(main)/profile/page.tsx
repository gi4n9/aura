import ProfileForm from "@/app/components/profile/ProfileForm";
import LevelProgressCard from "@/app/components/profile/LevelProgressCard";
import ProfileCustomizer from "@/app/components/profile/ProfileCustomizer";
import PublicUserProfileView from "@/app/components/profile/PublicUserProfileView";
import { getUserGamificationData } from "@/app/actions/gamification-actions";
import { getPublicUserProfileData, incrementProfileViews } from "@/app/actions/user-profile";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Compass, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function StudentProfilePage({
    searchParams
}: {
    searchParams: Promise<{ userId?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    const resolvedParams = await searchParams;
    const targetUserId = resolvedParams?.userId || user.id;
    const isSelf = targetUserId === user.id;

    if (!isSelf) {
        // Increment profile view count for target user
        await incrementProfileViews(targetUserId);

        const publicData = await getPublicUserProfileData(targetUserId);
        const gamiData = await getUserGamificationData(targetUserId);

        if (!publicData) return redirect("/profile");

        return (
            <div className="container mx-auto px-4 sm:px-6 py-10 pt-[90px] max-w-5xl">
                <PublicUserProfileView
                    targetUser={{
                        id: publicData.profile.id,
                        fullName: publicData.profile.fullName,
                        email: publicData.profile.email,
                        avatarUrl: publicData.profile.avatarUrl,
                        bio: publicData.profile.bio,
                        learningGoal: publicData.profile.learningGoal,
                        viewsCount: publicData.profile.viewsCount,
                        createdAt: publicData.profile.createdAt,
                    }}
                    gamiData={gamiData}
                    reactionsCount={publicData.reactionsCount}
                    cheers={publicData.cheers}
                    currentUserId={user.id}
                    isDark={true}
                />
            </div>
        );
    }

    const dbUser = await prisma.profile.findUnique({
        where: { id: user.id },
    });

    if (!dbUser) return redirect("/profile");

    // Fetch gamification data for target user
    const gamiData = await getUserGamificationData(user.id);

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

    const isDark = true;

    return (
        <div className="container mx-auto px-4 sm:px-6 py-10 pt-[90px] max-w-6xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-white">
                        {isSelf ? "Hồ sơ & Gamification Aura" : `Trang cá nhân: ${dbUser.fullName || "Học viên Aura"}`}
                    </h1>
                    <p className="text-stone-400 mt-1">
                        {isSelf ? "Quản lý cấp độ, tiến độ học tập và tùy chỉnh giao diện cá nhân" : "Tổng quan cấp độ, thành tích và lộ trình học tập"}
                    </p>
                </div>
            </div>

            {/* GAMIFICATION LEVEL & STREAK HEADER */}
            {gamiData && (
                <LevelProgressCard
                    level={gamiData.levelProgress.currentLevel}
                    currentXp={gamiData.levelProgress.currentXp}
                    currentLevelXp={gamiData.levelProgress.currentLevelXp}
                    nextLevelXp={gamiData.levelProgress.nextLevelXp}
                    progressPercentage={gamiData.levelProgress.progressPercentage}
                    currentStreak={gamiData.stats.currentStreak}
                    longestStreak={gamiData.stats.longestStreak}
                    equippedTitle={gamiData.stats.equippedTitle}
                    isDark={isDark}
                />
            )}

            {/* PROFILE CUSTOMIZER (ONLY FOR SELF) */}
            {isSelf && gamiData && (
                <ProfileCustomizer
                    user={{
                        name: dbUser.fullName || user.email?.split('@')[0] || "Học viên Aura",
                        email: dbUser.email,
                        avatarUrl: dbUser.avatarUrl
                    }}
                    level={gamiData.levelProgress.currentLevel}
                    unlockedItems={gamiData.stats.unlockedItems}
                    equippedFrame={gamiData.stats.equippedFrame}
                    equippedBanner={gamiData.stats.equippedBanner}
                    equippedTitle={gamiData.stats.equippedTitle}
                    catalog={gamiData.catalog}
                    isDark={isDark}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Cột trái: Form thông tin cá nhân (nếu là chính mình) hoặc Thông tin học viên (nếu xem người khác) */}
                <div className="lg:col-span-2">
                    {isSelf ? (
                        <ProfileForm
                            initialData={{
                                id: dbUser.id,
                                email: dbUser.email,
                                name: dbUser.fullName,
                                avatarUrl: dbUser.avatarUrl,
                                role: dbUser.role
                            }}
                        />
                    ) : (
                        <div className="bg-[#0e0e0e] text-white rounded-3xl border border-white/10 p-6 space-y-6 shadow-xl">
                            <h2 className="text-xl font-serif font-bold text-[#C5A059]">Thông tin cá nhân</h2>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between py-3 border-b border-white/10">
                                    <span className="text-stone-400">Họ và tên</span>
                                    <span className="font-bold text-white">{dbUser.fullName || "Học viên Aura"}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-white/10">
                                    <span className="text-stone-400">Email công khai</span>
                                    <span className="font-medium text-stone-300">{dbUser.email}</span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-white/10">
                                    <span className="text-stone-400">Vai trò hệ thống</span>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40 uppercase">
                                        {dbUser.role || "STUDENT"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-3 border-b border-white/10">
                                    <span className="text-stone-400">Tham gia Aura</span>
                                    <span className="font-medium text-stone-300">
                                        {new Date(dbUser.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Cột phải: Tổng quan lộ trình & Sở thích */}
                <div className="space-y-6">
                    {/* Roadmap Summary */}
                    <div className="bg-[#0e0e0e] text-white rounded-3xl border border-white/10 p-6 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 p-4 opacity-5 text-[#C5A059] pointer-events-none">
                            <Compass size={120} />
                        </div>
                        
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Compass className="text-[#C5A059]" size={20} />
                            Tiến độ Lộ trình
                        </h2>
                        
                        {roadmap ? (
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-stone-400 font-medium">Hoàn thành</span>
                                        <span className="font-bold text-[#C5A059]">{roadmap.progressPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10">
                                        <div 
                                            className="bg-[#C5A059] h-3 rounded-full transition-all duration-1000" 
                                            style={{ width: `${roadmap.progressPercentage}%` }} 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-stone-300 bg-white/5 p-3 rounded-2xl border border-white/10">
                                    <BookOpen size={16} className="text-[#C5A059]" />
                                    <span>Tổng cộng <strong>{roadmap.totalCourses}</strong> khóa học</span>
                                </div>
                                
                                <Link 
                                    href="/roadmap"
                                    className="block w-full py-3 mt-2 text-center bg-[#C5A059] text-[#080808] font-bold rounded-2xl hover:bg-[#b59049] transition-all text-xs uppercase tracking-wider shadow-lg"
                                >
                                    Tiếp tục học
                                </Link>
                            </div>
                        ) : (
                            <div className="text-center py-4 relative z-10">
                                <p className="text-stone-400 text-sm mb-4">Bạn chưa thiết lập lộ trình học tập.</p>
                                <Link 
                                    href="/onboarding"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-[#C5A059] bg-[#C5A059]/10 border border-[#C5A059]/30 px-4 py-2.5 rounded-full hover:bg-[#C5A059]/20 transition-all uppercase tracking-wider"
                                >
                                    Thiết lập ngay <ArrowRight size={16} />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Lĩnh vực quan tâm (Interests) */}
                    <div className="bg-[#0e0e0e] text-white rounded-3xl border border-white/10 p-6 shadow-xl">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-400" size={20} />
                            Chuyên môn quan tâm
                        </h2>
                        
                        {categories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <span 
                                        key={cat.id} 
                                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-stone-300 text-sm font-medium rounded-xl flex items-center gap-2"
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
                            className="inline-block mt-6 text-xs font-bold text-[#C5A059] uppercase tracking-wider hover:underline"
                        >
                            + Chỉnh sửa lĩnh vực
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}