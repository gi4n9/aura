"use client";

import { useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Position,
    Handle,
    Panel,
    Node,
    Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Clock, Network } from 'lucide-react';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 180, height: 60 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const newNode = { ...node };

        newNode.position = {
            x: nodeWithPosition.x - 90,
            y: nodeWithPosition.y - 30,
        };
        newNode.sourcePosition = 'right' as any;
        newNode.targetPosition = 'left' as any;
        return newNode;
    });

    return { nodes: layoutedNodes, edges };
};

interface MindmapViewProps {
    data: { nodes: Node[]; edges: Edge[] } | null;
    onSeek: (seconds: number) => void;
}

// Custom Node Component to show Label + Timestamp
const CustomNode = ({ data, type }: any) => {
    return (
        <div className="px-4 py-2 shadow-md rounded-xl bg-white border-2 border-stone-200 min-w-[150px] text-center hover:border-[#C5A059] transition-colors group cursor-pointer relative">
            {/* Chỉ thêm Handle Target (đầu nhận) nếu không phải là node Root (node gốc) */}
            {type !== 'input' && (
                <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-[#C5A059] border-none" />
            )}

            <div className="font-bold text-stone-800 text-sm">{data.label}</div>

            {data.timestamp !== undefined && data.timestamp !== null && (
                <div className="flex items-center justify-center gap-1 text-[10px] text-stone-400 mt-1 font-mono group-hover:text-[#C5A059]">
                    <Clock size={10} />
                    {new Date(data.timestamp * 1000).toISOString().substr(14, 5)}
                </div>
            )}

            {/* Thêm Handle Source (đầu phát) để kết nối đi */}
            <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-[#C5A059] border-none" />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

export default function MindmapView({ data, onSeek }: MindmapViewProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    useEffect(() => {
        if (data && data.nodes && data.edges) {
            const mappedNodes = data.nodes.map((n: Node) => ({ ...n, type: 'custom' }));
            // Ngay lúc mount, tự động format layout bằng Dagre luôn
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(mappedNodes, data.edges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        }
    }, [data, setNodes, setEdges]);

    const onLayout = useCallback(() => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
        setNodes([...layoutedNodes]);
        setEdges([...layoutedEdges]);
    }, [nodes, edges]);

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
                <Panel position="top-right" className="flex gap-2">
                    <button
                        onClick={onLayout}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-stone-600 rounded-lg shadow-sm border border-stone-200 hover:bg-stone-50 hover:text-[#C5A059] transition-all font-medium text-sm"
                    >
                        <Network size={16} /> Tự động sắp xếp
                    </button>
                </Panel>
            </ReactFlow>
        </div>
    );
}
