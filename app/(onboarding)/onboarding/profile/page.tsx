import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    User, BookOpen, Trophy, Clock, Target, Award,
    Mail, Calendar, TrendingUp, CheckCircle2, Star, Flame
} from "lucide-react";
import LevelProgressCard from "@/app/components/profile/LevelProgressCard";
import ProfileCustomizer from "@/app/components/profile/ProfileCustomizer";
import { getUserGamificationData } from "@/app/actions/gamification-actions";

export const metadata = {
    title: "Learning Profile | Aura Learning",
    description: "Xem hồ sơ học tập và thành tích của bạn.",
};

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch full profile
    const profile = await db.profile.findUnique({
        where: { id: user.id },
        select: {
            fullName: true,
            email: true,
            avatarUrl: true,
            interests: true,
            learningPath: true,
            createdAt: true,
        }
    });

    // Fetch gamification data
    const gamiData = await getUserGamificationData(user.id);

    // Fetch enrollment stats
    const enrollments = await db.enrollment.findMany({
        where: { userId: user.id },
        select: {
            progress: true,
            course: {
                select: {
                    title: true,
                    category: { select: { name: true } }
                }
            }
        }
    });

    // Fetch completed lessons count
    const completedLessons = await db.videoProgress.count({
        where: { userId: user.id, isCompleted: true }
    });

    // Fetch study schedule
    const schedule = await db.studySchedule.findFirst({
        where: { userId: user.id, isActive: true },
        include: {
            items: { where: { isCompleted: true } }
        }
    });

    const totalCups = (schedule?.items?.length || 0) * 3;
    const totalCourses = enrollments.length;
    const completedCourses = enrollments.filter(e => e.progress === 100).length;
    const learningPath = profile?.learningPath as any;
    const joinDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    // Categories learned
    const categories = [...new Set(enrollments.map(e => e.course.category?.name).filter(Boolean))];

    // Equipped cosmetic styles
    const equippedBannerId = gamiData?.stats?.equippedBanner || 'banner_default';
    const equippedFrameId = gamiData?.stats?.equippedFrame || 'frame_default';
    const equippedTitle = gamiData?.stats?.equippedTitle || 'Tân binh Aura';

    const bannerObj = gamiData?.catalog?.banners?.find(b => b.id === equippedBannerId) || gamiData?.catalog?.banners?.[0];
    const frameObj = gamiData?.catalog?.frames?.find(f => f.id === equippedFrameId) || gamiData?.catalog?.frames?.[0];
    const titleObj = gamiData?.catalog?.titles?.find(t => t.name === equippedTitle || t.id === equippedTitle) || gamiData?.catalog?.titles?.[0];

    return (
        <div className="pt-[80px] pb-12 space-y-8">
            {/* PROFILE HEADER WITH EQUIPPED COSMETICS */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-8">
                {/* Cover Background */}
                <div className={`h-36 w-full relative transition-all duration-500 ${bannerObj?.previewStyle || 'bg-gradient-to-r from-[#1a1a1a] via-stone-800 to-[#1a1a1a]'}`} />

                {/* Profile Info */}
                <div className="px-8 pb-8 relative -mt-14">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-7">
                            {/* Avatar with Frame */}
                            <div className={`w-28 h-28 rounded-full border-4 border-white bg-stone-100 overflow-hidden shadow-xl relative shrink-0 transition-all duration-300 ${frameObj?.previewStyle}`}>
                                {profile?.avatarUrl ? (
                                    <Image src={profile.avatarUrl} alt="Avatar" fill className="object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] text-[#C5A059] text-3xl font-bold font-serif">
                                        {(profile?.fullName?.[0] || "U").toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* User details */}
                            <div className="pb-1 pl-2">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-3xl font-serif font-bold text-stone-900">{profile?.fullName || "Người dùng"}</h1>
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#C5A059] text-white">
                                        Cấp {gamiData?.stats?.level || 1}
                                    </span>
                                    <span className={`text-xs px-2.5 py-0.5 rounded-md border border-stone-200 bg-stone-50 ${titleObj?.previewStyle || 'text-[#C5A059] font-semibold'}`}>
                                        {titleObj?.name || equippedTitle}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mt-2">
                                    <span className="flex items-center gap-1.5"><Mail size={15} /> {profile?.email}</span>
                                    <span className="flex items-center gap-1.5"><Calendar size={15} /> Tham gia {joinDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 pb-1">
                            <div className="flex items-center gap-2 bg-amber-50 text-[#C5A059] px-4 py-2 rounded-xl border border-amber-100 font-bold text-sm">
                                <Trophy size={18} /> {gamiData?.stats?.totalXp || 0} XP
                            </div>
                            <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-xl border border-orange-100 font-bold text-sm">
                                <Flame size={18} /> {gamiData?.stats?.currentStreak || 0} ngày Streak 🔥
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LEVEL & STREAK PROGRESS CARD */}
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
                    isDark={false}
                />
            )}

            {/* PROFILE CUSTOMIZER (AVATAR FRAMES, BANNERS, TITLES) */}
            {gamiData && (
                <ProfileCustomizer
                    user={{
                        name: profile?.fullName || user.email?.split('@')[0] || "Học viên Aura",
                        email: profile?.email || user.email || "",
                        avatarUrl: profile?.avatarUrl
                    }}
                    level={gamiData.levelProgress.currentLevel}
                    unlockedItems={gamiData.stats.unlockedItems}
                    equippedFrame={gamiData.stats.equippedFrame}
                    equippedBanner={gamiData.stats.equippedBanner}
                    equippedTitle={gamiData.stats.equippedTitle}
                    catalog={gamiData.catalog}
                    isDark={false}
                />
            )}

            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                        <BookOpen size={20} />
                    </div>
                    <div className="text-2xl font-bold text-stone-900">{totalCourses}</div>
                    <div className="text-xs text-stone-500 font-medium mt-1">Khóa học đã đăng ký</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-3">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="text-2xl font-bold text-stone-900">{completedCourses}</div>
                    <div className="text-xs text-stone-500 font-medium mt-1">Khóa học hoàn thành</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-10 h-10 bg-amber-50 text-[#C5A059] rounded-xl flex items-center justify-center mb-3">
                        <Trophy size={20} />
                    </div>
                    <div className="text-2xl font-bold text-stone-900">{totalCups}</div>
                    <div className="text-xs text-stone-500 font-medium mt-1">Cups tích lũy</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                        <Award size={20} />
                    </div>
                    <div className="text-2xl font-bold text-stone-900">{completedLessons}</div>
                    <div className="text-xs text-stone-500 font-medium mt-1">Bài học hoàn thành</div>
                </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Interests & Learning Path */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                    <h3 className="font-bold text-stone-800 text-lg mb-5 flex items-center gap-2">
                        <Target size={20} className="text-[#C5A059]" />
                        Lĩnh vực quan tâm
                    </h3>
                    <div className="flex flex-wrap gap-3 mb-6">
                        {(profile?.interests || []).map((interest: string) => (
                            <span key={interest} className="px-4 py-2 bg-stone-50 text-stone-700 rounded-xl text-sm font-medium border border-stone-100 hover:border-[#C5A059] transition-colors">
                                {interest}
                            </span>
                        ))}
                        {(!profile?.interests || profile.interests.length === 0) && (
                            <p className="text-stone-400 text-sm italic">Chưa thiết lập lĩnh vực quan tâm</p>
                        )}
                    </div>

                    {learningPath?.roadmapId && (
                        <div className="pt-5 border-t border-stone-100">
                            <h4 className="font-bold text-stone-700 text-sm mb-3 uppercase tracking-wider">Lộ trình hiện tại</h4>
                            <Link href="/onboarding/roadmap" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-amber-50 hover:border-[#C5A059] border border-stone-100 transition-all group">
                                <div className="w-10 h-10 bg-[#1a1a1a] text-[#C5A059] rounded-lg flex items-center justify-center">
                                    <TrendingUp size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-stone-800 group-hover:text-[#C5A059] transition-colors">{learningPath.roadmapId}</p>
                                    <p className="text-xs text-stone-400">Nhấn để xem chi tiết</p>
                                </div>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Enrolled Courses Summary */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                    <h3 className="font-bold text-stone-800 text-lg mb-5 flex items-center gap-2">
                        <BookOpen size={20} className="text-[#C5A059]" />
                        Khóa học đã tham gia
                    </h3>
                    {enrollments.length === 0 ? (
                        <div className="text-center py-8 text-stone-400">
                            <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Chưa tham gia khóa học nào</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {enrollments.slice(0, 5).map((e, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-colors">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${e.progress === 100 ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                                        {e.progress === 100 ? <CheckCircle2 size={16} /> : `${e.progress}%`}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-stone-800 text-sm truncate">{e.course.title}</p>
                                        <p className="text-xs text-stone-400">{e.course.category?.name || "Chung"}</p>
                                    </div>
                                    <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden flex-shrink-0">
                                        <div className="h-full bg-[#C5A059] rounded-full" style={{ width: `${e.progress}%` }} />
                                    </div>
                                </div>
                            ))}
                            {enrollments.length > 5 && (
                                <Link href="/onboarding/my-courses" className="block text-center text-sm text-[#C5A059] font-bold pt-3 hover:underline">
                                    Xem thêm {enrollments.length - 5} khóa học →
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Category Distribution */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                    <h3 className="font-bold text-stone-800 text-lg mb-5 flex items-center gap-2">
                        <Star size={20} className="text-[#C5A059]" />
                        Lĩnh vực đã học
                    </h3>
                    {categories.length === 0 ? (
                        <p className="text-stone-400 text-sm italic">Chưa có dữ liệu</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat, i) => (
                                <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-stone-50 to-amber-50 text-stone-700 rounded-lg text-sm font-medium border border-stone-100">
                                    {cat}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Achievement / Motivation */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-stone-800 rounded-2xl p-8 text-white flex flex-col justify-center items-center text-center">
                    <Trophy size={48} className="text-[#C5A059] mb-4" />
                    <h3 className="text-2xl font-serif font-bold mb-2">
                        {totalCups >= 100 ? "Học viên xuất sắc! 🌟" : totalCups >= 30 ? "Đang tiến bộ! 💪" : "Hãy bắt đầu! 🚀"}
                    </h3>
                    <p className="text-stone-400 text-sm max-w-xs">
                        {totalCups >= 100
                            ? "Bạn đã tích lũy hơn 100 cups. Một thành tích đáng ngưỡng mộ!"
                            : totalCups >= 30
                                ? "Bạn đang trên đà tiến bộ tuyệt vời. Tiếp tục phát huy nhé!"
                                : "Mỗi hành trình bắt đầu bằng một bước chân đầu tiên. Hãy học mỗi ngày!"}
                    </p>
                </div>
            </div>
        </div>
    );
}