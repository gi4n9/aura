"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    generateAndAssignRoadmap,
    getOnboardingCategories
} from "@/app/actions/onboarding";
import {
    ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Code, Brain,
    Server, Globe, Terminal, PenTool, Briefcase, Monitor, Layout, Cpu
} from "lucide-react";

// Helper to map string icon names from DB to Lucide React components
const getIconComponent = (iconName: string | null) => {
    switch (iconName?.toLowerCase()) {
        case "terminal": return Terminal;
        case "globe": return Globe;
        case "pen-tool": return PenTool;
        case "briefcase": return Briefcase;
        case "code": return Code;
        case "server": return Server;
        case "brain": return Brain;
        case "layout": return Layout;
        case "cpu": return Cpu;
        default: return Monitor;
    }
};

// Helper for vibrant colors
const getColorClass = (index: number) => {
    const colors = ["bg-indigo-500", "bg-emerald-500", "bg-rose-500", "bg-amber-500", "bg-cyan-500", "bg-fuchsia-500"];
    return colors[index % colors.length];
};

export default function OnboardingWizard() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    // Navigation State
    const [step, setStep] = useState(1); // 1 = Parent, 2 = Children
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]); // Array of child slugs

    useEffect(() => {
        getOnboardingCategories().then(data => {
            setCategories(data || []);
        });
    }, []);

    const handleSelectParent = (parentId: string) => {
        setSelectedParentId(parentId);
        setSelectedInterests([]); // Reset children when changing parent
        setStep(2);
    };

    const toggleInterest = (slug: string) => {
        setSelectedInterests(prev =>
            prev.includes(slug) ? prev.filter(i => i !== slug) : [...prev, slug]
        );
    };

    const handleGenerateRoadmap = async () => {
        if (selectedInterests.length === 0) return;

        setLoading(true);
        const result = await generateAndAssignRoadmap(selectedInterests);

        if (result.success) {
            router.push("/roadmap");
        } else {
            alert("Có lỗi: " + result.error);
            setLoading(false);
        }
    };

    const selectedParent = categories.find(c => c.id === selectedParentId);

    return (
        <div className="min-h-screen bg-[#F9F8F4] py-12 px-4">
            <div className="max-w-4xl mx-auto mt-12">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-stone-200 shadow-sm text-sm font-medium text-stone-600 mb-4"
                    >
                        <Sparkles size={16} className="text-indigo-600" />
                        Thiết lập lộ trình
                    </motion.div>

                    <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">
                        {step === 1 ? "Bạn quan tâm đến lĩnh vực nào nhất?" : "Chọn chuyên môn cụ thể"}
                    </h1>

                    <p className="text-stone-500 max-w-md mx-auto text-lg">
                        {step === 1
                            ? "Hãy chọn một lĩnh vực lớn để bắt đầu hành trình của bạn."
                            : `Lựa chọn một hoặc nhiều chủ đề thuộc lĩnh vực ${selectedParent?.name} để cá nhân hóa lộ trình.`
                        }
                    </p>
                </div>

                <AnimatePresence mode="wait">
                    {/* STEP 1: Select Parent Category */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            {categories.length === 0 ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {categories.map((parent, idx) => {
                                        const Icon = getIconComponent(parent.icon);
                                        const colorClass = getColorClass(idx);

                                        return (
                                            <button
                                                key={parent.id}
                                                onClick={() => handleSelectParent(parent.id)}
                                                className="p-6 rounded-2xl border-2 border-stone-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all text-left group"
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`w-14 h-14 rounded-xl ${colorClass} text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                                                        <Icon size={28} />
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors">
                                                        <ArrowRight size={20} />
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-xl mb-1 text-stone-800">{parent.name}</h3>
                                                <p className="text-sm text-stone-500 leading-relaxed">{parent.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 2: Select Child Categories */}
                    {step === 2 && selectedParent && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {selectedParent.children.map((child: any, idx: number) => {
                                    const isSelected = selectedInterests.includes(child.slug);
                                    const Icon = getIconComponent(child.icon || "code");
                                    const colorClass = getColorClass(idx + 3);

                                    return (
                                        <button
                                            key={child.id}
                                            onClick={() => toggleInterest(child.slug)}
                                            className={`p-6 rounded-2xl border-2 transition-all text-left group overflow-hidden ${isSelected
                                                ? "border-indigo-500 bg-indigo-50/50 shadow-md"
                                                : "border-stone-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-14 h-14 rounded-xl ${colorClass} text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                                                    <Icon size={28} />
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-1 ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-stone-300"
                                                    }`}>
                                                    {isSelected && <Check size={14} className="text-white" />}
                                                </div>
                                            </div>
                                            <h3 className={`font-bold text-xl mb-1 ${isSelected ? "text-indigo-900" : "text-stone-800"}`}>{child.name}</h3>
                                            <p className="text-sm text-stone-500 leading-relaxed">{child.description}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between items-center pt-8 border-t border-stone-100">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-semibold transition-colors"
                                >
                                    <ArrowLeft size={18} /> Quay lại
                                </button>

                                <button
                                    onClick={handleGenerateRoadmap}
                                    disabled={selectedInterests.length === 0 || loading}
                                    className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <>Tạo lộ trình <ArrowRight size={20} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
