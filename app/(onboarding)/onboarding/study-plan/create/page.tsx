"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getRoadmapCoursesForStudyPlan } from "@/app/actions/study-plan";
import { enrollAndCreateStudyPlan } from "@/app/actions/onboarding";
import { purchaseBundle } from "@/app/actions/enrollment";
import { Calendar, Clock, CheckCircle2, ChevronRight, Loader2, CalendarCheck, Flag, Sparkles } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// Types
type EnrolledCourse = {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    category: { name: string } | null;
    totalDuration: number; // seconds
    price: number;
    isFree: boolean;
    isOwned: boolean;
};

export default function CreatePlanPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [courses, setCourses] = useState<EnrolledCourse[]>([]);
    const [roadmapId, setRoadmapId] = useState<string | null>(null);

    // Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paidCoursesToBuy, setPaidCoursesToBuy] = useState<EnrolledCourse[]>([]);

    // Form State
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [planName, setPlanName] = useState("Kế hoạch học tập mới");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyMinutes, setDailyMinutes] = useState(45);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Default Mon,Wed,Fri

    useEffect(() => {
        // Fetch roadmap courses on mount
        getRoadmapCoursesForStudyPlan().then(res => {
            if (res.success && res.data) {
                const mapped = res.data.map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    thumbnailUrl: c.thumbnailUrl,
                    category: c.category,
                    totalDuration: c.totalDuration || 0,
                    price: c.price,
                    isFree: c.isFree,
                    isOwned: c.isOwned
                }));
                setCourses(mapped);
                setRoadmapId(res.roadmapId || null);
                // Auto-select all courses from roadmap
                setSelectedCourses(mapped.map((c: any) => c.id));
            }
        });
    }, []);

    // LOGIC: Calculate Estimated End Date
    const estimatedInfo = useMemo(() => {
        if (selectedCourses.length === 0 || selectedDays.length === 0) return null;

        const totalSeconds = courses
            .filter(c => selectedCourses.includes(c.id))
            .reduce((acc, c) => acc + c.totalDuration, 0);

        const totalMinutes = Math.ceil(totalSeconds / 60);
        const sessionsNeeded = Math.ceil(totalMinutes / dailyMinutes);
        if (sessionsNeeded === 0) return { date: new Date(startDate), sessions: 0 };

        let sessionsCount = 0;
        let iteratorDate = new Date(startDate);
        let safety = 0;

        while (sessionsCount < sessionsNeeded && safety < 3000) {
            const day = iteratorDate.getDay();
            if (selectedDays.includes(day)) {
                sessionsCount++;
            }
            if (sessionsCount < sessionsNeeded) {
                iteratorDate.setDate(iteratorDate.getDate() + 1);
            }
            safety++;
        }

        return {
            date: iteratorDate,
            sessions: sessionsNeeded,
            totalHours: Math.ceil(totalMinutes / 60)
        };
    }, [selectedCourses, selectedDays, startDate, dailyMinutes, courses]);

    const toggleCourse = (id: string) => {
        if (selectedCourses.includes(id)) {
            setSelectedCourses(prev => prev.filter(c => c !== id));
        } else {
            setSelectedCourses(prev => [...prev, id]);
        }
    };

    const toggleDay = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(prev => prev.filter(d => d !== dayIndex));
        } else {
            setSelectedDays(prev => [...prev, dayIndex]);
        }
    };

    const handleCreate = async () => {
        if (selectedCourses.length === 0) return alert("Vui lòng chọn ít nhất 1 khóa học!");
        if (!roadmapId) return alert("Không tìm thấy dữ liệu lộ trình.");

        const selectedPaidCourses = courses.filter(
            c => selectedCourses.includes(c.id) && !c.isFree && !c.isOwned
        );

        if (selectedPaidCourses.length > 0) {
            setPaidCoursesToBuy(selectedPaidCourses);
            setShowPaymentModal(true);
            return;
        }

        await proceedWithFreeOrOwnedOnly();
    };

    const proceedWithFreeOrOwnedOnly = async (ignorePaid = false) => {
        setLoading(true);
        setShowPaymentModal(false);

        let finalCourseIds = selectedCourses;
        if (ignorePaid) {
            finalCourseIds = selectedCourses.filter(id => {
                const c = courses.find(course => course.id === id);
                return c && (c.isFree || c.isOwned);
            });

            if (finalCourseIds.length === 0) {
                alert("Bạn không còn khóa học nào để lên lịch.");
                setLoading(false);
                return;
            }
        }

        const res = await enrollAndCreateStudyPlan({
            roadmapId: roadmapId!,
            courseIds: finalCourseIds,
            daysOfWeek: selectedDays,
            dailyMinutes: dailyMinutes,
            startDate: new Date(startDate)
        });

        if (res.success) {
            router.push("/onboarding");
        } else {
            alert("Có lỗi xảy ra: " + (res.error || "Unknown"));
            setLoading(false);
        }
    };

    const handleCheckoutBundle = async () => {
        setLoading(true);
        const res = await purchaseBundle({
            paidCourseIds: paidCoursesToBuy.map(c => c.id),
            studyPlanConfig: {
                roadmapId: roadmapId!,
                courseIds: selectedCourses,
                daysOfWeek: selectedDays,
                dailyMinutes: dailyMinutes,
                startDate: new Date(startDate)
            }
        });
        if (res.success && res.redirectUrl) {
            router.push(res.redirectUrl);
        } else {
            alert("Lỗi thanh toán: " + (res.error || "Vui lòng thử lại"));
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen py-8 max-w-4xl mx-auto px-4 font-sans transition-colors duration-500 ${
            isDark ? "bg-[#080808] text-white" : "bg-[#F4F3EE] text-stone-900"
        }`}>
            {/* Header */}
            <div className="mb-8">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-[#C5A059] border border-[#C5A059]/30 bg-[#C5A059]/10 mb-3">
                    <Sparkles size={14} /> Aura Pathfinder
                </span>
                <h1 className={`text-3xl sm:text-4xl font-serif font-bold mb-2 ${isDark ? "text-white" : "text-stone-900"}`}>
                    Tạo Lộ Trình Học Tập 🎯
                </h1>
                <p className={`${isDark ? "text-stone-400" : "text-stone-600"}`}>
                    Aura sẽ giúp bạn sắp xếp thời gian hợp lý để hoàn thành mục tiêu.
                </p>
            </div>

            {/* PROGRESS STEPS */}
            <div className="flex items-center gap-4 mb-8 text-xs font-bold uppercase tracking-wider">
                <span className={step >= 1 ? "text-[#C5A059]" : isDark ? "text-stone-500" : "text-stone-400"}>1. Chọn khóa học</span>
                <ChevronRight size={16} className="text-stone-500" />
                <span className={step >= 2 ? "text-[#C5A059]" : isDark ? "text-stone-500" : "text-stone-400"}>2. Thiết lập thời gian</span>
            </div>

            {step === 1 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-serif font-bold">Bạn muốn học những khóa nào?</h2>

                    {courses.length === 0 ? (
                        <div className={`p-8 rounded-3xl border border-dashed text-center ${
                            isDark ? "border-white/10 text-stone-400 bg-[#0e0e0e]" : "border-stone-300 text-stone-500 bg-white"
                        }`}>
                            Không tìm thấy khóa học nào trong lộ trình của bạn. Hãy thiết lập lại lộ trình nhé!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map(course => (
                                <div
                                    key={course.id}
                                    onClick={() => toggleCourse(course.id)}
                                    className={`p-5 rounded-3xl transition-all duration-300 cursor-pointer flex items-start gap-4 border ${
                                        selectedCourses.includes(course.id)
                                            ? "border-2 border-[#C5A059] bg-[#C5A059]/10 shadow-lg shadow-[#C5A059]/10"
                                            : isDark
                                            ? "bg-[#0e0e0e] border-white/10 text-white hover:border-white/30"
                                            : "bg-white border-stone-200 text-stone-900 shadow-sm hover:border-stone-300"
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                                        selectedCourses.includes(course.id)
                                            ? "border-[#C5A059] bg-[#C5A059]"
                                            : "border-stone-400"
                                    }`}>
                                        {selectedCourses.includes(course.id) && <CheckCircle2 size={14} className="text-[#080808]" />}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-base mb-1">{course.title}</h4>
                                        <p className={`text-xs ${isDark ? "text-stone-400" : "text-stone-500"}`}>{course.category?.name || "Chung"}</p>
                                        <div className="mt-3">
                                            {course.isOwned ? (
                                                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                    Đã sở hữu
                                                </span>
                                            ) : course.isFree ? (
                                                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                                    Miễn phí
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold bg-amber-500/20 text-[#C5A059] px-2.5 py-1 rounded-md tracking-wider">
                                                    {course.price.toLocaleString("vi-VN")} đ
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            disabled={selectedCourses.length === 0}
                            onClick={() => setStep(2)}
                            className={`px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl ${
                                selectedCourses.length > 0
                                    ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176] shadow-[0_0_20px_rgba(197,160,89,0.3)] cursor-pointer hover:scale-105"
                                    : "bg-stone-500/20 text-stone-500 cursor-not-allowed"
                            }`}
                        >
                            <span>Tiếp tục</span>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8">
                    {/* Plan Name */}
                    <div className={`p-6 rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-sm"}`}>
                        <label className="block text-sm font-bold mb-2">Tên kế hoạch</label>
                        <input
                            type="text"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            className={`w-full p-3.5 rounded-2xl border transition-all ${
                                isDark
                                    ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]"
                                    : "bg-white border-stone-200 text-stone-900 focus:border-[#C5A059]"
                            }`}
                        />
                    </div>

                    {/* Start Date & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-sm"}`}>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                                <Calendar size={16} className="text-[#C5A059]" /> Ngày bắt đầu
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`w-full p-3.5 rounded-2xl border transition-all ${
                                    isDark
                                        ? "bg-white/5 border-white/10 text-white focus:border-[#C5A059]"
                                        : "bg-white border-stone-200 text-stone-900 focus:border-[#C5A059]"
                                }`}
                            />
                        </div>
                        <div className={`p-6 rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-sm"}`}>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                                <Clock size={16} className="text-[#C5A059]" /> Thời gian học mỗi ngày
                            </label>
                            <select
                                value={dailyMinutes}
                                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                                className={`w-full p-3.5 rounded-2xl border transition-all ${
                                    isDark
                                        ? "bg-[#0e0e0e] border-white/10 text-white focus:border-[#C5A059]"
                                        : "bg-white border-stone-200 text-stone-900 focus:border-[#C5A059]"
                                }`}
                            >
                                <option value={15}>15 phút (Nhẹ nhàng)</option>
                                <option value={30}>30 phút (Tiêu chuẩn)</option>
                                <option value={45}>45 phút (Nghiêm túc)</option>
                                <option value={60}>60 phút (Chuyên sâu)</option>
                                <option value={90}>90 phút (Hardcore)</option>
                            </select>
                        </div>
                    </div>

                    {/* Days of Week */}
                    <div className={`p-6 rounded-3xl border ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900 shadow-sm"}`}>
                        <label className="block text-sm font-bold mb-4">Bạn rảnh vào những ngày nào trong tuần?</label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { val: 1, label: "Thứ 2" },
                                { val: 2, label: "Thứ 3" },
                                { val: 3, label: "Thứ 4" },
                                { val: 4, label: "Thứ 5" },
                                { val: 5, label: "Thứ 6" },
                                { val: 6, label: "Thứ 7" },
                                { val: 0, label: "Chủ Nhật" },
                            ].map((day) => (
                                <button
                                    key={day.val}
                                    onClick={() => toggleDay(day.val)}
                                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                                        selectedDays.includes(day.val)
                                            ? "bg-[#C5A059] text-[#080808] border-[#C5A059] shadow-lg shadow-[#C5A059]/25 scale-105"
                                            : isDark
                                            ? "bg-white/5 text-stone-300 border-white/10 hover:bg-white/10"
                                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                                    }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RESULT PREVIEW */}
                    <div className={`p-6 rounded-3xl border border-[#C5A059]/40 bg-[#C5A059]/10 shadow-lg ${isDark ? "text-white" : "text-stone-900"}`}>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#C5A059] text-[#080808] flex items-center justify-center flex-shrink-0 shadow-md">
                                <Flag size={24} />
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-xl">Mục tiêu dự kiến</h3>
                                {estimatedInfo ? (
                                    <div className="mt-2 text-sm space-y-1">
                                        <p className={isDark ? "text-stone-300" : "text-stone-600"}>
                                            Bạn sẽ cần khoảng <span className="font-bold text-[#C5A059]">{estimatedInfo.sessions} buổi học</span> ({estimatedInfo.totalHours} giờ) để hoàn thành nội dung.
                                        </p>
                                        <p className="text-base pt-2">
                                            Dự kiến hoàn thành vào: <span className="font-bold text-[#C5A059] text-lg bg-[#C5A059]/15 px-3 py-1 rounded-xl border border-[#C5A059]/30 ml-2 inline-block">{estimatedInfo.date.toLocaleDateString('vi-VN')}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm text-stone-400 italic">
                                        Vui lòng chọn khóa học và lịch học để xem dự báo.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-6">
                        <button
                            onClick={() => setStep(1)}
                            className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                                isDark ? "text-stone-400 hover:text-white" : "text-stone-600 hover:text-stone-900"
                            }`}
                        >
                            Quay lại
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="bg-[#C5A059] text-[#080808] px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#e9c176] transition shadow-xl hover:scale-105 flex items-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Tạo Lộ Trình Ngay ✨"}
                        </button>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className={`rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border ${
                        isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                    }`}>
                        <div className="p-6 border-b border-stone-500/20">
                            <h3 className="font-serif font-bold text-xl">Thanh toán khóa học</h3>
                            <p className="text-xs text-stone-400 mt-1">
                                Bạn đã chọn {paidCoursesToBuy.length} khóa học trả phí.
                            </p>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto space-y-3">
                            {paidCoursesToBuy.map(c => (
                                <div key={c.id} className="flex justify-between items-center text-sm">
                                    <span className="font-medium truncate pr-4">{c.title}</span>
                                    <span className="font-bold text-[#C5A059] shrink-0">{c.price.toLocaleString("vi-VN")} đ</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-4 border-t border-stone-500/20">
                                <span className="font-bold text-stone-400">Tổng cộng</span>
                                <span className="text-2xl font-bold text-[#C5A059]">
                                    {paidCoursesToBuy.reduce((sum, c) => sum + c.price, 0).toLocaleString("vi-VN")} đ
                                </span>
                            </div>
                        </div>
                        <div className="p-6 border-t border-stone-500/20 space-y-3">
                            <button
                                onClick={handleCheckoutBundle}
                                disabled={loading}
                                className="w-full bg-[#C5A059] text-[#080808] py-3.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#e9c176] transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : "Thanh toán ngay bằng MoMo"}
                            </button>
                            <button
                                onClick={() => proceedWithFreeOrOwnedOnly(true)}
                                disabled={loading}
                                className="w-full bg-white/10 text-stone-300 border border-white/10 py-3 rounded-full text-xs font-bold hover:bg-white/20 transition disabled:opacity-70"
                            >
                                Bỏ qua khóa trả phí, tạo lộ trình khóa miễn phí
                            </button>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                disabled={loading}
                                className="w-full text-stone-400 text-xs font-medium py-2 hover:text-white transition"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
