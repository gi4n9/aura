"use client";

import { motion } from 'framer-motion';
import { CheckCircle2, Check, Rocket, GraduationCap, Lock, PlayCircle, SkipForward } from 'lucide-react';
import { RoadmapNodeStatus } from '@prisma/client';
import Link from 'next/link';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export type RoadmapNodeData = {
    id: string;
    stageLevel: number;
    status: RoadmapNodeStatus;
    courseId: string;
    course: {
        title: string;
        category?: { slug: string } | null;
    }
};

type RoadmapViewProps = {
    nodes: RoadmapNodeData[];
    title: string;
    description?: string;
    progressPercentage: number;
    onSkipNode?: (nodeId: string) => void;
};

export default function RoadmapView({
    nodes,
    title,
    description,
    progressPercentage,
    onSkipNode
}: RoadmapViewProps) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    if (!nodes || nodes.length === 0) {
        return (
            <div className={`w-full py-16 rounded-3xl border border-dashed flex flex-col items-center justify-center liquid-glass ${
                isDark ? "border-white/10 text-white" : "border-stone-200 text-stone-900"
            }`}>
                <Rocket className="text-[#C5A059] mb-3" size={48} />
                <p className="font-medium text-stone-400">{t("roadmapPage.noData", "Chưa có dữ liệu lộ trình học tập")}</p>
            </div>
        );
    }

    const nodesByLevel = nodes.reduce((acc, node) => {
        const y = node.stageLevel;
        if (!acc[y]) acc[y] = [];
        acc[y].push(node);
        return acc;
    }, {} as Record<number, RoadmapNodeData[]>);

    const sortedLevels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);

    return (
        <div className={`w-full rounded-3xl overflow-hidden liquid-glass ${
            isDark ? "text-white" : "text-stone-900 shadow-md"
        }`}>
            {/* Header Section */}
            <div className={`p-8 md:p-12 relative overflow-hidden border-b ${
                isDark ? "border-white/10" : "border-stone-200"
            }`}>
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-[#C5A059]">
                    <Rocket size={200} />
                </div>
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start md:items-center justify-between relative z-10">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#C5A059] liquid-glass mb-4">
                            <Rocket size={14} /> {t("roadmapPage.startingPoint", "Điểm xuất phát")}
                        </span>
                        <h2 className={`font-serif font-bold text-3xl md:text-4xl mb-3 tracking-tight ${
                            isDark ? "text-white" : "text-stone-900"
                        }`}>{title}</h2>
                        {description && <p className={`text-base max-w-2xl ${isDark ? "text-stone-400" : "text-stone-600"}`}>{description}</p>}
                    </div>

                    <div className={`flex-shrink-0 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[160px] liquid-glass-gold ${
                        isDark ? "text-white" : "text-stone-900 shadow-sm"
                    }`}>
                        <div className="text-4xl font-black text-[#C5A059] mb-2">{progressPercentage}%</div>
                        <div className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            {t("roadmapPage.progress", "Tiến độ")}
                        </div>
                        <div className={`w-full h-1.5 rounded-full mt-3 overflow-hidden ${isDark ? "bg-white/10" : "bg-stone-200"}`}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-[#C5A059] rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div className="p-8 md:p-12 md:py-16">
                <div className="max-w-4xl mx-auto relative">
                    <div className={`absolute left-[25px] top-[10px] bottom-0 w-1.5 rounded-full hidden sm:block ${
                        isDark ? "bg-white/10" : "bg-stone-200"
                    }`} />

                    {sortedLevels.map((y, index) => {
                        const levelNodes = nodesByLevel[y];
                        const isCompletedLevel = levelNodes.every(n => n.status === RoadmapNodeStatus.COMPLETED || n.status === RoadmapNodeStatus.SKIPPED);
                        const isStartedLevel = levelNodes.some(n => n.status === RoadmapNodeStatus.COMPLETED || n.status === RoadmapNodeStatus.SKIPPED || n.status === RoadmapNodeStatus.UNLOCKED);
                        const isLocked = levelNodes.every(n => n.status === RoadmapNodeStatus.LOCKED);

                        return (
                            <div key={y} className="relative mb-16 last:mb-0 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 md:gap-8">
                                {/* Stage Checkpoint Node */}
                                <div className="relative z-10 flex-shrink-0 w-14 hidden sm:flex justify-center">
                                    <div className={`w-14 h-14 rounded-full border-[6px] flex items-center justify-center transition-colors shadow-sm ${
                                        isDark ? "border-[#080808]" : "border-[#F9F8F4]"
                                    } ${
                                        isCompletedLevel ? 'bg-emerald-500 text-white'
                                            : isStartedLevel && !isLocked ? 'bg-[#C5A059] text-[#080808]'
                                                : isDark ? 'bg-white/10 text-stone-500' : 'bg-stone-200 text-stone-400'
                                    }`}>
                                        {isCompletedLevel ? <Check strokeWidth={3.5} size={20} />
                                            : isLocked ? <Lock strokeWidth={2.5} size={18} />
                                                : <span className="font-black text-lg">{index + 1}</span>}
                                    </div>
                                </div>

                                {/* Node Content Container */}
                                <div className="flex-1 sm:pt-3 w-full">
                                    <div className="mb-6 flex items-center gap-4">
                                        <div className={`sm:hidden px-3 py-1 rounded-lg text-sm font-bold ${
                                            isDark ? "bg-white/10 text-stone-300" : "bg-stone-200 text-stone-700"
                                        }`}>
                                            {t("roadmapPage.step", "B")}{index + 1}
                                        </div>
                                        <h3 className={`font-bold text-xl md:text-2xl ${
                                            isLocked ? (isDark ? 'text-stone-600' : 'text-stone-400') : (isDark ? 'text-white' : 'text-stone-900')
                                        }`}>
                                            {t("roadmapPage.stage", "Giai đoạn")} {index + 1}
                                        </h3>
                                    </div>

                                    {/* Node Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                                        {levelNodes.map((node) => (
                                            <TimelineCard
                                                key={node.id}
                                                node={node}
                                                onSkip={() => onSkipNode && onSkipNode(node.id)}
                                                isDark={isDark}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Final Destination */}
                    <div className="relative mt-12 hidden sm:flex items-start gap-6 md:gap-8">
                        <div className="relative z-10 flex-shrink-0 w-14 flex justify-center">
                            <div className="w-10 h-10 rounded-full border-4 border-[#C5A059] bg-[#C5A059] text-[#080808] flex items-center justify-center shadow-lg">
                                <GraduationCap size={20} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="pt-1">
                            <h3 className={`font-serif font-bold text-xl tracking-tight ${
                                isDark ? "text-white" : "text-stone-900"
                            }`}>{t("roadmapPage.readyForAction", "Sẵn sàng thực chiến")}</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const TimelineCard = ({ node, onSkip, isDark }: { node: RoadmapNodeData; onSkip: () => void; isDark: boolean }) => {
    const { t } = useLanguage();
    const track = node.course.category?.slug || 'shared';
    const isLocked = node.status === RoadmapNodeStatus.LOCKED;
    const isCompleted = node.status === RoadmapNodeStatus.COMPLETED;
    const isSkipped = node.status === RoadmapNodeStatus.SKIPPED;

    let trackStyles = 'bg-stone-500/20 text-[#C5A059]';
    if (!isLocked) {
        if (track.includes('backend')) trackStyles = 'bg-sky-500/20 text-sky-400';
        else if (track.includes('frontend')) trackStyles = 'bg-indigo-500/20 text-indigo-400';
        else if (track.includes('ai')) trackStyles = 'bg-amber-500/20 text-[#C5A059]';
        else trackStyles = 'bg-violet-500/20 text-violet-400';
    }

    const CardContent = (
        <motion.div
            whileHover={!isLocked ? { y: -4, scale: 1.02 } : {}}
            className={`
                relative p-5 md:p-6 rounded-2xl transition-all duration-300 h-full flex flex-col group liquid-glass
                ${isLocked ? "opacity-50 cursor-not-allowed"
                    : isCompleted ? "border-emerald-500/40 shadow-sm"
                    : isSkipped ? "opacity-70"
                    : "hover:border-[#C5A059]/60 cursor-pointer shadow-md"
                }
            `}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${trackStyles}`}>
                    {track}
                </div>
                {isCompleted && (
                    <div className="text-emerald-400 bg-emerald-500/20 rounded-full p-1.5 animate-in zoom-in">
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                    </div>
                )}
                {isSkipped && (
                    <div className="text-stone-400 bg-stone-500/20 rounded-full p-1.5 animate-in zoom-in" title={t("roadmapPage.skipped", "Đã bỏ qua")}>
                        <SkipForward size={18} strokeWidth={2.5} />
                    </div>
                )}
                {!isCompleted && !isLocked && !isSkipped && (
                    <div className="text-stone-400 group-hover:text-[#C5A059] transition-colors">
                        <PlayCircle size={22} strokeWidth={2} />
                    </div>
                )}
            </div>

            <h4 className={`font-bold text-base md:text-lg mb-2 leading-snug ${
                isLocked || isSkipped ? (isDark ? 'text-stone-500' : 'text-stone-400') : (isDark ? 'text-white' : 'text-stone-900')
            }`}>
                {node.course.title}
            </h4>

            {/* If node is UNLOCKED, we can show a Skip button */}
            {node.status === RoadmapNodeStatus.UNLOCKED && (
                <div className="mt-auto pt-4 flex justify-end">
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSkip(); }}
                        className="text-xs font-medium text-stone-400 hover:text-[#C5A059] flex items-center gap-1 transition-colors"
                    >
                        <SkipForward size={14} /> {t("roadmapPage.skip", "Bỏ qua")}
                    </button>
                </div>
            )}
        </motion.div>
    );

    if (isLocked || isSkipped) {
        return CardContent;
    }

    return (
        <Link href={`/courses/${node.courseId}`} className="block h-full outline-none">
            {CardContent}
        </Link>
    );
};