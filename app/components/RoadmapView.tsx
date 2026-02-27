"use client";

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Check, Rocket, GraduationCap } from 'lucide-react';

type RoadmapViewProps = {
    initialNodes: any[];
    initialEdges: any[];
    title: string;
    description?: string;
    completedNodeIds?: string[];
    onNodeClick?: (nodeId: string) => void;
};

export default function RoadmapView({
    initialNodes,
    initialEdges,
    title,
    description,
    completedNodeIds = [],
    onNodeClick
}: RoadmapViewProps) {
    if (!initialNodes || initialNodes.length === 0) {
        return (
            <div className="w-full py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300 flex items-center justify-center">
                <p className="text-stone-400 font-medium">Không có dữ liệu lộ trình</p>
            </div>
        );
    }

    // Group nodes by Y position to create logical sequential stages
    const nodesByLevel = initialNodes.reduce((acc, node) => {
        const y = node.position?.y || 0;
        if (!acc[y]) acc[y] = [];
        acc[y].push(node);
        return acc;
    }, {} as Record<number, any[]>);

    const sortedLevels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);
    const totalNodes = initialNodes.length;
    const completedCount = initialNodes.filter(n => completedNodeIds.includes(n.id)).length;
    const progress = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

    return (
        <div className="w-full bg-[#FAFAF9] rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            {/* Header Area */}
            <div className="bg-white border-b border-stone-200 p-8 md:p-12">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-[#C5A059] text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                            <Rocket size={14} />
                            Lộ trình học tập
                        </div>
                        <h2 className="font-serif font-bold text-3xl md:text-4xl text-stone-900 mb-3 leading-tight">{title}</h2>
                        {description && <p className="text-stone-500 text-lg">{description}</p>}
                    </div>

                    {/* Progress Circle */}
                    <div className="flex-shrink-0 bg-stone-50 p-6 rounded-2xl border border-stone-100 flex flex-col items-center justify-center min-w-[140px]">
                        <div className="text-3xl font-bold text-[#C5A059] mb-1">{progress}%</div>
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Hoàn thành</div>
                    </div>
                </div>
            </div>

            {/* Timeline Area (Syllabus style) */}
            <div className="p-8 md:p-12">
                <div className="max-w-3xl mx-auto relative">
                    {/* Vertical Connecting Line */}
                    <div className="absolute left-[23px] top-[10px] bottom-[10px] w-1 bg-stone-200 rounded-full hidden sm:block" />

                    {sortedLevels.map((y, index) => {
                        const levelNodes = nodesByLevel[y];
                        const isCompletedLevel = levelNodes.every((n: any) => completedNodeIds.includes(n.id));
                        const isStartedLevel = levelNodes.some((n: any) => completedNodeIds.includes(n.id));

                        return (
                            <div key={y} className="relative sm:pl-16 mb-12 last:mb-0">
                                {/* Step Circle Indicator */}
                                <div className={`hidden sm:flex absolute left-0 top-1 w-12 h-12 rounded-full border-4 items-center justify-center z-10 transition-colors shadow-sm
                                    ${isCompletedLevel
                                        ? 'bg-[#22c55e] border-green-100 text-white'
                                        : isStartedLevel
                                            ? 'bg-[#C5A059] border-amber-100 text-white'
                                            : 'bg-white border-stone-200 text-stone-300'
                                    }
                                `}>
                                    {isCompletedLevel ? (
                                        <Check strokeWidth={3} size={20} />
                                    ) : (
                                        <span className={`font-bold text-lg ${isStartedLevel ? 'text-white' : 'text-stone-400'}`}>{index + 1}</span>
                                    )}
                                </div>

                                {/* Content Tag */}
                                <div className="mb-4 pt-2 flex flex-wrap items-center gap-3">
                                    <h3 className="font-bold text-stone-800 text-lg flex items-center gap-2">
                                        <span className="sm:hidden text-[#C5A059]">B{index + 1}.</span> Giai đoạn {index + 1}
                                    </h3>
                                    <div className="h-px bg-stone-200 flex-1 min-w-[100px] hidden sm:block"></div>
                                </div>

                                {/* Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                    {levelNodes.map((node: any) => (
                                        <TimelineCard
                                            key={node.id}
                                            node={node}
                                            isCompleted={completedNodeIds.includes(node.id)}
                                            onClick={() => onNodeClick && onNodeClick(node.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {/* End Goal Cup */}
                    <div className="relative sm:pl-16 mt-8 hidden sm:block">
                        <div className="absolute left-0 top-0 w-12 h-12 rounded-full border-4 bg-stone-50 border-stone-200 text-stone-300 flex items-center justify-center z-10">
                            <GraduationCap size={20} />
                        </div>
                        <div className="pt-3">
                            <h3 className="font-bold text-stone-400 text-lg uppercase tracking-wide">Sẵn sàng làm việc</h3>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

const TimelineCard = ({ node, isCompleted, onClick }: { node: any, isCompleted: boolean, onClick: () => void }) => {

    // Determine vibrant colors based on track
    const track = node.data?.track || 'shared';
    let trackStyles = 'bg-stone-100 text-stone-600';
    let borderHover = 'hover:border-stone-400 hover:shadow-stone-200/50';

    if (track === 'backend') {
        trackStyles = 'bg-emerald-100 text-emerald-700';
        borderHover = 'hover:border-emerald-400 hover:shadow-emerald-200/50';
    } else if (track === 'frontend') {
        trackStyles = 'bg-indigo-100 text-indigo-700';
        borderHover = 'hover:border-indigo-400 hover:shadow-indigo-200/50';
    } else if (track === 'ai') {
        trackStyles = 'bg-rose-100 text-rose-700';
        borderHover = 'hover:border-rose-400 hover:shadow-rose-200/50';
    } else {
        trackStyles = 'bg-amber-100 text-amber-700';
        borderHover = 'hover:border-[#C5A059] hover:shadow-[#C5A059]/30';
    }

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={onClick}
            className={`
                relative p-5 rounded-2xl border-2 transition-all duration-300 shadow-sm flex flex-col h-full cursor-pointer
                ${isCompleted
                    ? "bg-green-50/50 border-green-200 hover:border-green-400"
                    : `bg-white border-stone-100 ${borderHover}`
                }
            `}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${trackStyles}`}>
                    {track}
                </div>

                {isCompleted && (
                    <div className="text-green-500 bg-green-100 rounded-full p-1 animate-in zoom-in duration-300">
                        <CheckCircle2 size={16} />
                    </div>
                )}
            </div>

            <h4 className={`font-bold text-[17px] mb-2 leading-tight ${isCompleted ? 'text-green-900' : 'text-stone-800'}`}>
                {node.data?.label || node.id}
            </h4>

            {node.data?.estimatedHours && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium mt-auto pt-3 border-t border-stone-100/80">
                    <Clock size={14} className={isCompleted ? 'text-green-400' : 'text-stone-400'} />
                    <span>Khoảng <strong>{node.data.estimatedHours}h</strong> học</span>
                </div>
            )}
        </motion.div>
    );
};
