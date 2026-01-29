"use client";

import { useState } from "react";
import { Plus, Trash2, Save, CheckCircle } from "lucide-react";
import { saveLessonQuestions } from "@/app/actions/question";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Định nghĩa kiểu dữ liệu
interface QuestionData {
    id?: string;
    content: string;
    options: string[];
    correctAnswer: "A" | "B" | "C" | "D";
    aiExplanation?: string;
}

interface QuestionEditorProps {
    lessonId: string;
    initialQuestions: QuestionData[]; // Dữ liệu từ DB (do AI tạo trước đó)
}

export default function QuestionEditor({ lessonId, initialQuestions }: QuestionEditorProps) {
    const [questions, setQuestions] = useState<QuestionData[]>(initialQuestions);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // 1. Thêm câu hỏi mới (Rỗng)
    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                content: "Câu hỏi mới...",
                options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                correctAnswer: "A",
                aiExplanation: ""
            }
        ]);
    };

    // 2. Xóa câu hỏi
    const removeQuestion = (index: number) => {
        const newQ = [...questions];
        newQ.splice(index, 1);
        setQuestions(newQ);
    };

    // 3. Chỉnh sửa nội dung (Question title, options, explanation)
    const updateField = (index: number, field: keyof QuestionData, value: any) => {
        const newQ = [...questions];
        newQ[index] = { ...newQ[index], [field]: value };
        setQuestions(newQ);
    };

    // 4. Chỉnh sửa từng Option cụ thể
    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newQ = [...questions];
        const newOpts = [...newQ[qIndex].options];
        newOpts[optIndex] = value;
        newQ[qIndex].options = newOpts;
        setQuestions(newQ);
    };

    // 5. Lưu vào Database
    const handleSave = async () => {
        setLoading(true);
        const res = await saveLessonQuestions(lessonId, questions);
        setLoading(false);

        if (res.success) {
            toast.success("Lưu thành công!");
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-800">
                    Chỉnh sửa câu hỏi ({questions.length})
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={addQuestion}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200"
                    >
                        <Plus size={18} /> Thêm thủ công
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-[#C5A059] text-white rounded-lg hover:bg-[#b08d4b] disabled:opacity-50"
                    >
                        {loading ? "Đang lưu..." : <><Save size={18} /> Lưu thay đổi</>}
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {questions.map((q, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm relative group">

                        {/* Nút xóa câu hỏi */}
                        <button
                            onClick={() => removeQuestion(index)}
                            className="absolute top-4 right-4 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                        >
                            <Trash2 size={20} />
                        </button>

                        {/* Số thứ tự */}
                        <div className="mb-4 font-bold text-stone-500">Câu {index + 1}</div>

                        {/* Nội dung câu hỏi */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Nội dung câu hỏi</label>
                            <textarea
                                value={q.content}
                                onChange={(e) => updateField(index, "content", e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none"
                                rows={2}
                            />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                    <span className={`font-bold ${["A", "B", "C", "D"][optIndex] === q.correctAnswer ? "text-green-600" : "text-stone-400"}`}>
                                        {["A", "B", "C", "D"][optIndex]}.
                                    </span>
                                    <input
                                        value={opt}
                                        onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                        className="flex-1 p-2 border rounded-md text-sm"
                                    />
                                    {/* Radio chọn đáp án đúng */}
                                    <input
                                        type="radio"
                                        name={`correct-${index}`}
                                        checked={["A", "B", "C", "D"][optIndex] === q.correctAnswer}
                                        onChange={() => updateField(index, "correctAnswer", ["A", "B", "C", "D"][optIndex])}
                                        className="cursor-pointer accent-green-600 w-5 h-5"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Giải thích của AI (Cho phép sửa) */}
                        <div>
                            <label className="block text-sm font-medium mb-1 text-stone-500">Giải thích (Hiện khi sai)</label>
                            <input
                                value={q.aiExplanation || ""}
                                onChange={(e) => updateField(index, "aiExplanation", e.target.value)}
                                className="w-full p-2 bg-stone-50 border rounded-md text-sm text-stone-600 italic"
                                placeholder="Nhập giải thích..."
                            />
                        </div>

                    </div>
                ))}
            </div>

            {/* Nút lưu lớn ở dưới cùng cho tiện */}
            <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-4 bg-[#1a1a1a] text-white rounded-xl font-bold hover:bg-stone-800 flex justify-center items-center gap-2"
            >
                <CheckCircle /> Hoàn tất & Lưu bộ câu hỏi
            </button>
        </div>
    );
}