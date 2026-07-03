"use client";

import { useState } from "react";

import { AlertCircle, CheckCircle, Plus, Save, Trash2, List, AlignLeft, Bot, FileText, User, Sparkles, CheckSquare, FormInput, BookOpen } from "lucide-react";

import { saveLessonQuestions } from "@/app/actions/question";
import { generateQuizFromTranscript } from "@/app/actions/ai-lesson-content";

import { toast } from "sonner";
import { QuizDisplayMode, QuizSource } from "@prisma/client";
import WorksheetUploader from "./WorksheetUploader";
import AnswerKeyUploader from "./AnswerKeyUploader";
import EssayGradingPanel from "./EssayGradingPanel";
import QuizDisplayModeSelector from "./QuizDisplayModeSelector";


interface QuestionState {
    id?: string;
    content: string;
    type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE" | "FILL_IN_BLANK" | "READING_COMPREHENSION";
    options: string[];
    correctAnswer: "A" | "B" | "C" | "D" | string;
    modelAnswer?: string | null;
    aiExplanation: string;
    quizSource: "AI_VIDEO" | "MANUAL" | "WORKSHEET";
    contentImageUrl?: string | null;
    subItems?: { id?: string; label: string; content: string; isCorrect: boolean; position?: number }[];
    passage?: { id?: string; title?: string | null; content: string } | null;
}


interface QuizEditorProps {
    lessonId: string;
    initialQuestions: any[];
    initialDisplayMode?: QuizDisplayMode;
    transcript?: string | null;
}

