"use client";

import { useState, useCallback } from "react";
import ReactFlow, {
    Background, Controls, MiniMap,
    applyNodeChanges, applyEdgeChanges,
    Node, Edge, NodeChange, EdgeChange
} from "reactflow";
import "reactflow/dist/style.css";
import { Save, Sparkles, Network } from "lucide-react";
import { toast } from "sonner";
import { updateLessonContent } from "@/app/actions/lesson-video";
import { generateMindmap } from "@/app/actions/ai-lesson-content";
import dagre from "dagre";

interface MindMapData {
    nodes: Node[];
    edges: Edge[];
}

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

    nodes.forEach((node) => {
        // Kích thước ước lượng của node để Dagre tính toán (180px rộng, 60px cao)
        dagreGraph.setNode(node.id, { width: 180, height: 60 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const newNode = { ...node };

        // Cập nhật vị trí
        newNode.position = {
            x: nodeWithPosition.x - 90,
            y: nodeWithPosition.y - 30,
        };
        // Setup source/target handle properties for LR direction in ReactFlow
        // Direction LR means source is right, target is left
        newNode.sourcePosition = 'right' as any;
        newNode.targetPosition = 'left' as any;

        return newNode;
    });

    return { nodes: layoutedNodes, edges };
};

export default function MindMapEditor({ lessonId, initialMindMap, transcript }: { lessonId: string, initialMindMap?: MindMapData, transcript?: string | null }) {
    const [nodes, setNodes] = useState<Node[]>(initialMindMap?.nodes || []);
    const [edges, setEdges] = useState<Edge[]>(initialMindMap?.edges || []);
    const [isSaving, setIsSaving] = useState(false);

    // AI Generator States
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");

    const handleGenerate = async () => {
        if (!transcript) {
            toast.error("Không có Transcript để tạo sơ đồ tư duy!");
            return;
        }
        setIsGenerating(true);
        setProgress(20);
        setStatusText("Đang phân tích video...");

        try {
            const res = await generateMindmap(lessonId, transcript, false);
            if (res.success && res.data) {
                // Áp dụng thuật toán sắp xếp tự động Dagre
                const layouted = getLayoutedElements(res.data.nodes, res.data.edges);
                setNodes(layouted.nodes);
                setEdges(layouted.edges);

                setProgress(100);
                setStatusText("Hoàn tất!");
                toast.success("Sơ đồ tư duy AI đã được tạo thành công!");

                setTimeout(() => {
                    setIsGenerating(false);
                    setProgress(0);
                }, 2000);
            } else {
                throw new Error(res.error || "Lỗi tạo Mindmap");
            }
        } catch (error: any) {
            setProgress(0);
            setStatusText(`Lỗi: ${error.message}`);
            toast.error(`Có lỗi xảy ra: ${error.message}`);
            setIsGenerating(false);
        }
    };

    const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateLessonContent(lessonId, { mindMapData: { nodes, edges } });
        setIsSaving(false);
        if (res.success) toast.success("Đã lưu sơ đồ tư duy!");
        else toast.error("Lỗi lưu dữ liệu: " + res.error);
    };

    const handleAutoLayout = () => {
        const layouted = getLayoutedElements(nodes, edges);
        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);
        toast.success("Đã sắp xếp tự động sơ đồ tư duy!");
    };

    return (
        <div className="flex flex-col h-[650px] relative">
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-3 rounded-xl shadow-sm border border-stone-200">
                <h3 className="font-bold text-purple-800 flex items-center gap-2">
                    <Network size={18} /> Sơ đồ tư duy
                </h3>
                <p className="text-xs text-stone-500 mt-1 max-w-[250px]">
                    Kéo thả để sắp xếp. Nhấp đúp vào node (nút) để chỉnh sửa nội dung.
                </p>
            </div>

            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={handleAutoLayout}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-all text-sm font-medium shadow-sm"
                    >
                        Tự động sắp xếp
                    </button>
                    {transcript && (
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-md ${isGenerating ? "bg-purple-300 text-purple-800 cursor-not-allowed" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                        >
                            <Sparkles size={16} /> {isGenerating ? "Đang tạo..." : "Tạo bằng AI (Groq)"}
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-all text-sm font-medium shadow-md"
                    >
                        <Save size={16} /> Lưu
                    </button>
                </div>
                {/* Progress UI */}
                {isGenerating && (
                    <div className="w-64 bg-white/95 p-3 rounded-lg shadow-md border border-purple-100 flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-semibold text-purple-700">
                            <span>{statusText}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-stone-50 rounded-xl overflow-hidden border border-stone-200">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    className="bg-stone-50"
                >
                    <Background color="#d6d3d1" gap={16} />
                    <Controls />
                    <MiniMap zoomable pannable nodeColor="#e7e5e4" maskColor="rgba(245, 245, 244, 0.7)" />
                </ReactFlow>
            </div>
        </div>
    );
}