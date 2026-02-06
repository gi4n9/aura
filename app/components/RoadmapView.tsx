"use client";

import { ReactFlow, Background, Controls, MiniMap, Node, Edge, useNodesState, useEdgesState, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Lock } from 'lucide-react';

// Custom Node Component
const RoadmapNode = ({ data }: { data: any }) => {
    const isCompleted = data.isCompleted;
    const isLocked = data.isLocked;
    const isHighlight = data.isHighlight;

    return (
        <div className={`
            px-4 py-3 rounded-xl border-2 shadow-sm transition-all min-w-[140px] text-center
            ${isCompleted
                ? "bg-green-50 border-green-300 text-green-700"
                : isLocked
                    ? "bg-stone-100/50 border-stone-200 text-stone-400"
                    : isHighlight
                        ? "bg-[#C5A059] border-[#C5A059] text-white font-bold shadow-lg"
                        : "bg-white border-stone-200 text-stone-800 hover:border-[#C5A059] hover:shadow-md"
            }
        `}>
            <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-stone-300" />

            <div className="flex items-center justify-center gap-2">
                {isCompleted && <CheckCircle size={16} className="text-green-500" />}
                {isLocked && <Lock size={14} />}
                <span className="text-sm font-medium">{data.label}</span>
            </div>

            {data.estimatedHours && (
                <div className="text-[10px] mt-1 opacity-70">
                    ~{data.estimatedHours}h
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-stone-300" />
        </div>
    );
};

const nodeTypes = {
    roadmapNode: RoadmapNode,
};

type RoadmapViewProps = {
    initialNodes: Node[];
    initialEdges: Edge[];
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
    // Safety check
    if (!initialNodes || !initialEdges) {
        return (
            <div className="w-full h-[400px] bg-stone-50 rounded-2xl border border-dashed border-stone-300 flex items-center justify-center">
                <p className="text-stone-400">Không có dữ liệu roadmap</p>
            </div>
        );
    }

    // Process nodes to add completion status
    const processedNodes = initialNodes.map(node => ({
        ...node,
        type: 'roadmapNode',
        data: {
            ...node.data,
            isCompleted: completedNodeIds.includes(node.id),
            isHighlight: node.className?.includes('C5A059') || node.className?.includes('highlight'),
        }
    }));

    const [nodes, , onNodesChange] = useNodesState(processedNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    return (
        <div className="w-full h-[600px] bg-[#FAFAF9] rounded-2xl border border-stone-200 overflow-hidden relative">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-10">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-stone-200 shadow-sm max-w-xs"
                >
                    <h1 className="font-serif font-bold text-xl text-stone-900">{title}</h1>
                    {description && (
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{description}</p>
                    )}
                </motion.div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10">
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-stone-200 shadow-sm flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-[#C5A059]" />
                        <span className="text-stone-600">Quan trọng</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <CheckCircle size={12} className="text-green-500" />
                        <span className="text-stone-600">Hoàn thành</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-stone-200" />
                        <span className="text-stone-600">Chưa học</span>
                    </div>
                </div>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => onNodeClick?.(node.id)}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                attributionPosition="bottom-right"
                className="bg-[#FAFAF9]"
                defaultEdgeOptions={{
                    style: { stroke: '#d4d4d4', strokeWidth: 2 },
                    animated: false
                }}
            >
                <Background color="#E7E5E4" gap={24} size={1} />
                <Controls
                    className="bg-white border-stone-200 shadow-sm rounded-lg overflow-hidden"
                    showInteractive={false}
                />
                <MiniMap
                    className="border border-stone-200 shadow-sm rounded-lg overflow-hidden"
                    maskColor="rgba(249, 248, 244, 0.8)"
                    nodeColor={(node) => {
                        if (completedNodeIds.includes(node.id)) return '#22c55e';
                        if (node.className?.includes('C5A059')) return '#C5A059';
                        return '#e5e5e5';
                    }}
                    style={{ width: 150, height: 100 }}
                />
            </ReactFlow>
        </div>
    );
}
