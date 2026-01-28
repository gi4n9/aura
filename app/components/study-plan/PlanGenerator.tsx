"use client";

import { useState, useMemo } from "react";
import { format, addDays, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, Save, RefreshCw, Settings, CheckCircle2, BookOpen } from "lucide-react";
import { saveStudyPlan } from "@/app/actions/study-plan";
import { useRouter } from "next/navigation";

// Types
type Lesson = {
    id: string;
    title: string;
    duration: number | null;
    chapterTitle: string;
};

type GeneratedDay = {
    date: Date;
    lessons: Lesson[];
};

export default function PlanGenerator({
    courseId,
    lessons,
}: {
    courseId: string;
    lessons: Lesson[];
}) {
    const router = useRouter();

    // Settings State
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri (0=Sun, 1=Mon...)
    const [lessonsPerDay, setLessonsPerDay] = useState<number>(2);

    const [isSaving, setIsSaving] = useState(false);

    // Constants
    const DAYS = [
        { label: "CN", value: 0 },
        { label: "T2", value: 1 },
        { label: "T3", value: 2 },
        { label: "T4", value: 3 },
        { label: "T5", value: 4 },
        { label: "T6", value: 5 },
        { label: "T7", value: 6 },
    ];

    // Logic: Generate Plan
    const generatedPlan = useMemo(() => {
        if (selectedDays.length === 0 || lessons.length === 0) return [];

        const plan: GeneratedDay[] = [];
        let currentLessonIdx = 0;
        let currentDate = new Date(startDate);

        // Safety break to prevent infinite loop
        let loops = 0;
        while (currentLessonIdx < lessons.length && loops < 1000) {
            const dayOfWeek = getDay(currentDate); // 0-6

            if (selectedDays.includes(dayOfWeek)) {
                // Assign lessons for this day
                const dayLessons = [];
                for (let i = 0; i < lessonsPerDay; i++) {
                    if (currentLessonIdx < lessons.length) {
                        dayLessons.push(lessons[currentLessonIdx]);
                        currentLessonIdx++;
                    }
                }

                if (dayLessons.length > 0) {
                    plan.push({ date: new Date(currentDate), lessons: dayLessons });
                }
            }

            // Next day
            currentDate = addDays(currentDate, 1);
            loops++;
        }

        return plan;
    }, [lessons, startDate, selectedDays, lessonsPerDay]);


    // Handler: Toggle Day
    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    // Handler: Save
    const handleSave = async () => {
        if (generatedPlan.length === 0) return;
        setIsSaving(true);

        // Flatten logic
        const flatItems = generatedPlan.flatMap(day =>
            day.lessons.map(l => ({ lessonId: l.id, date: day.date.toISOString() }))
        );

        const res = await saveStudyPlan(courseId, flatItems);
        setIsSaving(false);

        if (res.success) {
            alert("Đã lưu lộ trình học tập thành công!");
            router.refresh(); // Refresh to show somewhere?
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* LEFT: SETTINGS PANEL */}
            <div className="w-full md:w-80 flex-shrink-0 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                    <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
                        <Settings size={20} className="text-[#C5A059]" />
                        Thiết lập lộ trình
                    </h3>

                    <div className="space-y-4">
                        {/* Start Date */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Ngày bắt đầu</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border border-stone-200 rounded-lg text-sm focus:border-[#C5A059] outline-none"
                            />
                        </div>

                        {/* Days Selection */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-stone-500 mb-2">Lịch học trong tuần</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => toggleDay(d.value)}
                                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${selectedDays.includes(d.value)
                                                ? "bg-[#1a1a1a] text-[#C5A059] shadow-md scale-105"
                                                : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                                            }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pace */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Số bài học / ngày</label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={lessonsPerDay}
                                onChange={(e) => setLessonsPerDay(Number(e.target.value))}
                                className="w-full p-2 border border-stone-200 rounded-lg text-sm focus:border-[#C5A059] outline-none"
                            />
                            <p className="text-[10px] text-stone-400 mt-1 italic">
                                Dự kiến hoàn thành: {generatedPlan.length > 0 ? format(generatedPlan[generatedPlan.length - 1].date, "dd/MM/yyyy") : "--"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving || generatedPlan.length === 0}
                        className="w-full mt-6 py-3 bg-[#C5A059] text-white font-bold rounded-lg hover:bg-[#b08d4b] transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={18} />}
                        Lưu Lộ Trình
                    </button>
                </div>
            </div>

            {/* RIGHT: PREVIEW PANEL */}
            <div className="flex-1">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif font-bold text-xl text-stone-800">Lịch trình dự kiến</h3>
                    <span className="text-sm font-bold bg-white border border-stone-200 px-3 py-1 rounded text-stone-500">
                        Tổng {generatedPlan.length} buổi học
                    </span>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden min-h-[500px]">
                    {generatedPlan.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                            <CalendarIcon size={48} className="mb-4 opacity-50" />
                            <p>Vui lòng chọn lịch học để tạo lộ trình.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {generatedPlan.map((day, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row">
                                    {/* Date Column */}
                                    <div className="w-full sm:w-32 bg-stone-50/50 p-4 border-b sm:border-b-0 sm:border-r border-stone-100 flex sm:flex-col items-center sm:items-start sm:justify-center gap-2">
                                        <span className="text-2xl font-bold text-stone-300">
                                            {format(day.date, "dd")}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase text-[#C5A059]">Tháng {format(day.date, "MM")}</span>
                                            <span className="text-xs text-stone-500 font-medium">{format(day.date, "EEEE", { locale: vi })}</span>
                                        </div>
                                    </div>

                                    {/* Lessons Column */}
                                    <div className="flex-1 p-4 space-y-3">
                                        {day.lessons.map(lesson => (
                                            <div key={lesson.id} className="flex items-start gap-3 group">
                                                <div className="mt-1">
                                                    <CheckCircle2 size={16} className="text-stone-300 group-hover:text-[#C5A059] transition-colors" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-stone-700 text-sm group-hover:text-[#1a1a1a] transition-colors">
                                                        {lesson.title}
                                                    </h4>
                                                    <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                                                        <BookOpen size={10} /> {lesson.chapterTitle}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
