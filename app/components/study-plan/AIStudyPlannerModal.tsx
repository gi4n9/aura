"use client";

import { useState } from "react";
import { createStudyPlan } from "@/app/actions/study-plan";
import { Calendar, Check, Clock, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface AIStudyPlannerModalProps {
    courseId: string;
    isOpen: boolean;
    onClose: () => void;
}

const DAYS_OF_WEEK = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
];

export default function AIStudyPlannerModal({ courseId, isOpen, onClose }: AIStudyPlannerModalProps) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [dailyMinutes, setDailyMinutes] = useState(60);
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));

    if (!isOpen) return null;

    const toggleDay = (day: number) => {
        if (selectedDays.includes(day)) {
            if (selectedDays.length === 1) return; // Must have at least one day
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await createStudyPlan({
                courseId,
                startDate,
                availableDays: selectedDays,
                dailyMinutes
            });

            if (result.success) {
                toast.success("Đã tạo lộ trình học tập thành công!");
                setStep(2); // Success view
                // Optionally redirect to a full schedule page
                // router.push(`/courses/${courseId}/study-plan`);
            } else {
                toast.error(result.error || "Có lỗi xảy ra");
            }
        } catch (e) {
            toast.error("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-[#F9F8F4] p-6 border-b border-stone-100 flex justify-between items-start">
                    <div>
                        <h2 className="font-serif font-bold text-xl text-[#1a1a1a] flex items-center gap-2">
                            <Sparkles size={20} className="text-[#C5A059]" />
                            Lập kế hoạch học tập
                        </h2>
                        <p className="text-sm text-stone-500 mt-1">
                            Aura sẽ giúp bạn phân bổ bài học hợp lý.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-6">

                            {/* 1. Availability */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">Bạn có thể học vào những ngày nào?</label>
                                <div className="flex gap-2 justify-between">
                                    {DAYS_OF_WEEK.map((day) => {
                                        const isSelected = selectedDays.includes(day.value);
                                        return (
                                            <button
                                                key={day.value}
                                                onClick={() => toggleDay(day.value)}
                                                className={`w-10 h-10 rounded-full text-xs font-bold transition-all flex items-center justify-center
                                                    ${isSelected
                                                        ? "bg-[#1a1a1a] text-white shadow-md scale-105"
                                                        : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                                                    }`}
                                            >
                                                {day.label.charAt(0)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. Duration */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2 flex justify-between">
                                    <span>Thời gian học mỗi ngày</span>
                                    <span className="text-[#C5A059]">{dailyMinutes} phút</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-stone-400" />
                                    <input
                                        type="range"
                                        min={15} max={180} step={15}
                                        value={dailyMinutes}
                                        onChange={(e) => setDailyMinutes(Number(e.target.value))}
                                        className="w-full accent-[#C5A059] h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-stone-400 mt-1 px-1">
                                    <span>15p</span>
                                    <span>3 tiếng</span>
                                </div>
                            </div>

                            {/* 3. Start Date */}
                            <div>
                                <label className="block text-sm font-bold text-stone-700 mb-2">Ngày bắt đầu</label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute top-3 left-3 text-stone-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-stone-200 focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full py-3 bg-[#C5A059] text-white font-bold rounded-xl hover:bg-[#b08d4b] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                Tạo lộ trình ngay
                            </button>

                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                                <Check size={32} />
                            </div>
                            <h3 className="font-bold text-xl text-stone-800 mb-2">Thành công!</h3>
                            <p className="text-stone-500 mb-6">Lộ trình học tập cá nhân hóa của bạn đã sẵn sàng.</p>

                            <button
                                onClick={() => {
                                    onClose();
                                    router.refresh();
                                }}
                                className="w-full py-3 bg-stone-800 text-white font-bold rounded-xl hover:bg-black transition-all"
                            >
                                Xem kế hoạch
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
