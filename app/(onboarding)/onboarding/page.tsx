"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Server,
    Layout,
    Database,
    Globe,
    Cpu,
    CheckCircle2,
    ArrowRight,
    Loader2,
    Sparkles
} from "lucide-react";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { saveOnboardingInterests } from "@/app/actions/onboarding";
import { useRouter } from "next/navigation";

// --- Types ---
type InterestOption = {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
};

const INTERESTS: InterestOption[] = [
    {
        id: "backend",
        label: "Backend Master",
        description: "Server logic, Databases, API, Architecture",
        icon: <Server size={32} />,
        color: "from-blue-500 to-indigo-600"
    },
    {
        id: "frontend",
        label: "Frontend Wizard",
        description: "React, UI/UX, Animations, Responsive Design",
        icon: <Layout size={32} />,
        color: "from-pink-500 to-rose-600"
    },
    {
        id: "fullstack",
        label: "Fullstack Hero",
        description: "Master both sides of the force",
        icon: <Globe size={32} />,
        color: "from-purple-500 to-violet-600"
    },
    {
        id: "devops",
        label: "DevOps Engineer",
        description: "CI/CD, Docker, Kubernetes, Cloud",
        icon: <Cpu size={32} />,
        color: "from-emerald-500 to-teal-600"
    }
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<"select" | "generating" | "result">("select");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // React Flow State for "Result" step
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleComplete = async () => {
        if (selectedIds.length === 0) return;

        setStep("generating");

        // Call Server Action
        const res = await saveOnboardingInterests(selectedIds);

        if (res.success) {
            // Fetch the generated roadmap data to display immediately (quick hack: re-fetch or use local logic to show preview)
            // For now, we wait a bit to 'simulate' the majestic generation
            setTimeout(async () => {
                // We can't easily get the returned data from the server action if we didn't return it
                // But for the demo, let's just "simulate" the reload or fetch. 
                // Ideally the server action should return the roadmap.

                // Let's redirect to dashboard or show the map here.
                // The user asked to "Lap study plan cu the".
                // Let's refresh page or go to dashboard.
                router.push("/roadmap");
            }, 2000);
        } else {
            alert("Error: " + res.error);
            setStep("select");
        }
    };

    return (
        <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl" />
            </div>

            <AnimatePresence mode="wait">
                {step === "select" && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="z-10 max-w-4xl w-full"
                    >
                        <div className="text-center mb-12">
                            <motion.div
                                initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                                className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm"
                            >
                                <Sparkles size={16} className="text-[#C5A059]" />
                                <span className="text-xs font-bold tracking-widest uppercase text-stone-500">Aura Onboarding</span>
                            </motion.div>
                            <h1 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">
                                What are you looking for?
                            </h1>
                            <p className="text-stone-500 text-lg max-w-2xl mx-auto">
                                Aura will analyze data from thousands of successful career paths (roadmap.sh) to create a personalized learning roadmap for you.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            {INTERESTS.map((item) => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                    <motion.button
                                        key={item.id}
                                        onClick={() => toggleSelection(item.id)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group overflow-hidden ${isSelected
                                            ? "border-[#C5A059] bg-white shadow-xl"
                                            : "border-stone-200 bg-white/50 hover:border-stone-300 hover:bg-white"
                                            }`}
                                    >
                                        {/* Background Gradient on Select */}
                                        {isSelected && (
                                            <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${item.color}`} />
                                        )}

                                        <div className="relative flex items-start gap-4">
                                            <div className={`p-4 rounded-xl text-white shadow-lg bg-gradient-to-br ${item.color}`}>
                                                {item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-serif font-bold text-xl text-stone-800 group-hover:text-[#C5A059] transition-colors">
                                                        {item.label}
                                                    </h3>
                                                    {isSelected && <CheckCircle2 className="text-[#C5A059]" size={24} />}
                                                </div>
                                                <p className="text-sm text-stone-500 mt-2 font-medium leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.button>
                                )
                            })}
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={handleComplete}
                                disabled={selectedIds.length === 0}
                                className="px-8 py-4 bg-[#1a1a1a] text-white font-bold rounded-full text-lg shadow-xl hover:bg-[#C5A059] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 transform hover:-translate-y-1"
                            >
                                Create Learning Path <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === "generating" && (
                    <motion.div
                        key="generating"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="z-10 flex flex-col items-center justify-center text-center"
                    >
                        <div className="w-24 h-24 mb-8 relative">
                            <div className="absolute inset-0 border-4 border-stone-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[#C5A059] rounded-full border-t-transparent animate-spin"></div>
                            <Sparkles className="absolute inset-0 m-auto text-[#C5A059] animate-pulse" size={32} />
                        </div>
                        <h2 className="font-serif text-3xl font-bold text-stone-900 mb-2">Đang phân tích dữ liệu...</h2>
                        <p className="text-stone-500 font-mono text-sm bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm">
                            Fetching data from roadmap.sh/backend...<br />
                            Parsing nodes...<br />
                            Structuring learning path...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
