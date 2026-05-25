"use client";

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Check, Rocket, GraduationCap, Lock, PlayCircle, SkipForward } from 'lucide-react';
import { RoadmapNodeStatus } from '@prisma/client';
import Link from 'next/link';

export type RoadmapNodeData = {
    id: string;
    stageLevel: number;
    status: RoadmapNodeStatus;
    courseId: string;
    course: {
        title: string;
        category?: { slug: string } | null;
        // slugUrl or similar if exists to link
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
    if (!nodes || nodes.length === 0) {
        return (
            <div className="w-full py-16 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center">
                <Rocket className="text-stone-300 mb-3" size={48} />
                <p className="text-stone-500 font-medium">Chưa có dữ liệu lộ trình học tập</p>
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
        <div className="w-full bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            {/* Header Section */}
            <div className="bg-stone-50/50 border-b border-stone-100 p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Rocket size={200} />
                </div>
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start md:items-center justify-between relative z-10">
                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest rounded-full mb-4">
                            <Rocket size={14} /> Điểm xuất phát
                        </span>
                        <h2 className="font-bold text-3xl md:text-4xl text-stone-900 mb-3 tracking-tight">{title}</h2>
                        {description && <p className="text-stone-500 text-base max-w-2xl">{description}</p>}
                    </div>

                    <div className="flex-shrink-0 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center justify-center min-w-[160px]">
                        <div className="text-4xl font-black text-indigo-600 mb-2">{progressPercentage}%</div>
                        <div className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Tiến độ</div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-indigo-600 rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Section */}
            <div className="p-8 md:p-12 md:py-16">
                <div className="max-w-4xl mx-auto relative">
                    <div className="absolute left-[25px] top-[10px] bottom-0 w-1.5 bg-stone-100 rounded-full hidden sm:block" />

                    {sortedLevels.map((y, index) => {
                        const levelNodes = nodesByLevel[y];
                        const isCompletedLevel = levelNodes.every(n => n.status === RoadmapNodeStatus.COMPLETED || n.status === RoadmapNodeStatus.SKIPPED);
                        const isStartedLevel = levelNodes.some(n => n.status === RoadmapNodeStatus.COMPLETED || n.status === RoadmapNodeStatus.SKIPPED || n.status === RoadmapNodeStatus.UNLOCKED);
                        
                        // We rely on the status determined by the backend
                        // If all are LOCKED, it's locked.
                        const isLocked = levelNodes.every(n => n.status === RoadmapNodeStatus.LOCKED);

                        return (
                            <div key={y} className="relative mb-16 last:mb-0 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 md:gap-8">
                                {/* Stage Checkpoint Node */}
                                <div className="relative z-10 flex-shrink-0 w-14 hidden sm:flex justify-center">
                                    <div className={`w-14 h-14 rounded-full border-[6px] border-white flex items-center justify-center transition-colors shadow-sm
                                        ${isCompletedLevel ? 'bg-green-500 text-white'
                                            : isStartedLevel && !isLocked ? 'bg-indigo-600 text-white'
                                                : 'bg-stone-200 text-stone-400'}
                                    `}>
                                        {isCompletedLevel ? <Check strokeWidth={3.5} size={20} />
                                            : isLocked ? <Lock strokeWidth={2.5} size={18} />
                                                : <span className="font-black text-lg">{index + 1}</span>}
                                    </div>
                                </div>

                                {/* Node Content Container */}
                                <div className="flex-1 sm:pt-3 w-full">
                                    <div className="mb-6 flex items-center gap-4">
                                        <div className="sm:hidden px-3 py-1 bg-stone-100 rounded-lg text-sm font-bold text-stone-500">
                                            B{index + 1}
                                        </div>
                                        <h3 className={`font-bold text-xl md:text-2xl ${isLocked ? 'text-stone-400' : 'text-stone-800'}`}>
                                            Giai đoạn {index + 1}
                                        </h3>
                                    </div>

                                    {/* Node Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                                        {levelNodes.map((node) => (
                                            <TimelineCard
                                                key={node.id}
                                                node={node}
                                                onSkip={() => onSkipNode && onSkipNode(node.id)}
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
                            <div className="w-10 h-10 rounded-full border-4 border-white bg-amber-400 text-white flex items-center justify-center shadow-sm">
                                <GraduationCap size={20} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div className="pt-1">
                            <h3 className="font-black text-stone-900 text-xl tracking-tight">Sẵn sàng thực chiến</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const TimelineCard = ({ node, onSkip }: { node: RoadmapNodeData, onSkip: () => void }) => {
    const track = node.course.category?.slug || 'shared';
    const isLocked = node.status === RoadmapNodeStatus.LOCKED;
    const isCompleted = node.status === RoadmapNodeStatus.COMPLETED;
    const isSkipped = node.status === RoadmapNodeStatus.SKIPPED;

    let trackStyles = 'bg-stone-100 text-stone-600';
    if (!isLocked) {
        if (track.includes('backend')) trackStyles = 'bg-sky-100 text-sky-700';
        else if (track.includes('frontend')) trackStyles = 'bg-indigo-100 text-indigo-700';
        else if (track.includes('ai')) trackStyles = 'bg-rose-100 text-rose-700';
        else trackStyles = 'bg-violet-100 text-violet-700';
    }

    const CardContent = (
        <motion.div
            whileHover={!isLocked ? { y: -4, scale: 1.02 } : {}}
            className={`
                relative p-5 md:p-6 rounded-2xl border-2 transition-all duration-200 h-full flex flex-col group
                ${isLocked ? "bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed"
                    : isCompleted ? "bg-green-50/30 border-green-200 shadow-sm"
                    : isSkipped ? "bg-stone-100 border-stone-300 opacity-80"
                    : "bg-white border-stone-200 hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-100 cursor-pointer"
                }
            `}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${trackStyles}`}>
                    {track}
                </div>
                {isCompleted && (
                    <div className="text-green-600 bg-green-100 rounded-full p-1.5 animate-in zoom-in">
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                    </div>
                )}
                {isSkipped && (
                    <div className="text-stone-500 bg-stone-200 rounded-full p-1.5 animate-in zoom-in" title="Đã bỏ qua">
                        <SkipForward size={18} strokeWidth={2.5} />
                    </div>
                )}
                {!isCompleted && !isLocked && !isSkipped && (
                    <div className="text-stone-300 group-hover:text-indigo-500 transition-colors">
                        <PlayCircle size={22} strokeWidth={2} />
                    </div>
                )}
            </div>

            <h4 className={`font-bold text-base md:text-lg mb-2 leading-snug ${isLocked || isSkipped ? 'text-stone-500' : 'text-stone-800'}`}>
                {node.course.title}
            </h4>

            {/* If node is UNLOCKED, we can show a Skip button */}
            {node.status === RoadmapNodeStatus.UNLOCKED && (
                <div className="mt-auto pt-4 flex justify-end">
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSkip(); }}
                        className="text-xs font-medium text-stone-400 hover:text-stone-600 flex items-center gap-1"
                    >
                        <SkipForward size={14} /> Bỏ qua
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