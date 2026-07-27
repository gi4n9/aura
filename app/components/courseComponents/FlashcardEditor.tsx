"use client";

import { useState } from "react";
import { Save, Sparkles, Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { updateLessonContent } from "@/app/actions/lesson-video";
import { generateFlashcards } from "@/app/actions/ai-lesson-content";

interface Flashcard {
    id: string;
    front: string;
    back: string;
}

export default function FlashcardEditor({ lessonId, initialFlashcards, transcript }: { lessonId: string, initialFlashcards?: Flashcard[], transcript?: string | null }) {
    const [flashcards, setFlashcards] = useState<Flashcard[]>(Array.isArray(initialFlashcards) && initialFlashcards.length > 0 ? initialFlashcards : []);

    const [isSaving, setIsSaving] = useState(false);

    // AI Generator States
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");

    const handleGenerate = async () => {
        if (!transcript) {
            toast.error("Không có Transcript để tạo thẻ ghi nhớ!");
            return;
        }
        setIsGenerating(true);
        setProgress(20);
        setStatusText("Đang phân tích video...");

        try {
            const res = await generateFlashcards(lessonId, transcript, false);
            if (res.success && res.data) {
                // Ensure IDs exist
                const cardsWithIds = res.data.map((card: any) => ({
                    id: card.id || Date.now().toString() + Math.random(),
                    front: card.front,
                    back: card.back
                }));
                // Nối thẻ mới sinh vào danh sách hiện tại hoặc ghi đè tùy ý, ở đây mình ghi đè cho sạch
                setFlashcards(cardsWithIds);
                setProgress(100);
                setStatusText("Hoàn tất!");
                toast.success("Thẻ ghi nhớ tự động tạo thành công!");

                setTimeout(() => {
                    setIsGenerating(false);
                    setProgress(0);
                }, 2000);
            } else {
                throw new Error(res.error || "Lỗi tạo Flashcards");
            }
        } catch (error: any) {
            setProgress(0);
            setStatusText(`Lỗi: ${error.message}`);
            toast.error(`Có lỗi xảy ra: ${error.message}`);
            setIsGenerating(false);
        }
    };

    const updateCard = (index: number, field: keyof Flashcard, value: string) => {
        const newCards = [...flashcards];
        newCards[index] = { ...newCards[index], [field]: value };
        setFlashcards(newCards);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateLessonContent(lessonId, { flashcards });
        setIsSaving(false);
        if (res.success) toast.success("Đã lưu bộ thẻ nhớ!");
        else toast.error("Lỗi lưu dữ liệu: " + res.error);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-orange-50 p-4 rounded-xl border border-orange-100 gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-orange-800">Bộ thẻ ghi nhớ (Flashcards)</h3>
                        <p className="text-sm text-orange-600">Giúp học viên ôn tập nhanh các thuật ngữ và định nghĩa quan trọng trong video.</p>
                    </div>
                </div>

                {transcript && (
                    <div className="flex flex-col gap-2 min-w-[250px] items-end md:items-stretch">
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`flex flex-1 justify-center items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm text-sm ${isGenerating ? "bg-orange-200 text-orange-600 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                            >
                                <Sparkles size={16} /> {isGenerating ? "AI đang làm việc..." : "Tạo bằng AI (Groq)"}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex justify-center items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-70 transition-all font-bold shadow-sm text-sm whitespace-nowrap"
                            >
                                <Save size={16} /> {isSaving ? "Đang lưu..." : `Lưu (${flashcards.length})`}
                            </button>
                        </div>
                        {isGenerating && (
                            <div className="w-full">
                                <div className="flex justify-between text-xs font-semibold text-orange-700 mb-1">
                                    <span>{statusText}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-orange-200 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {flashcards.map((card, index) => (
                    <div key={index} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden group">
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Mặt trước (Thuật ngữ)</label>
                                <input
                                    type="text"
                                    value={card.front}
                                    onChange={(e) => updateCard(index, "front", e.target.value)}
                                    className="w-full p-2 text-sm bg-stone-50 border border-stone-200 text-stone-900 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition-all font-semibold"
                                    placeholder="Ví dụ: AI"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Mặt sau (Định nghĩa)</label>
                                <textarea
                                    value={card.back}
                                    onChange={(e) => updateCard(index, "back", e.target.value)}
                                    rows={3}
                                    className="w-full p-2 text-sm bg-stone-50 border border-stone-200 text-stone-900 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none resize-none transition-all"
                                    placeholder="Ví dụ: Trí tuệ nhân tạo..."
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Nút thêm Card */}
                <button
                    onClick={() => setFlashcards([...flashcards, { id: Date.now().toString(), front: "", back: "" }])}
                    className="min-h-[250px] border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:bg-stone-50 hover:text-orange-500 hover:border-orange-200 transition-all gap-2"
                >
                    <Plus size={32} />
                    <span className="font-medium">Thêm thẻ mới</span>
                </button>
            </div>
        </div>
    );
}