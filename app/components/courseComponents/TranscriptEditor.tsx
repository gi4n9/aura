"use client";

import { useState } from "react";
import { Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { updateLessonContent } from "@/app/actions/lesson-video";

export default function TranscriptEditor({ lessonId, initialTranscript }: { lessonId: string, initialTranscript?: string | null }) {
    const [transcript, setTranscript] = useState(initialTranscript || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateLessonContent(lessonId, { transcript });
        setIsSaving(false);
        if (res.success) toast.success("Đã lưu bản dịch văn bản!");
        else toast.error("Lỗi: " + res.error);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                    <FileText className="text-blue-600" />
                    <div>
                        <h3 className="font-bold text-blue-800">Transcript Video (Bản chép lời)</h3>
                        <p className="text-sm text-blue-600">Nội dung này giúp học viên theo dõi video dễ dàng hơn và tăng cường SEO.</p>
                    </div>
                </div>
            </div>

            <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={20}
                className="w-full p-6 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all shadow-inner text-stone-700 leading-relaxed"
                placeholder="Nội dung video sẽ hiển thị ở đây..."
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