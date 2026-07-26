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
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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

export default function OnboardingWizard() {
    const router = useRouter();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

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
        <div className="w-full py-4 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest text-[#C5A059] liquid-glass mb-4"
                    >
                        <Sparkles size={16} />
                        {t("roadmapPage.startSetupBtn", "Thiết lập lộ trình")}
                    </motion.div>

                    <h1 className={`text-4xl font-bold font-serif mb-4 tracking-tight ${
                        isDark ? "text-white" : "text-stone-900"
                    }`}>
                        {step === 1 ? "Bạn quan tâm đến lĩnh vực nào nhất?" : "Chọn chuyên môn cụ thể"}
                    </h1>

                    <p className={`max-w-md mx-auto text-lg ${
                        isDark ? "text-stone-400" : "text-stone-600"
                    }`}>
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
                                    <Loader2 className="animate-spin text-[#C5A059]" size={32} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {categories.map((category) => {
                                        const IconComp = getIconComponent(category.icon);
                                        return (
                                            <motion.button
                                                key={category.id}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleSelectParent(category.id)}
                                                className={`p-6 rounded-3xl text-left transition-all duration-300 flex items-start gap-5 group cursor-pointer liquid-glass-gold ${
                                                    isDark ? "text-white" : "text-stone-900 shadow-md"
                                                }`}
                                            >
                                                <div className="p-4 rounded-2xl bg-[#C5A059] text-[#080808] flex items-center justify-center flex-shrink-0 shadow-lg">
                                                    <IconComp size={28} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#C5A059] transition-colors">
                                                        {category.name}
                                                    </h3>
                                                    <p className={`text-sm leading-relaxed ${
                                                        isDark ? "text-stone-400" : "text-stone-500"
                                                    }`}>
                                                        {category.description || "Khám phá kiến thức chuyên sâu và lộ trình thực chiến."}
                                                    </p>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 2: Select Children Sub-categories */}
                    {step === 2 && selectedParent && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <button
                                    onClick={() => setStep(1)}
                                    className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                                        isDark ? "text-stone-400 hover:text-white" : "text-stone-600 hover:text-stone-900"
                                    }`}
                                >
                                    <ArrowLeft size={16} /> Quay lại danh mục lớn
                                </button>
                                <span className="text-xs font-bold text-[#C5A059] uppercase tracking-wider">
                                    Đã chọn ({selectedInterests.length})
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {selectedParent.children?.map((child: any) => {
                                    const isSelected = selectedInterests.includes(child.slug);
                                    return (
                                        <motion.div
                                            key={child.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => toggleInterest(child.slug)}
                                            className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-between border ${
                                                isSelected
                                                    ? "bg-[#C5A059] text-[#080808] border-[#C5A059] font-bold shadow-lg"
                                                    : isDark
                                                    ? "liquid-glass text-white border-white/10"
                                                    : "liquid-glass text-stone-900 border-stone-200 shadow-sm"
                                            }`}
                                        >
                                            <span className="font-semibold text-sm">{child.name}</span>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                                isSelected
                                                    ? "bg-[#080808] text-white border-[#080808]"
                                                    : "border-stone-400/40 text-transparent"
                                            }`}>
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end pt-6">
                                <button
                                    disabled={selectedInterests.length === 0 || loading}
                                    onClick={handleGenerateRoadmap}
                                    className={`px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-3 shadow-xl ${
                                        selectedInterests.length > 0 && !loading
                                            ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176] shadow-[0_0_25px_rgba(197,160,89,0.35)] cursor-pointer hover:scale-105"
                                            : "bg-stone-500/20 text-stone-500 cursor-not-allowed"
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>Đang khởi tạo Lộ trình...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Tạo Lộ trình học AI ngay</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
