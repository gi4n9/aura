"use client";

import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';

type RoadmapViewProps = {
    initialNodes: Node[];
    initialEdges: Edge[];
    title: string;
};

export default function RoadmapView({ initialNodes, initialEdges, title }: RoadmapViewProps) {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    // Custom Node Styles could be defined here or via className in the nodes themselves (which we did in the service)

    return (
        <div className="w-full h-[calc(100vh-80px)] bg-[#F9F8F4] relative">
            <div className="absolute top-4 left-4 z-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/80 backdrop-blur-md p-4 rounded-xl border border-stone-200 shadow-sm"
                >
                    <h1 className="font-serif font-bold text-2xl text-stone-900">{title}</h1>
                    <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Personalized Learning Mindmap</p>
                </motion.div>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                attributionPosition="bottom-right"
                className="bg-[#F9F8F4]"
            >
                <Background color="#E7E5E4" gap={20} />
                <Controls className="bg-white border-stone-200 shadow-sm text-stone-600" />
                <MiniMap className="border border-stone-200 shadow-sm" maskColor="#F9F8F0" nodeColor="#C5A059" />
            </ReactFlow>
        </div>
    );
}
