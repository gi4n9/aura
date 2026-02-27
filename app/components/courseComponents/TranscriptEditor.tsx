"use client";

import { useState, useEffect } from "react";
import { Save, FileText, Zap, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { updateLessonContent } from "@/app/actions/lesson-video";
import { processLessonEmbeddings, checkLessonEmbeddings } from "@/app/actions/video-chat";

export default function TranscriptEditor({ lessonId, initialTranscript }: { lessonId: string, initialTranscript?: string | null }) {
    const [transcript, setTranscript] = useState(initialTranscript || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isEmbedding, setIsEmbedding] = useState(false);
    const [hasEmbeddings, setHasEmbeddings] = useState(false);

    // Initial check for existing embeddings
    useEffect(() => {
        checkLessonEmbeddings(lessonId).then(res => setHasEmbeddings(res.hasEmbeddings));
    }, [lessonId]);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateLessonContent(lessonId, { transcript });
        setIsSaving(false);
        if (res.success) toast.success("Đã lưu bản dịch văn bản!");
        else toast.error("Lỗi: " + res.error);
    };

    const handleGenerateEmbeddings = async () => {
        setIsEmbedding(true);
        toast.info("Đang xử lý nội dung để tạo AI Embeddings...");

        // Ensure latest transcript is saved first
        await updateLessonContent(lessonId, { transcript });

        const res = await processLessonEmbeddings(lessonId);
        setIsEmbedding(false);

        if (res.success) {
            toast.success(`Tạo thành công ${res.count} đoạn vectors cho RAG!`);
            setHasEmbeddings(true);
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <FileText className="text-blue-600" />
                    <div>
                        <h3 className="font-bold text-blue-800">Transcript Video (Bản chép lời)</h3>
                        <p className="text-sm text-blue-600">Nội dung này giúp học viên theo dõi video dễ dàng hơn và tăng cường SEO.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:items-center py-2 md:py-0 w-full md:w-auto">
                    {hasEmbeddings ? (
                        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                            <Database size={14} /> Đã có Dữ liệu Vector
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                            <Database size={14} /> Chưa có AI Embeddings
                        </div>
                    )}

                    <button
                        onClick={handleGenerateEmbeddings}
                        disabled={isEmbedding || isSaving || !transcript}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg shadow-sm hover:bg-stone-900 disabled:opacity-50 transition-colors text-sm font-bold w-full md:w-auto justify-center"
                    >
                        {isEmbedding ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="text-[#C5A059]" />}
                        {isEmbedding ? "Đang tạo Vector..." : "Huấn luyện AI (RAG)"}
                    </button>
                </div>
            </div>

            <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={20}
                className="w-full p-6 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all shadow-inner text-stone-700 leading-relaxed"
                placeholder="Nội dung video sẽ hiển thị ở đây. Hãy nhập Transcript để huấn luyện AI Chatbot..."
            />

            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-white rounded-full shadow-lg hover:bg-[#b08d4b] disabled:opacity-70 transition-transform hover:scale-105 active:scale-95 font-bold"
                >
                    <Save size={20} /> {isSaving ? "Đang lưu..." : "Lưu Transcript"}
                </button>
            </div>
        </div>
    );
}