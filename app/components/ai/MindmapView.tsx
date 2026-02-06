"use client";

import { useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Position,
    Node,
    Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Clock } from 'lucide-react';

interface MindmapViewProps {
    data: { nodes: Node[]; edges: Edge[] } | null;
    onSeek: (seconds: number) => void;
}

// Custom Node Component to show Label + Timestamp
const CustomNode = ({ data }: any) => {
    return (
        <div className="px-4 py-2 shadow-md rounded-xl bg-white border-2 border-stone-200 min-w-[150px] text-center hover:border-[#C5A059] transition-colors group cursor-pointer">
            <div className="font-bold text-stone-800 text-sm">{data.label}</div>
            {data.timestamp !== undefined && (
                <div className="flex items-center justify-center gap-1 text-[10px] text-stone-400 mt-1 font-mono group-hover:text-[#C5A059]">
                    <Clock size={10} />
                    {new Date(data.timestamp * 1000).toISOString().substr(14, 5)}
                </div>
            )}
        </div>
    );
};

const nodeTypes = {
    default: CustomNode,
    input: CustomNode, // Re-use same style for root
};

export default function MindmapView({ data, onSeek }: MindmapViewProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Simple Tree Layout Algorithm
    const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
        if (!nodes.length) return { nodes: [], edges: [] };

        const nodeWidth = 180;
        const nodeHeight = 80;
        const levelHeight = 150; // Vertical spacing

        // Filter nodes by levels (this assumes edges go Parent -> Child)
        // Find Root (nodes with no incoming edges) - simplified assumption
        // Actually, let's just use the `traverse` logic from backend or recalculate here.

        // Let's assume the backend sent a flat list. We need to reconstruct hierarchy for layout.
        // Or simpler: BFS to assign levels and x-positions.

        const hierarchy: Record<string, { level: number, indexInLevel: number, children: string[] }> = {};
        const levels: Record<number, string[]> = {};

        // Initialize
        nodes.forEach(n => {
            hierarchy[n.id] = { level: 0, indexInLevel: 0, children: [] };
        });

        // Build parent-child
        edges.forEach(e => {
            if (hierarchy[e.source]) {
                hierarchy[e.source].children.push(e.target);
            }
        });

        // Find roots (nodes not target of any edge)
        const targets = new Set(edges.map(e => e.target));
        const roots = nodes.filter(n => !targets.has(n.id));

        // BFS to assign levels
        const queue = roots.map(r => ({ ...r, level: 0 }));
        const visited = new Set<string>();

        while (queue.length > 0) {
            const node = queue.shift()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);

            const level = hierarchy[node.id]?.level || 0; // Should be set by parent push
            if (!levels[level]) levels[level] = [];
            levels[level].push(node.id);

            // Enqueue children
            const children = hierarchy[node.id].children;
            children.forEach(childId => {
                hierarchy[childId].level = level + 1;
                queue.push({ id: childId, level: level + 1 } as any);
            });
        }

        // Assign X, Y positions
        return {
            nodes: nodes.map(node => {
                const level = hierarchy[node.id]?.level || 0;
                const siblings = levels[level] || [];
                const index = siblings.indexOf(node.id);

                // Centering logic
                const totalWidth = siblings.length * nodeWidth;
                const x = (index * nodeWidth) - (totalWidth / 2);
                const y = level * levelHeight;

                return { ...node, position: { x, y } };
            }),
            edges
        };
    };

    useEffect(() => {
        if (data) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(data.nodes, data.edges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        }
    }, [data, setNodes, setEdges]);

    const onNodeClick = useCallback((_: any, node: Node) => {
        if (node.data.timestamp) {
            onSeek(node.data.timestamp as number);
        }
    }, [onSeek]);

    if (!data) return (
        <div className="h-full flex flex-col items-center justify-center text-stone-400 p-8 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <Clock size={32} />
            </div>
            <p className="font-bold text-stone-600">Chưa có Mindmap</p>
            <p className="text-sm">Video này chưa được tạo Mindmap AI.</p>
        </div>
    );

    return (
        <div className="w-full h-full bg-[#F9F8F4]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.5 }}
                minZoom={0.1}
            >
                <Background color="#ccc" gap={20} size={1} />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
