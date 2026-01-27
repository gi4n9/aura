"use client";

import { useState } from "react";

import { AlertCircle, CheckCircle, Plus, Save, Trash2 } from "lucide-react";

import { saveLessonQuestions } from "@/app/actions/question";

import { useRouter } from "next/navigation";

import { toast } from "sonner";


interface QuestionState {
    id?: string;
    content: string;
    options: string[];
    correctAnswer: string;
    aiExplanation: string;
}


interface QuizEditorProps {
    lessonId: string;
    initialQuestions: any[];
}

export default function QuizEditor({ lessonId, initialQuestions }: QuizEditorProps) {
    const [questions, setQuestions] = useState<QuestionState[]>(
        initialQuestions.map((q) => ({
            id: q.id,
            content: q.content,
            options: q.options as string[],
            correctAnswer: q.correctAnswer,
            aiExplanation: q.aiExplanation || "",
        }))
    );

    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                content: "Câu hỏi mới ...",
                options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                correctAnswer: "A",
                aiExplanation: "",
            }
        ])
    }

    const handleDeleteQuestion = (index: number) => {
        const newQ = [...questions];
        newQ.splice(index, 1);
        setQuestions(newQ);
    }

    const handleChangeField = (index: number, field: keyof QuestionState, value: string) => {
        const newQ = [...questions];
        newQ[index] = { ...newQ[index], [field]: value };
        setQuestions(newQ);
    }

    const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
        const newQ = [...questions];
        const newOptions = [...newQ[qIndex].options];
        newOptions[optIndex] = value;
        newQ[qIndex].options = newOptions;
        setQuestions(newQ);
    }

    const handleSetCorrect = (qIndex: number, optIndex: number) => {
        const labels = ["A", "B", "C", "D"];
        handleChangeField(qIndex, "correctAnswer", labels[optIndex]);
    }

    const onSaveAll = async () => {
        try {
            setIsSaving(true);

            const payload = questions.map((q) => ({
                content: q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                aiExplanation: q.aiExplanation
            }))

            const result = await saveLessonQuestions(lessonId, payload)

            if (result.success) {
                toast.success(result.message)
                router.refresh();
            } else {
                toast.error(result.error || "Lỗi khi lưu")
            }
        } catch (error) {
            toast.error("Đã xảy ra lỗi hệ thống !")
        } finally {
            setIsSaving(false);
        }
    }

    return (<div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
                Danh sách câu hỏi ({questions.length})
            </h2>
            <button
                onClick={handleAddQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
            >
                <Plus size={18} /> Thêm câu hỏi
            </button>
        </div>

        {questions.map((q, qIndex) => (
            <div
                key={qIndex} // Dùng index làm key vì danh sách có thể thay đổi liên tục
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 group transition-all hover:shadow-md"
            >
                {/* Header câu hỏi */}
                <div className="flex justify-between items-start mb-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-sm font-bold">
                        Câu {qIndex + 1}
                    </span>
                    <button
                        onClick={() => handleDeleteQuestion(qIndex)}
                        className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                        title="Xóa câu này"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Nội dung câu hỏi */}
                <div className="mb-6">
                    <textarea
                        value={q.content}
                        onChange={(e) => handleChangeField(qIndex, "content", e.target.value)}
                        className="w-full p-3 text-lg font-medium border-b-2 border-transparent focus:border-indigo-500 bg-transparent outline-none placeholder:text-slate-300 transition-colors resize-none"
                        placeholder="Nhập nội dung câu hỏi..."
                        rows={2}
                    />
                </div>

                {/* Danh sách đáp án */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {q.options.map((opt, optIndex) => {
                        const label = ["A", "B", "C", "D"][optIndex];
                        const isCorrect = q.correctAnswer === label;

                        return (
                            <div
                                key={optIndex}
                                className={`relative flex items-center p-3 rounded-lg border-2 transition-all ${isCorrect
                                    ? "border-green-500 bg-green-50/50"
                                    : "border-slate-100 focus-within:border-indigo-300"
                                    }`}
                            >
                                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mr-3 ${isCorrect ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                                    }`}>
                                    {label}
                                </span>

                                <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                    className="flex-1 bg-transparent outline-none text-slate-700"
                                    placeholder={`Đáp án ${label}`}
                                />

                                <button
                                    onClick={() => handleSetCorrect(qIndex, optIndex)}
                                    className={`ml-2 p-1.5 rounded-full transition-colors ${isCorrect
                                        ? "text-green-600 hover:bg-green-100"
                                        : "text-slate-300 hover:text-green-500 hover:bg-slate-100"
                                        }`}
                                    title="Đặt làm đáp án đúng"
                                >
                                    <CheckCircle size={20} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Giải thích AI */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold mb-2">
                        <AlertCircle size={16} />
                        Giải thích chi tiết
                    </div>
                    <textarea
                        value={q.aiExplanation}
                        onChange={(e) => handleChangeField(qIndex, "aiExplanation", e.target.value)}
                        className="w-full bg-transparent text-slate-600 text-sm outline-none resize-none"
                        rows={3}
                        placeholder="Nhập lời giải thích..."
                    />
                </div>
            </div>
        ))}

        {/* Floating Save Button */}
        <div className="fixed bottom-6 right-6 z-50">
            <button
                onClick={onSaveAll}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full shadow-xl hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-transform hover:scale-105 active:scale-95 font-bold"
            >
                {isSaving ? (
                    "Đang lưu..."
                ) : (
                    <>
                        <Save size={20} /> Lưu thay đổi ({questions.length})
                    </>
                )}
            </button>
        </div>
    </div>
    );
}