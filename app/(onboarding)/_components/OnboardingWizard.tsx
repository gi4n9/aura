"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    saveOnboardingInterests,
    getRoadmapWithMatchedCourses,
    enrollAndCreateStudyPlan,
    type RoadmapWithCourses
} from "@/app/actions/onboarding";
import {
    ArrowRight, ArrowLeft, Check, Loader2, Map, Calendar,
    BookOpen, Clock, Sparkles, Code, Brain,
    Server, Globe, ChevronDown, ChevronUp, X
} from "lucide-react";
import Image from "next/image";

// ===== INTEREST OPTIONS =====
const INTEREST_OPTIONS = [
    { id: "backend", label: "Backend Development", icon: Server, color: "bg-green-500", description: "Node.js, Express, NestJS, Database" },
    { id: "frontend", label: "Frontend Development", icon: Globe, color: "bg-purple-500", description: "React, Next.js, Tailwind CSS" },
    { id: "fullstack", label: "Fullstack Development", icon: Code, color: "bg-orange-500", description: "Frontend + Backend + Deployment" },
    { id: "ai", label: "AI & Machine Learning", icon: Brain, color: "bg-pink-500", description: "Python, ML, Deep Learning, LLMs" },
];

export default function OnboardingWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Multiple Interests
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    // Step 2: Roadmap & Courses
    const [roadmapData, setRoadmapData] = useState<RoadmapWithCourses | null>(null);
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

    // Step 3: Schedule Config
    const [scheduleConfig, setScheduleConfig] = useState({
        daysOfWeek: [1, 3, 5],
        dailyMinutes: 45,
        startDate: new Date().toISOString().split('T')[0]
    });

    // ===== HANDLERS =====
    const toggleInterest = (id: string) => {
        setSelectedInterests(prev => {
            if (id === "fullstack") {
                const withoutParts = prev.filter(i => i !== "backend" && i !== "frontend");
                return prev.includes(id) ? prev.filter(i => i !== id) : [...withoutParts, id];
            }
            if ((id === "backend" || id === "frontend") && prev.includes("fullstack")) {
                const withoutFullstack = prev.filter(i => i !== "fullstack");
                return [...withoutFullstack, id];
            }
            return prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
        });
    };

    const handleInterestSelect = async () => {
        if (selectedInterests.length === 0) return;

        setLoading(true);
        const result = await saveOnboardingInterests(selectedInterests);

        if (result.success && result.roadmapId) {
            const roadmap = await getRoadmapWithMatchedCourses(result.roadmapId);
            setRoadmapData(roadmap);

            if (roadmap) {
                const uniqueCourseIds = [...new Set(roadmap.matchedCourses.map(c => c.id))];
                setSelectedCourses(uniqueCourseIds);
                const nodeIds = Object.keys(roadmap.coursesByNode).slice(0, 3);
                setExpandedNodes(nodeIds);
            }
            setStep(2);
        }
        setLoading(false);
    };

    const handleCreatePlan = async () => {
        if (selectedCourses.length === 0 || !roadmapData) return;

        setLoading(true);
        const result = await enrollAndCreateStudyPlan({
            courseIds: selectedCourses,
            roadmapId: roadmapData.roadmap.id,
            daysOfWeek: scheduleConfig.daysOfWeek,
            dailyMinutes: scheduleConfig.dailyMinutes,
            startDate: new Date(scheduleConfig.startDate)
        });

        if (result.success) {
            router.push("/onboarding/study-plan");
        } else {
            alert("Có lỗi: " + result.error);
        }
        setLoading(false);
    };

    const toggleCourse = (courseId: string) => {
        setSelectedCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
    };

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
    };

    const toggleDay = (day: number) => {
        setScheduleConfig(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day].sort((a, b) => a - b)
        }));
    };

    return (
        <div className="min-h-screen bg-[#F9F8F4] py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-stone-200 shadow-sm text-sm font-medium text-stone-600 mb-4"
                    >
                        <Sparkles size={16} className="text-[#C5A059]" />
                        Bước {step} / 3
                    </motion.div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">
                        {step === 1 && "Bạn muốn học gì?"}
                        {step === 2 && "Lộ trình học tập của bạn"}
                        {step === 3 && "Thiết lập lịch học"}
                    </h1>
                    <p className="text-stone-500 max-w-md mx-auto">
                        {step === 1 && "Chọn một hoặc nhiều lĩnh vực bạn quan tâm. Chúng tôi sẽ tạo lộ trình tối ưu."}
                        {step === 2 && "Đây là các khóa học phù hợp với lộ trình của bạn."}
                        {step === 3 && "Tùy chỉnh lịch học để phù hợp với thời gian của bạn."}
                    </p>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center justify-center gap-2 mb-12">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s ? "bg-[#1a1a1a] text-white" : "bg-stone-200 text-stone-400"
                                }`}>
                                {step > s ? <Check size={18} /> : s}
                            </div>
                            {s < 3 && <div className={`w-16 h-1 rounded-full ${step > s ? "bg-[#1a1a1a]" : "bg-stone-200"}`} />}
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* STEP 1: INTERESTS */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {INTEREST_OPTIONS.map((option) => {
                                    const isSelected = selectedInterests.includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => toggleInterest(option.id)}
                                            className={`p-6 rounded-2xl border-2 transition-all text-left group relative overflow-hidden ${isSelected ? "border-[#C5A059] bg-[#fffaf0] shadow-lg" : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-md"
                                                }`}
                                        >
                                            <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-[#C5A059] bg-[#C5A059]" : "border-stone-300"
                                                }`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                            <div className={`w-14 h-14 rounded-xl ${option.color} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                <option.icon size={28} />
                                            </div>
                                            <h3 className={`font-bold text-lg mb-1 ${isSelected ? "text-[#C5A059]" : "text-stone-800"}`}>{option.label}</h3>
                                            <p className="text-sm text-stone-500">{option.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex justify-center pt-6">
                                <button
                                    onClick={handleInterestSelect}
                                    disabled={selectedInterests.length === 0 || loading}
                                    className="bg-[#1a1a1a] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#C5A059] transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <>Tạo lộ trình <ArrowRight size={20} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: ROADMAP & COURSES */}
                    {step === 2 && roadmapData && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="bg-[#1a1a1a] text-white p-6 rounded-2xl flex items-center gap-4">
                                <div className="w-14 h-14 bg-[#C5A059] rounded-xl flex items-center justify-center shrink-0"><Map size={28} /></div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold">{roadmapData.roadmap.title}</h2>
                                    <p className="text-stone-400 text-sm">{roadmapData.roadmap.description}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-2xl font-bold text-[#C5A059]">{roadmapData.roadmap.totalEstimatedHours}h</div>
                                    <div className="text-xs text-stone-400">Ước tính</div>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {Object.entries(roadmapData.coursesByNode).map(([nodeId, courses]) => {
                                    const node = roadmapData.roadmap.nodes.find(n => n.id === nodeId);
                                    const isExpanded = expandedNodes.includes(nodeId);
                                    const selectedInNode = courses.filter(c => selectedCourses.includes(c.id)).length;
                                    return (
                                        <div key={nodeId} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                                            <button onClick={() => toggleNode(nodeId)} className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-[#C5A059]" />
                                                    <span className="font-bold text-stone-800">{node?.data.label || nodeId}</span>
                                                    <span className="text-xs text-stone-400">({selectedInNode}/{courses.length} khóa học)</span>
                                                </div>
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>
                                            {isExpanded && (
                                                <div className="border-t border-stone-100 divide-y divide-stone-50">
                                                    {courses.map((course) => (
                                                        <div key={`${course.id}-${nodeId}`} onClick={() => toggleCourse(course.id)} className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${selectedCourses.includes(course.id) ? "bg-[#fffaf0]" : "hover:bg-stone-50"}`}>
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${selectedCourses.includes(course.id) ? "border-[#C5A059] bg-[#C5A059]" : "border-stone-300"}`}>
                                                                {selectedCourses.includes(course.id) && <Check size={12} className="text-white" />}
                                                            </div>
                                                            <div className="w-16 h-10 bg-stone-100 rounded-lg overflow-hidden relative shrink-0">
                                                                {course.thumbnailUrl ? <Image src={course.thumbnailUrl} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-stone-300"><BookOpen size={16} /></div>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-medium text-stone-800 text-sm truncate">{course.title}</h4>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between pt-4 border-t border-stone-100">
                                <button onClick={() => setStep(1)} className="text-stone-500 font-bold flex items-center gap-2 hover:text-stone-800 transition"><ArrowLeft size={18} /> Quay lại</button>
                                <button onClick={() => setStep(3)} disabled={selectedCourses.length === 0} className="bg-[#1a1a1a] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#C5A059] transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">Thiết lập lịch <ArrowRight size={18} /></button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: SCHEDULE */}
                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 max-w-2xl mx-auto">
                            <div className="bg-white p-6 rounded-2xl border border-stone-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-stone-800 flex items-center gap-2"><BookOpen size={18} className="text-[#C5A059]" /> Khóa học đã chọn</h3>
                                    <span className="text-sm font-bold text-[#C5A059]">{selectedCourses.length} khóa</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-stone-200">
                                <label className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Calendar size={18} className="text-[#C5A059]" /> Ngày bắt đầu</label>
                                <input type="date" value={scheduleConfig.startDate} onChange={(e) => setScheduleConfig(prev => ({ ...prev, startDate: e.target.value }))} className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] mt-2" />
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-stone-200">
                                <label className="font-bold text-stone-800 mb-4 block">Ngày học trong tuần</label>
                                <div className="flex flex-wrap gap-3">
                                    {[{ val: 1, label: "T2" }, { val: 2, label: "T3" }, { val: 3, label: "T4" }, { val: 4, label: "T5" }, { val: 5, label: "T6" }, { val: 6, label: "T7" }, { val: 0, label: "CN" }].map((day) => (
                                        <button key={day.val} onClick={() => toggleDay(day.val)} className={`w-12 h-12 rounded-xl font-bold transition-all ${scheduleConfig.daysOfWeek.includes(day.val) ? "bg-[#1a1a1a] text-white shadow-lg" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-stone-200">
                                <label className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Clock size={18} className="text-[#C5A059]" /> Thời gian học mỗi ngày</label>
                                <select value={scheduleConfig.dailyMinutes} onChange={(e) => setScheduleConfig(prev => ({ ...prev, dailyMinutes: Number(e.target.value) }))} className="w-full p-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059] mt-2">
                                    <option value={15}>15 phút</option>
                                    <option value={30}>30 phút</option>
                                    <option value={45}>45 phút</option>
                                    <option value={60}>60 phút</option>
                                </select>
                            </div>
                            <div className="flex justify-between pt-4 border-t border-stone-100">
                                <button onClick={() => setStep(2)} className="text-stone-500 font-bold flex items-center gap-2 hover:text-stone-800 transition"><ArrowLeft size={18} /> Quay lại</button>
                                <button onClick={handleCreatePlan} disabled={loading || scheduleConfig.daysOfWeek.length === 0} className="bg-[#C5A059] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#b08d4b] transition-all shadow-lg flex items-center gap-3 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : <>Tạo lộ trình <Sparkles size={20} /></>}</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
