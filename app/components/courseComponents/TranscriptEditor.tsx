"use client";

import { useState, useEffect } from "react";
import { Save, FileText, Zap, Loader2, Database, Clock, Play } from "lucide-react";
import { toast } from "sonner";
import { updateLessonContent, getLessonTranscript } from "@/app/actions/lesson-video";
import { processLessonEmbeddings, checkLessonEmbeddings } from "@/app/actions/video-chat";

export default function TranscriptEditor({ lessonId, initialTranscript }: { lessonId: string, initialTranscript?: string | null }) {
    const isProcessingStr = initialTranscript?.startsWith("PROCESSING:") || initialTranscript === "Đang được AI xử lý ngầm...";
    const [transcript, setTranscript] = useState(isProcessingStr ? "" : (initialTranscript || ""));
    const [timeline, setTimeline] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isEmbedding, setIsEmbedding] = useState(false);
    const [hasEmbeddings, setHasEmbeddings] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(isProcessingStr);

    // Tự động polling để nạp Transcript & Timeline (TỰ ĐỘNG DỪNG KHI XỬ LÝ XONG)
    useEffect(() => {
        let isMounted = true;

        const isStillProcessing = initialTranscript?.startsWith("PROCESSING:") || initialTranscript === "Đang được AI xử lý ngầm...";
        if (!isStillProcessing && initialTranscript) {
            setTranscript(initialTranscript);
            setIsAiProcessing(false);
        }
        
        const fetchLatestTranscript = async () => {
            const res = await getLessonTranscript(lessonId);
            if (!isMounted) return;

            if (res?.success) {
                if (res.timeline && Array.isArray(res.timeline)) {
                    setTimeline(res.timeline);
                }
                if (!res.isProcessing && res.transcript) {
                    setTranscript(res.transcript);
                    setIsAiProcessing(false);
                } else if (res.isProcessing) {
                    setIsAiProcessing(true);
                }
            }
        };

        fetchLatestTranscript();
        checkLessonEmbeddings(lessonId).then(res => isMounted && setHasEmbeddings(res.hasEmbeddings));

        // DỪNG POLLING HOÀN TOÀN khi bài học đã có transcript và không còn xử lý ngầm
        if (isAiProcessing || !transcript) {
            const intervalId = setInterval(() => {
                fetchLatestTranscript();
                checkLessonEmbeddings(lessonId).then(res => isMounted && setHasEmbeddings(res.hasEmbeddings));
            }, 4000);

            return () => {
                isMounted = false;
                clearInterval(intervalId);
            };
        }

        return () => {
            isMounted = false;
        };
    }, [lessonId, initialTranscript, isAiProcessing, transcript]);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateLessonContent(lessonId, { transcript, timeline });
        setIsSaving(false);
        if (res.success) toast.success("Đã lưu bản dịch văn bản & Timeline!");
        else toast.error("Lỗi: " + res.error);
    };

    const handleGenerateEmbeddings = async () => {
        setIsEmbedding(true);
        toast.info("Đang xử lý nội dung để tạo AI Embeddings...");

        // Ensure latest transcript is saved first
        await updateLessonContent(lessonId, { transcript, timeline });

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
                    {isAiProcessing && (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 animate-pulse">
                            <Loader2 size={14} className="animate-spin" /> ⏳ AI đang hoàn tất bóc băng văn bản...
                        </div>
                    )}

                    {!isAiProcessing && hasEmbeddings && (
                        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                            <Database size={14} /> Đã có Dữ liệu Vector
                        </div>
                    )}

                    {!isAiProcessing && !hasEmbeddings && (
                        <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                            <Database size={14} /> Chưa có AI Embeddings
                        </div>
                    )}

                    <button
                        onClick={handleGenerateEmbeddings}
                        disabled={isEmbedding || isSaving || !transcript || isAiProcessing}
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
                rows={16}
                className="w-full p-6 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all shadow-inner text-stone-700 leading-relaxed font-sans"
                placeholder={isAiProcessing ? "⏳ AI đang phân tích âm thanh và bóc băng văn bản bài giảng... Vui lòng chờ vài giây..." : "Nội dung video sẽ hiển thị ở đây. Hãy nhập Transcript để huấn luyện AI Chatbot..."}
            />

            {/* Section Timeline Mốc thời gian được AI sinh tự động */}
            {timeline && timeline.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-[#C5A059] rounded-lg border border-amber-100">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-lg">Mốc thời gian Timeline ({timeline.length} mốc)</h3>
                                <p className="text-xs text-stone-500">Các mốc thời gian tự động được AI sinh từ video giúp học viên dễ dàng theo dõi.</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                            ✨ AI Generated
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {timeline.map((item: any, idx: number) => {
                            const mins = Math.floor((item.time || 0) / 60);
                            const secs = Math.floor((item.time || 0) % 60);
                            const formattedTime = `${mins}:${secs.toString().padStart(2, "0")}`;
                            return (
                                <div key={idx} className="flex items-start gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 hover:border-[#C5A059] transition-all group">
                                    <div className="flex items-center gap-1.5 bg-[#C5A059] text-white font-mono text-xs font-bold px-2.5 py-1.5 rounded-lg shrink-0 group-hover:bg-[#b08d4b] transition-colors shadow-sm">
                                        <Play size={10} className="fill-white" />
                                        {formattedTime}
                                    </div>
                                    <p className="text-sm font-medium text-stone-800 leading-snug pt-0.5">{item.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-white rounded-full shadow-lg hover:bg-[#b08d4b] disabled:opacity-70 transition-transform hover:scale-105 active:scale-95 font-bold"
                >
                    <Save size={20} /> {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
            </div>
        </div>
    );
}