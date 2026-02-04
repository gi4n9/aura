"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getEnrolledCourses, createStudyPlan } from "@/app/actions/study-plan";
import { Calendar, Clock, CheckCircle2, ChevronRight, Loader2, CalendarCheck, Flag } from "lucide-react";

// Types
type EnrolledCourse = {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    category: { name: string } | null;
    totalDuration: number; // seconds
};

export default function CreatePlanPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [courses, setCourses] = useState<EnrolledCourse[]>([]);

    // Form State
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [planName, setPlanName] = useState("Kế hoạch học tập mới");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [dailyMinutes, setDailyMinutes] = useState(45);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Default Mon,Wed,Fri

    useEffect(() => {
        // Fetch courses on mount and calculate duration
        getEnrolledCourses().then(data => {
            const mapped = data.map((c: any) => ({
                id: c.id,
                title: c.title,
                thumbnailUrl: c.thumbnailUrl,
                category: c.category,
                // Calculate total duration from nested chapters -> lessons
                totalDuration: c.chapters.reduce((acc: number, ch: any) =>
                    acc + ch.lessons.reduce((lAcc: number, l: any) => lAcc + (l.duration || 0), 0), 0)
            }));
            setCourses(mapped);
        });
    }, []);

    // LOGIC: Calculate Estimated End Date
    const estimatedInfo = useMemo(() => {
        if (selectedCourses.length === 0 || selectedDays.length === 0) return null;

        // 1. Total minutes needed for selected courses
        const totalSeconds = courses
            .filter(c => selectedCourses.includes(c.id))
            .reduce((acc, c) => acc + c.totalDuration, 0);

        // Add buffer: Assume 20% extra time for review/quizzes if duration is pure video
        // Or if duration is missing/low, assume 15 mins per lesson (we don't have lesson count here easily but totalDuration handles it)
        // Let's stick to raw duration / 60 for minutes.
        const totalMinutes = Math.ceil(totalSeconds / 60);

        // 2. Calculate Sessions Needed
        const sessionsNeeded = Math.ceil(totalMinutes / dailyMinutes);
        if (sessionsNeeded === 0) return { date: new Date(startDate), sessions: 0 };

        // 3. Find End Date based on Schedule
        let sessionsCount = 0;
        let currentDate = new Date(startDate);
        let safety = 0;

        // Clone start date to avoid mutation issues
        let iteratorDate = new Date(startDate);

        while (sessionsCount < sessionsNeeded && safety < 3000) { // Max ~8 years safety
            const day = iteratorDate.getDay(); // 0-6
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

        setLoading(true);
        const res = await createStudyPlan({
            name: planName,
            courseIds: selectedCourses,
            daysOfWeek: selectedDays,
            dailyMinutes: dailyMinutes,
            startDate: new Date(startDate)
        });

        if (res.success) {
            router.push("/onboarding/study-plan");
        } else {
            alert("Có lỗi xảy ra: " + (res.error || "Unknown"));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-20 max-w-3xl mx-auto px-6">
            <h1 className="text-3xl font-serif font-bold text-stone-800 mb-2">Tạo Lộ Trình Học Tập 🎯</h1>
            <p className="text-stone-500 mb-8">Aura sẽ giúp bạn sắp xếp thời gian hợp lý để hoàn thành mục tiêu.</p>

            {/* PROGRESS STEPS */}
            <div className="flex items-center gap-4 mb-10 text-sm font-bold text-stone-400">
                <span className={step >= 1 ? "text-[#C5A059]" : ""}>1. Chọn khóa học</span>
                <ChevronRight size={16} />
                <span className={step >= 2 ? "text-[#C5A059]" : ""}>2. Thiết lập thời gian</span>
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-xl font-bold text-stone-800">Bạn muốn học những khóa nào?</h2>

                    {courses.length === 0 ? (
                        <div className="p-8 border border-dashed border-stone-300 rounded-xl text-center text-stone-500">
                            Bạn chưa đăng ký khóa học nào. Hãy đăng ký khóa học trước nhé!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map(course => (
                                <div
                                    key={course.id}
                                    onClick={() => toggleCourse(course.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 hover:shadow-md
                                        ${selectedCourses.includes(course.id)
                                            ? "border-[#C5A059] bg-amber-50"
                                            : "border-stone-100 bg-white hover:border-stone-300"}
                                    `}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0
                                         ${selectedCourses.includes(course.id) ? "border-[#C5A059] bg-[#C5A059]" : "border-stone-300"}
                                    `}>
                                        {selectedCourses.includes(course.id) && <CheckCircle2 size={14} className="text-white" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-stone-800">{course.title}</h4>
                                        <p className="text-xs text-stone-500 mt-1">{course.category?.name || "Chung"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            disabled={selectedCourses.length === 0}
                            onClick={() => setStep(2)}
                            className="bg-[#1a1a1a] text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                            Tiếp tục <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Plan Name */}
                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Tên kế hoạch</label>
                        <input
                            type="text"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                        />
                    </div>

                    {/* Start Date & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} /> Ngày bắt đầu
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                                <Clock size={16} /> Thời gian học mỗi ngày (phút)
                            </label>
                            <select
                                value={dailyMinutes}
                                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                                className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059]"
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
                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-4">Bạn rảnh vào những ngày nào?</label>
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
                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all
                                        ${selectedDays.includes(day.val)
                                            ? "bg-[#C5A059] text-white border-[#C5A059] shadow-md transform scale-105"
                                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"}
                                    `}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* RESULT PREVIEW */}
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="bg-white p-3 rounded-full border border-stone-200 text-[#C5A059] shadow-sm">
                                <Flag size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-lg">Mục tiêu dự kiến</h3>
                                {estimatedInfo ? (
                                    <div className="mt-2 text-sm text-stone-600 space-y-1">
                                        <p>Bạn sẽ cần khoảng <span className="font-bold text-[#1a1a1a]">{estimatedInfo.sessions} buổi học</span> ({estimatedInfo.totalHours} giờ) để hoàn thành nội dung.</p>
                                        <p className="text-base pt-1">
                                            Dự kiến hoàn thành vào: <span className="font-bold text-[#C5A059] text-lg bg-white px-2 py-0.5 rounded border border-[#C5A059]/30 ml-1">{estimatedInfo.date.toLocaleDateString('vi-VN')}</span>
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

                    <div className="flex justify-between pt-8 border-t border-stone-100">
                        <button
                            onClick={() => setStep(1)}
                            className="text-stone-500 font-bold hover:text-stone-800 transition"
                        >
                            Quay lại
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="bg-[#1a1a1a] text-white px-8 py-3 rounded-xl font-bold hover:bg-stone-800 transition shadow-lg flex items-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Tạo Lộ Trình Ngay ✨"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