export default function QuizEditor({ lessonId, initialQuestions, initialDisplayMode = QuizDisplayMode.BOTH, transcript }: QuizEditorProps) {
    const [questions, setQuestions] = useState<QuestionState[]>(
        initialQuestions.map((q) => ({
            id: q.id,
            content: q.content,
            type: q.type || "MULTIPLE_CHOICE",
            options: Array.isArray(q.options) ? q.options : ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
            correctAnswer: q.correctAnswer || "A",
            modelAnswer: q.modelAnswer || "",
            aiExplanation: q.aiExplanation || "",
            quizSource: q.quizSource || "MANUAL",
            contentImageUrl: q.contentImageUrl,
            subItems: q.subItems && q.subItems.length > 0 ? q.subItems : [
                { label: "a", content: "Mệnh đề A", isCorrect: false },
                { label: "b", content: "Mệnh đề B", isCorrect: false },
                { label: "c", content: "Mệnh đề C", isCorrect: false },
                { label: "d", content: "Mệnh đề D", isCorrect: false }
            ],
            passage: q.passage || null
        }))
    );

    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

    const handleUploadSuccess = () => {
        // Tải lại trang hiện tại để có thể fetch lại list questions mới 
        // Component này được sử dụng chung trong 2 routes, do đó dùng window.location.reload()
        window.location.reload();
    }

    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateQuiz = async () => {
        if (!transcript) {
            toast.error("Không có Transcript để tạo câu hỏi trắc nghiệm!");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await generateQuizFromTranscript(lessonId, transcript, false);
            if (res.success && res.data) {
                toast.success("Tạo câu hỏi AI thành công!");
                window.location.reload();
            } else {
                throw new Error(res.error || "Lỗi tạo câu hỏi");
            }
        } catch (error: any) {
            toast.error(`Có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            {
                content: "Câu hỏi mới ...",
                type: "MULTIPLE_CHOICE",
                options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                correctAnswer: "A",
                aiExplanation: "",
                quizSource: "MANUAL"
            }
        ])
    }

    const handleDeleteQuestion = (index: number) => {
        const newQ = [...questions];
        newQ.splice(index, 1);
        setQuestions(newQ);
    }

    const handleChangeField = (index: number, field: keyof QuestionState, value: any) => {
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
                id: q.id,
                content: q.content,
                type: q.type,
                options: q.type === "MULTIPLE_CHOICE" ? q.options : [],
                correctAnswer: q.type === "MULTIPLE_CHOICE" ? q.correctAnswer : (q.type === "FILL_IN_BLANK" ? q.correctAnswer : ""),
                modelAnswer: (q.type === "ESSAY" || q.type === "READING_COMPREHENSION") ? q.modelAnswer : "",
                aiExplanation: q.aiExplanation,
                quizSource: q.quizSource,
                contentImageUrl: q.contentImageUrl,
                subItems: q.type === "TRUE_FALSE" ? (q.subItems?.map((s, idx) => ({ ...s, position: s.position ?? idx })) || []) : [],
                passage: q.type === "READING_COMPREHENSION" ? q.passage : null
            }))

            const result = await saveLessonQuestions(lessonId, payload)

            if (result.success) {
                toast.success(result.message)
                // No need for router.refresh() - Server Action handles revalidatePath()
            } else {
                toast.error(result.error || "Lỗi khi lưu")
            }
        } catch (error) {
            toast.error("Đã xảy ra lỗi hệ thống !")
        } finally {
            setIsSaving(false);
        }
    }

    const countByType = {
        ALL: questions.length,
        MULTIPLE_CHOICE: questions.filter(q => q.type === "MULTIPLE_CHOICE").length,
        TRUE_FALSE: questions.filter(q => q.type === "TRUE_FALSE").length,
        FILL_IN_BLANK: questions.filter(q => q.type === "FILL_IN_BLANK").length,
        READING_COMPREHENSION: questions.filter(q => q.type === "READING_COMPREHENSION").length,
        ESSAY: questions.filter(q => q.type === "ESSAY").length,
    };

    const filteredQuestionsWithIndex = questions
        .map((q, originalIndex) => ({ q, originalIndex }))
        .filter(({ q }) => selectedTypeFilter === "ALL" || q.type === selectedTypeFilter);

    return (<div className="max-w-4xl mx-auto space-y-8 pb-20">
        <QuizDisplayModeSelector lessonId={lessonId} initialMode={initialDisplayMode} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WorksheetUploader lessonId={lessonId} onUploadSuccess={handleUploadSuccess} />
            <AnswerKeyUploader lessonId={lessonId} onUploadSuccess={handleUploadSuccess} />
        </div>

        <EssayGradingPanel lessonId={lessonId} />

        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
                Danh sách câu hỏi ({questions.length})
            </h2>
            <div className="flex gap-2">
                {transcript && (
                    <button
                        onClick={handleGenerateQuiz}
                        disabled={isGenerating}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold shadow-sm ${isGenerating
                            ? "bg-blue-100 text-blue-400 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                            }`}
                    >
                        <Sparkles size={18} className={isGenerating ? "animate-spin" : ""} />
                        {isGenerating ? "Đang tạo câu hỏi..." : "Tạo câu hỏi bằng AI"}
                    </button>
                )}
                <button
                    onClick={handleAddQuestion}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                >
                    <Plus size={18} /> Thêm câu hỏi
                </button>
            </div>
        </div>

        {/* Bộ lọc loại câu hỏi */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-slate-100 shadow-sm rounded-xl mb-6">
            <button
                onClick={() => setSelectedTypeFilter("ALL")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none ${selectedTypeFilter === "ALL"
                    ? "bg-[#C5A059] text-white shadow-sm shadow-indigo-600/25"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
            >
                Tất cả
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedTypeFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    {countByType.ALL}
                </span>
            </button>

            <button
                onClick={() => setSelectedTypeFilter("MULTIPLE_CHOICE")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none ${selectedTypeFilter === "MULTIPLE_CHOICE"
                    ? "bg-[#C5A059] text-white shadow-sm shadow-indigo-600/25"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
            >
                <List size={14} /> Trắc nghiệm
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedTypeFilter === "MULTIPLE_CHOICE" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    {countByType.MULTIPLE_CHOICE}
                </span>
            </button>

            <button
                onClick={() => setSelectedTypeFilter("TRUE_FALSE")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none ${selectedTypeFilter === "TRUE_FALSE"
                    ? "bg-[#C5A059] text-white shadow-sm shadow-indigo-600/25"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
            >
                <CheckSquare size={14} /> Đúng/Sai
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedTypeFilter === "TRUE_FALSE" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    {countByType.TRUE_FALSE}
                </span>
            </button>

            <button
                onClick={() => setSelectedTypeFilter("FILL_IN_BLANK")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none ${selectedTypeFilter === "FILL_IN_BLANK"
                    ? "bg-[#C5A059] text-white shadow-sm shadow-indigo-600/25"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
            >
                <FormInput size={14} /> Điền khuyết
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedTypeFilter === "FILL_IN_BLANK" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    {countByType.FILL_IN_BLANK}
                </span>
            </button>

            <button
                onClick={() => setSelectedTypeFilter("READING_COMPREHENSION")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none ${selectedTypeFilter === "READING_COMPREHENSION"
                    ? "bg-[#C5A059] text-white shadow-sm shadow-indigo-600/25"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
            >
                <BookOpen size={14} /> Đọc hiểu
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedTypeFilter === "READING_COMPREHENSION" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    {countByType.READING_COMPREHENSION}
                </span>
            </button>

            <button
                onClick={() => setSelectedTypeFilter("ESSAY")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all outline-none ${selectedTypeFilter === "ESSAY"
                    ? "bg-[#C5A059] text-white shadow-sm shadow-indigo-600/25"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                    }`}
            >
                <AlignLeft size={14} /> Tự luận
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedTypeFilter === "ESSAY" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                    {countByType.ESSAY}
                </span>
            </button>
        </div>

        {filteredQuestionsWithIndex.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                <Bot size={40} className="stroke-1 mb-3 text-slate-300 animate-pulse" />
                <p className="text-sm font-medium">Không có câu hỏi nào thuộc loại này.</p>
            </div>
        ) : (
            filteredQuestionsWithIndex.map(({ q, originalIndex }) => (
                <div
                    key={originalIndex}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 group transition-all hover:shadow-md"
                >
                    {/* Header câu hỏi */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-sm font-bold">
                                Câu {originalIndex + 1}
                            </span>

                            {/* Type Badge */}
                            <div className="flex bg-slate-100 rounded-md p-0.5 overflow-x-auto max-w-full">
                                <button
                                    onClick={() => handleChangeField(originalIndex, "type", "MULTIPLE_CHOICE")}
                                    className={`flex items-center gap-1.5 px-2 py-1 whitespace-nowrap text-xs font-medium rounded transition-colors ${q.type === "MULTIPLE_CHOICE" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <List size={14} /> Trắc nghiệm
                                </button>
                                <button
                                    onClick={() => handleChangeField(originalIndex, "type", "TRUE_FALSE")}
                                    className={`flex items-center gap-1.5 px-2 py-1 whitespace-nowrap text-xs font-medium rounded transition-colors ${q.type === "TRUE_FALSE" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <CheckSquare size={14} /> Đúng/Sai
                                </button>
                                <button
                                    onClick={() => handleChangeField(originalIndex, "type", "FILL_IN_BLANK")}
                                    className={`flex items-center gap-1.5 px-2 py-1 whitespace-nowrap text-xs font-medium rounded transition-colors ${q.type === "FILL_IN_BLANK" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <FormInput size={14} /> Điền khuyết
                                </button>
                                <button
                                    onClick={() => handleChangeField(originalIndex, "type", "READING_COMPREHENSION")}
                                    className={`flex items-center gap-1.5 px-2 py-1 whitespace-nowrap text-xs font-medium rounded transition-colors ${q.type === "READING_COMPREHENSION" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <BookOpen size={14} /> Đọc hiểu
                                </button>
                                <button
                                    onClick={() => handleChangeField(originalIndex, "type", "ESSAY")}
                                    className={`flex items-center gap-1.5 px-2 py-1 whitespace-nowrap text-xs font-medium rounded transition-colors ${q.type === "ESSAY" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <AlignLeft size={14} /> Tự luận
                                </button>
                            </div>

                            {/* Source Badge */}
                            {q.quizSource === "AI_VIDEO" && (
                                <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    <Bot size={12} /> AI Video
                                </span>
                            )}
                            {q.quizSource === "WORKSHEET" && (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                    <FileText size={12} /> Phiếu bài tập
                                </span>
                            )}
                            {q.quizSource === "MANUAL" && (
                                <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                    <User size={12} /> Thủ công
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => handleDeleteQuestion(originalIndex)}
                            className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                            title="Xóa câu này"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    {/* Passage content cho READING_COMPREHENSION */}
                    {q.type === "READING_COMPREHENSION" && (
                        <div className="mb-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold text-sm">
                                <BookOpen size={16} /> Ngữ liệu đọc hiểu (Passage)
                            </div>
                            <input
                                type="text"
                                placeholder="Tiêu đề đoạn văn (VD: Đọc hiểu bài Sóng - Xuân Quỳnh)..."
                                value={q.passage?.title || ""}
                                onChange={(e) => handleChangeField(originalIndex, "passage", { ...q.passage, title: e.target.value, content: q.passage?.content || "" })}
                                className="w-full p-2 mb-2 rounded bg-white border border-amber-200 outline-none focus:border-amber-400 text-sm font-medium text-slate-800"
                            />
                            <textarea
                                value={q.passage?.content || ""}
                                onChange={(e) => handleChangeField(originalIndex, "passage", { ...q.passage, title: q.passage?.title || "", content: e.target.value })}
                                className="w-full p-3 rounded bg-white border border-amber-200 outline-none focus:border-amber-400 min-h-[100px] text-slate-700"
                                placeholder="Nhập nội dung đoạn văn/ngữ liệu..."
                            />
                        </div>
                    )}

                    {/* Nội dung câu hỏi chính */}
                    <div className="mb-6">
                        {q.contentImageUrl && (
                            <div className="mb-4">
                                <img src={q.contentImageUrl} alt="Ảnh câu hỏi" className="max-h-60 object-contain rounded-lg border border-slate-200" />
                            </div>
                        )}
                        <textarea
                            value={q.content}
                            onChange={(e) => handleChangeField(originalIndex, "content", e.target.value)}
                            className="w-full p-3 text-lg font-medium border-b-2 border-transparent focus:border-indigo-500 bg-transparent outline-none placeholder:text-slate-300 transition-colors resize-none"
                            placeholder={q.type === "TRUE_FALSE" ? "Nhập câu lệnh chung (VD: Cho hàm số y = f(x)...)" : "Nhập nội dung câu hỏi..."}
                            rows={2}
                        />
                    </div>

                    {/* Danh sách đáp án cho MULTIPLE_CHOICE */}
                    {q.type === "MULTIPLE_CHOICE" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {(q.options || []).map((opt, optIndex) => {
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
                                            onChange={(e) => handleOptionChange(originalIndex, optIndex, e.target.value)}
                                            className="flex-1 bg-transparent outline-none text-slate-700"
                                            placeholder={`Đáp án ${label}`}
                                        />

                                        <button
                                            onClick={() => handleSetCorrect(originalIndex, optIndex)}
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
                    )}

                    {/* Mệnh đề cho TRUE_FALSE */}
                    {q.type === "TRUE_FALSE" && (
                        <div className="grid gap-3 mb-6">
                            {(q.subItems || []).map((subItem, sIdx) => (
                                <div key={sIdx} className={`flex items-center gap-3 p-3 rounded-lg border-2 ${subItem.isCorrect ? "border-green-400 bg-green-50" : "border-slate-200"}`}>
                                    <span className="bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded">{subItem.label.toUpperCase()}</span>
                                    <input
                                        type="text"
                                        value={subItem.content}
                                        onChange={(e) => {
                                            const newSub = [...(q.subItems || [])];
                                            newSub[sIdx] = { ...newSub[sIdx], content: e.target.value };
                                            handleChangeField(originalIndex, "subItems", newSub);
                                        }}
                                        className="flex-1 bg-transparent outline-none font-medium"
                                        placeholder="Nội dung mệnh đề..."
                                    />
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => {
                                                const newSub = [...(q.subItems || [])];
                                                newSub[sIdx] = { ...newSub[sIdx], isCorrect: true };
                                                handleChangeField(originalIndex, "subItems", newSub);
                                            }}
                                            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${subItem.isCorrect ? "bg-green-500 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                        >Đúng</button>
                                        <button
                                            onClick={() => {
                                                const newSub = [...(q.subItems || [])];
                                                newSub[sIdx] = { ...newSub[sIdx], isCorrect: false };
                                                handleChangeField(originalIndex, "subItems", newSub);
                                            }}
                                            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${!subItem.isCorrect ? "bg-red-500 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                        >Sai</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Đáp án cho FILL_IN_BLANK */}
                    {q.type === "FILL_IN_BLANK" && (
                        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="text-sm font-semibold text-slate-600 mb-2">Đáp án chính xác:</div>
                            <input
                                type="text"
                                value={q.correctAnswer}
                                onChange={(e) => handleChangeField(originalIndex, "correctAnswer", e.target.value)}
                                className="w-full p-3 rounded border border-slate-300 outline-none focus:border-indigo-500 font-medium text-slate-800 bg-white"
                                placeholder="Nhập đáp án đúng (học sinh cần điền chính xác cụm từ này)"
                            />
                        </div>
                    )}

                    {/* Đáp án mẫu cho tự luận / đọc hiểu */}
                    {(q.type === "ESSAY" || q.type === "READING_COMPREHENSION") && (() => {
                        let parsedRubric: any = null;
                        let displayModelAnswer = q.modelAnswer || "";
                        try {
                            if (q.modelAnswer && q.modelAnswer.trim().startsWith("{")) {
                                const obj = JSON.parse(q.modelAnswer);
                                if (obj.rubric || obj.isRubric) {
                                    parsedRubric = obj.rubric || obj;
                                    displayModelAnswer = obj.answer || "";
                                }
                            }
                        } catch (e) {}

                        return (
                            <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                                <div className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
                                    <CheckCircle size={16} className="text-emerald-600" />
                                    Đáp án mẫu / Hướng dẫn chấm tự luận:
                                    {q.modelAnswer ? (
                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                                            {parsedRubric ? "Đã phân tích Rubric cấu trúc" : "Đã khớp đáp án thành công"}
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                                            Chưa có đáp án mẫu
                                        </span>
                                    )}
                                </div>

                                {/* Render Rubric chi tiết nếu có */}
                                {parsedRubric && (
                                    <div className="mb-4 bg-white/80 p-3 rounded-lg border border-emerald-100 text-sm text-slate-700 space-y-3 shadow-sm">
                                        <div className="font-semibold text-emerald-900 border-b border-emerald-50 pb-1 flex justify-between items-center">
                                            <span>Rubric chấm điểm tự động (AI Grading)</span>
                                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold">
                                                Tổng: {parsedRubric.totalScore || parsedRubric.score || 10}đ
                                            </span>
                                        </div>
                                        {parsedRubric.general && (
                                            <div>
                                                <span className="font-bold text-slate-800 text-xs">Yêu cầu chung:</span>
                                                <p className="text-xs mt-1 text-slate-600 pl-2 border-l-2 border-slate-200 whitespace-pre-line">{parsedRubric.general}</p>
                                            </div>
                                        )}
                                        {parsedRubric.criteria && parsedRubric.criteria.length > 0 && (
                                            <div className="space-y-2">
                                                <span className="font-bold text-slate-800 text-xs">Tiêu chí chi tiết:</span>
                                                <div className="grid gap-2 mt-1">
                                                    {parsedRubric.criteria.map((c: any, cIdx: number) => (
                                                        <div key={cIdx} className="flex justify-between items-start bg-emerald-50/20 p-2 rounded border border-emerald-50 text-xs">
                                                            <div className="flex-1 pr-4">
                                                                <span className="font-bold text-emerald-800 mr-1">{c.label || `Ý ${cIdx + 1}`}:</span>
                                                                <span className="text-slate-600">{c.description}</span>
                                                            </div>
                                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">{c.score}đ</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <textarea
                                    value={displayModelAnswer}
                                    onChange={(e) => {
                                        if (parsedRubric) {
                                            const newPayload = JSON.stringify({
                                                isRubric: true,
                                                answer: e.target.value,
                                                rubric: parsedRubric
                                            });
                                            handleChangeField(originalIndex, "modelAnswer", newPayload);
                                        } else {
                                            handleChangeField(originalIndex, "modelAnswer", e.target.value);
                                        }
                                    }}
                                    className="w-full p-3 rounded border border-emerald-200 outline-none focus:border-emerald-500 font-medium text-slate-800 bg-white min-h-[120px]"
                                    placeholder="Nhập hướng dẫn chấm điểm chi tiết hoặc đáp án mẫu cho câu tự luận..."
                                    rows={4}
                                />
                            </div>
                        );
                    })()}

                    {/* Giải thích AI */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold mb-2">
                            <AlertCircle size={16} />
                            Giải thích chi tiết
                        </div>
                        <textarea
                            value={q.aiExplanation}
                            onChange={(e) => handleChangeField(originalIndex, "aiExplanation", e.target.value)}
                            className="w-full bg-transparent text-slate-600 text-sm outline-none resize-none"
                            rows={3}
                            placeholder="Nhập lời giải thích..."
                        />
                    </div>
                </div>
            ))
        )}

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