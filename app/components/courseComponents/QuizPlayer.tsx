"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2, PlayCircle, Bot, FileText, User, BookOpen, Clock, Eye, Trash, ZoomIn } from "lucide-react";
import confetti from "canvas-confetti";
import { submitQuiz } from "@/app/actions/student-quiz";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import FormattedMarkdown from "../common/FormattedMarkdown";
import ImageZoomModal from "../common/ImageZoomModal";
import { parseFileUrls } from "@/app/utils/file-utils";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Question {
    id: string;
    content: string;
    type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE" | "FILL_IN_BLANK" | "READING_COMPREHENSION";
    options: string[];
    contentImageUrl?: string | null;
    timestamp?: number;
    quizSource?: "AI_VIDEO" | "MANUAL" | "WORKSHEET";
    subItems?: { id: string; label: string; content: string; position: number; isCorrect?: boolean }[];
    passage?: { id: string; title: string | null; content: string } | null;
    modelAnswer?: string | null;
    modelAnswerFileUrl?: string | null;
    aiExplanation?: string | null;
    correctAnswer?: string | null;
}

interface AnswerState {
    selectedOption?: string;
    answerText?: string;
    fileUrl?: string;
    subItemAnswers?: Record<string, boolean>;
}

export default function QuizPlayer({
    lessonId,
    questions,
    initialResult,
    initialAnswers,
    onSeek
}: {
    lessonId: string,
    questions: Question[],
    initialResult?: any,
    initialAnswers?: Record<string, AnswerState>,
    onSeek?: (time: number) => void
}) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    const [answers, setAnswers] = useState<Record<string, AnswerState>>(initialAnswers || {});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<any>(initialResult || null);
    const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
    const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null);

    const supabase = createClient();

    const handleSelectOption = (qId: string, optionPrefix: string) => {
        if (result) return;
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], selectedOption: optionPrefix }
        }));
    };

    const handleSubItemSelect = (qId: string, subItemId: string, isTrue: boolean) => {
        if (result) return;
        setAnswers(prev => ({
            ...prev,
            [qId]: {
                ...prev[qId],
                subItemAnswers: {
                    ...(prev[qId]?.subItemAnswers || {}),
                    [subItemId]: isTrue
                }
            }
        }));
    };

    const handleTextChange = (qId: string, text: string) => {
        if (result) return;
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], answerText: text }
        }));
    };

    const handleFileUpload = async (qId: string, files: FileList) => {
        if (result) return;

        try {
            setUploadingFiles(prev => ({ ...prev, [qId]: true }));
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 5 * 1024 * 1024) {
                    alert(`File ${file.name} quá lớn. Vui lòng chọn file dưới 5MB.`);
                    continue;
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `essays/${lessonId}/${qId}/${fileName}`;

                const { data, error } = await supabase.storage
                    .from('homework')
                    .upload(filePath, file);

                if (error) {
                    alert(`Lỗi upload ${file.name}: ` + error.message);
                } else if (data) {
                    const { data: publicUrlData } = supabase.storage
                        .from('homework')
                        .getPublicUrl(filePath);

                    uploadedUrls.push(publicUrlData.publicUrl);
                }
            }

            if (uploadedUrls.length > 0) {
                setAnswers(prev => {
                    const existingUrls = parseFileUrls(prev[qId]?.fileUrl);
                    const newUrls = [...existingUrls, ...uploadedUrls];
                    return {
                        ...prev,
                        [qId]: { ...prev[qId], fileUrl: JSON.stringify(newUrls) }
                    };
                });
            }
        } catch (error: any) {
            alert("Lỗi upload: " + error.message);
        } finally {
            setUploadingFiles(prev => ({ ...prev, [qId]: false }));
        }
    };

    const handleRemoveFile = (qId: string, urlToRemove: string) => {
        if (result) return;
        setAnswers(prev => {
            const existingUrls = parseFileUrls(prev[qId]?.fileUrl);
            const filtered = existingUrls.filter(u => u !== urlToRemove);
            return {
                ...prev,
                [qId]: {
                    ...prev[qId],
                    fileUrl: filtered.length > 0 ? JSON.stringify(filtered) : undefined
                }
            };
        });
    };

    const handleSubmit = async () => {
        const unanswered = questions.filter(q => {
            const ans = answers[q.id];
            if (!ans) return true;
            if (q.type === "MULTIPLE_CHOICE" && !ans.selectedOption) return true;
            if (q.type === "ESSAY" && !ans.answerText?.trim() && !ans.fileUrl) return true;
            if (q.type === "FILL_IN_BLANK" && !ans.answerText?.trim()) return true;
            if (q.type === "TRUE_FALSE") {
                if (!ans.subItemAnswers) return true;
                if (q.subItems && Object.keys(ans.subItemAnswers).length < q.subItems.length) return true;
            }
            return false;
        });

        if (unanswered.length > 0) {
            alert(`Vui lòng hoàn thành tất cả các câu hỏi. Còn ${unanswered.length} câu chưa trả lời.`);
            return;
        }

        setIsSubmitting(true);

        const payload = Object.entries(answers).map(([qid, val]) => ({
            questionId: qid,
            selectedOption: val.selectedOption,
            answerText: val.answerText,
            fileUrl: val.fileUrl,
            subItemAnswers: val.subItemAnswers
        }));

        const res = await submitQuiz(lessonId, payload);
        setIsSubmitting(false);

        if (res.success) {
            setResult(res);
            if (res.score ?? 0 >= 80) confetti();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert(res.error);
        }
    };

    const getOptionStyle = (qId: string, optionPrefix: string) => {
        if (!result) {
            return answers[qId]?.selectedOption === optionPrefix
                ? "bg-[#C5A059] text-[#080808] border-[#C5A059] font-bold shadow-md"
                : isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                    : "bg-white hover:bg-stone-100 border-stone-200 text-stone-900";
        }

        const feedback = result.feedback.find((f: any) => f.questionId === qId);
        const isSelected = answers[qId]?.selectedOption === optionPrefix;

        if (!feedback) return isDark ? "bg-white/5 border-white/10 opacity-50 text-white" : "bg-stone-50 border-stone-200 opacity-50 text-stone-900";

        const isCorrectAnswer = feedback.correctAnswer === optionPrefix;

        if (isCorrectAnswer) return "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold";
        if (isSelected && !feedback.isCorrect) return "bg-red-500/20 border-red-500 text-red-400 font-bold";

        return isDark ? "bg-white/5 border-white/10 opacity-40 text-stone-400" : "bg-stone-50 border-stone-200 opacity-40 text-stone-500";
    };

    if (questions.length === 0) {
        return (
            <div className={`italic text-sm py-6 text-center ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                {t("quiz.noQuestions", "Bài học này chưa có câu hỏi ôn tập.")}
            </div>
        );
    }

    return (
        <div className="space-y-8 py-4 font-sans">
            {/* RESULT HEADER */}
            {result && (() => {
                const hasPendingEssay = questions.some(q => q.type === "ESSAY" || q.type === "READING_COMPREHENSION") &&
                    result.feedback.some((f: any) => f.isPendingGrading || !f.isFinalized);

                if (hasPendingEssay) {
                    return (
                        <div className={`p-6 rounded-3xl text-center border-2 transition-all ${
                            isDark ? "bg-[#C5A059]/15 border-[#C5A059]/40 text-[#C5A059]" : "bg-amber-50 border-amber-300 text-stone-900"
                        }`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <CheckCircle className="text-emerald-500" size={24} />
                                <h3 className="text-2xl font-serif font-bold">
                                    Đã nộp bài thành công!
                                </h3>
                            </div>
                            <p className="text-sm font-medium opacity-90">
                                Bài làm tự luận / đọc hiểu của bạn đã được ghi nhận. Giảng viên sẽ hỗ trợ chấm điểm và nhận xét chi tiết.
                            </p>
                        </div>
                    );
                }

                return (
                    <div className={`p-6 rounded-3xl text-center border-2 transition-all ${result.score >= 50
                        ? isDark ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : isDark ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-red-50 border-red-300 text-red-900"
                        }`}>
                        <h3 className="text-2xl font-serif font-bold mb-1">
                            Kết quả: {result.score ?? 0}/100 điểm
                        </h3>
                        <p className="text-sm font-medium opacity-90">
                            Bạn đã làm đúng <span className="font-bold">{result.correctCount}/{result.total}</span> câu hỏi.
                        </p>
                    </div>
                );
            })()}

            {/* QUESTION LIST */}
            {questions.map((q, index) => {
                const feedback = result?.feedback.find((f: any) => f.questionId === q.id);
                const isFirstInPassage = q.passage && (index === 0 || questions[index - 1]?.passage?.id !== q.passage.id);

                return (
                    <div key={q.id} className="space-y-4">
                        {isFirstInPassage && (
                            <div className={`p-6 rounded-3xl border transition-all ${isDark ? "bg-[#C5A059]/10 border-[#C5A059]/30 text-stone-200" : "bg-amber-50 border-amber-200 text-stone-900"
                                }`}>
                                <h4 className="font-serif font-bold text-[#C5A059] mb-2 flex items-center gap-2">
                                    <BookOpen size={18} />
                                    {q.passage!.title || "Ngữ liệu đọc hiểu"}
                                </h4>
                                <div className={`prose prose-sm max-w-none leading-relaxed ${isDark ? "text-stone-300" : "text-stone-700"}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {q.passage!.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        <div className={`p-6 rounded-3xl border transition-all shadow-sm ${isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                            }`}>
                            <div className="flex justify-between items-start gap-4 mb-5 min-w-0">
                                <div className="flex gap-3 items-start w-full min-w-0 flex-wrap">
                                    <div className="flex flex-row gap-2 items-center shrink-0">
                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#C5A059] text-[#080808] text-xs font-bold uppercase tracking-wider shadow-sm select-none">
                                            Câu {index + 1}
                                        </span>
                                        {q.quizSource === "AI_VIDEO" && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 rounded-full">
                                                <Bot size={12} /> AI
                                            </span>
                                        )}
                                        {q.quizSource === "WORKSHEET" && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                                                <FileText size={12} /> Phiếu BT
                                            </span>
                                        )}
                                    </div>

                                    {/* Question Content */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                                        <div className={`prose prose-sm md:prose-base max-w-none font-medium leading-relaxed ${isDark ? "text-white" : "text-stone-900"
                                            }`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {q.content}
                                            </ReactMarkdown>
                                        </div>
                                        {q.contentImageUrl && (
                                            <div className="my-2 flex justify-center md:justify-start">
                                                <div 
                                                    onClick={() => setZoomImageSrc(q.contentImageUrl!)}
                                                    title="Bấm để phóng to / thu nhỏ hình ảnh"
                                                    className="group relative cursor-zoom-in rounded-2xl border border-stone-500/20 bg-stone-900/10 dark:bg-white/5 p-1.5 shadow-xs hover:border-[#C5A059]/60 hover:shadow-md transition-all overflow-hidden inline-block"
                                                >
                                                    <img 
                                                        src={q.contentImageUrl} 
                                                        alt="Hình vẽ / Bảng biểu minh họa" 
                                                        className="max-h-72 max-w-full rounded-xl object-contain transition-transform duration-200 group-hover:scale-[1.01]" 
                                                    />
                                                    <div className="absolute bottom-2 right-2 bg-stone-950/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-md opacity-90 group-hover:opacity-100 flex items-center gap-1.5 shadow-lg border border-white/10 transition-opacity">
                                                        <ZoomIn size={13} className="text-[#C5A059]" />
                                                        <span>Phóng to</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {q.timestamp !== undefined && q.timestamp !== null && onSeek && (
                                    <button
                                        onClick={() => onSeek(q.timestamp!)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-[#080808] transition-all shrink-0"
                                    >
                                        <PlayCircle size={14} /> tua
                                    </button>
                                )}
                            </div>

                            {/* MULTIPLE CHOICE OPTIONS */}
                            {q.type === "MULTIPLE_CHOICE" && (
                                <div className="space-y-3 mt-4">
                                    {q.options.map((opt, i) => {
                                        const prefix = String.fromCharCode(65 + i);
                                        return (
                                            <button
                                                key={i}
                                                disabled={!!result}
                                                onClick={() => handleSelectOption(q.id, prefix)}
                                                className={`w-full p-4 rounded-2xl text-left border transition-all duration-200 text-sm font-medium flex items-center justify-between ${getOptionStyle(q.id, prefix)}`}
                                            >
                                                <div className="flex-1 [&_p]:inline [&_p]:m-0">
                                                    <span className="font-bold mr-2 text-[#C5A059]">{prefix}.</span>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {opt}
                                                    </ReactMarkdown>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* TRUE / FALSE CLUSTER */}
                            {q.type === "TRUE_FALSE" && q.subItems && q.subItems.length > 0 && (
                                <div className="space-y-3 mt-4">
                                    {q.subItems.map((sub) => {
                                        const userSubAns = answers[q.id]?.subItemAnswers?.[sub.id];
                                        const subFb = feedback?.subItemFeedback?.[sub.id];

                                        return (
                                            <div key={sub.id} className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${isDark ? "bg-white/5 border-white/10" : "bg-stone-50 border-stone-200"
                                                }`}>
                                                <div className="text-sm font-medium flex-1 [&_p]:inline [&_p]:m-0">
                                                    <span className="font-bold text-[#C5A059] mr-2">{sub.label}.</span>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                        {sub.content}
                                                    </ReactMarkdown>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        disabled={!!result}
                                                        onClick={() => handleSubItemSelect(q.id, sub.id, true)}
                                                        className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${userSubAns === true
                                                            ? "bg-emerald-500 text-white border-emerald-500"
                                                            : isDark ? "bg-white/5 border-white/10 text-stone-300" : "bg-white border-stone-200 text-stone-700"
                                                            }`}
                                                    >
                                                        Đúng
                                                    </button>
                                                    <button
                                                        disabled={!!result}
                                                        onClick={() => handleSubItemSelect(q.id, sub.id, false)}
                                                        className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${userSubAns === false
                                                            ? "bg-red-500 text-white border-red-500"
                                                            : isDark ? "bg-white/5 border-white/10 text-stone-300" : "bg-white border-stone-200 text-stone-700"
                                                            }`}
                                                    >
                                                        Sai
                                                    </button>

                                                    {result && subFb && (
                                                        <span className="ml-2">
                                                            {subFb.isCorrect ? (
                                                                <CheckCircle size={18} className="text-emerald-500 inline" />
                                                            ) : (
                                                                <XCircle size={18} className="text-red-500 inline" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {/* READING COMPREHENSION */}
                            {q.type === "READING_COMPREHENSION" && (
                                <div className="space-y-4 mt-4">
                                    <label className={`text-xs font-bold uppercase tracking-wider block ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                                        Câu trả lời đọc hiểu của bạn:
                                    </label>
                                    <textarea
                                        disabled={!!result}
                                        value={answers[q.id]?.answerText || ""}
                                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                                        placeholder="Nhập chi tiết câu trả lời của bạn tại đây..."
                                        rows={5}
                                        className={`w-full p-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:border-[#C5A059] ${isDark
                                            ? "bg-white/5 border-white/10 text-white placeholder-stone-500"
                                            : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                                            }`}
                                    />

                                    {/* File Attachments Section */}
                                    <div className="space-y-3">
                                        {parseFileUrls(answers[q.id]?.fileUrl).length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {parseFileUrls(answers[q.id]?.fileUrl).map((url, idx) => (
                                                    <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${isDark ? "bg-white/10 border-white/10 text-stone-200" : "bg-stone-100 border-stone-200 text-stone-700"
                                                        }`}>
                                                        <FileText size={14} className="text-[#C5A059]" />
                                                        <a href={url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[200px]">
                                                            File đính kèm #{idx + 1}
                                                        </a>
                                                        {!result && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFile(q.id, url)}
                                                                className="text-red-400 hover:text-red-600 p-0.5"
                                                            >
                                                                <Trash size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {!result && (
                                            <div className="flex items-center gap-3">
                                                <label className={`cursor-pointer px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${uploadingFiles[q.id] ? "opacity-50 pointer-events-none" : ""
                                                    } ${isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-stone-300" : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700"
                                                    }`}>
                                                    {uploadingFiles[q.id] ? (
                                                        <Loader2 size={14} className="animate-spin text-[#C5A059]" />
                                                    ) : (
                                                        <FileText size={14} className="text-[#C5A059]" />
                                                    )}
                                                    <span>{uploadingFiles[q.id] ? "Đang tải file lên..." : "Đính kèm file bài làm (Ảnh/PDF)"}</span>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*,.pdf,.doc,.docx,.txt"
                                                        className="hidden"
                                                        onChange={(e) => e.target.files && handleFileUpload(q.id, e.target.files)}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ESSAY QUESTION UI */}
                            {q.type === "ESSAY" && (
                                <div className="space-y-4 mt-4">
                                    <label className={`text-xs font-bold uppercase tracking-wider block ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                                        Câu trả lời tự luận của bạn:
                                    </label>
                                    <textarea
                                        disabled={!!result}
                                        value={answers[q.id]?.answerText || ""}
                                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                                        placeholder="Nhập chi tiết câu trả lời của bạn tại đây..."
                                        rows={5}
                                        className={`w-full p-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:border-[#C5A059] ${isDark
                                            ? "bg-white/5 border-white/10 text-white placeholder-stone-500"
                                            : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                                            }`}
                                    />

                                    {/* File Attachments Section */}
                                    <div className="space-y-3">
                                        {parseFileUrls(answers[q.id]?.fileUrl).length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {parseFileUrls(answers[q.id]?.fileUrl).map((url, idx) => (
                                                    <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${isDark ? "bg-white/10 border-white/10 text-stone-200" : "bg-stone-100 border-stone-200 text-stone-700"
                                                        }`}>
                                                        <FileText size={14} className="text-[#C5A059]" />
                                                        <a href={url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[200px]">
                                                            File đính kèm #{idx + 1}
                                                        </a>
                                                        {!result && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFile(q.id, url)}
                                                                className="text-red-400 hover:text-red-600 p-0.5"
                                                            >
                                                                <Trash size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {!result && (
                                            <div className="flex items-center gap-3">
                                                <label className={`cursor-pointer px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${uploadingFiles[q.id] ? "opacity-50 pointer-events-none" : ""
                                                    } ${isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-stone-300" : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700"
                                                    }`}>
                                                    {uploadingFiles[q.id] ? (
                                                        <Loader2 size={14} className="animate-spin text-[#C5A059]" />
                                                    ) : (
                                                        <FileText size={14} className="text-[#C5A059]" />
                                                    )}
                                                    <span>{uploadingFiles[q.id] ? "Đang tải file lên..." : "Đính kèm file bài làm (Ảnh/PDF)"}</span>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*,.pdf,.doc,.docx,.txt"
                                                        className="hidden"
                                                        onChange={(e) => e.target.files && handleFileUpload(q.id, e.target.files)}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* FILL IN BLANK QUESTION UI */}
                            {q.type === "FILL_IN_BLANK" && (
                                <div className="space-y-4 mt-4">
                                    <label className={`text-xs font-bold uppercase tracking-wider block ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                                        Câu trả lời điền khuyết:
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!!result}
                                        value={answers[q.id]?.answerText || ""}
                                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                                        placeholder="Nhập từ hoặc cụm từ..."
                                        className={`w-full p-4 rounded-2xl border transition-all text-sm font-medium focus:outline-none focus:border-[#C5A059] ${isDark
                                            ? "bg-white/5 border-white/10 text-white placeholder-stone-500"
                                            : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                                            }`}
                                    />
                                    {result && feedback && (
                                        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 text-sm font-medium ${feedback.isCorrect
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                            : "bg-red-500/10 border-red-500/30 text-red-400"
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                {feedback.isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                                <span>{feedback.isCorrect ? "Đáp án chính xác!" : `Đáp án đúng: ${feedback.correctAnswer || q.correctAnswer || "N/A"}`}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AFTER-SUBMISSION FEEDBACK & MODEL ANSWER SECTION */}
                            {result && (
                                <div className="space-y-4 mt-6 pt-6 border-t border-dashed border-stone-500/20">
                                    {/* Essay & Reading Comprehension Status Notice */}
                                    {(q.type === "ESSAY" || q.type === "READING_COMPREHENSION") && (
                                        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-medium ${
                                            feedback?.isFinalized
                                                ? isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                                                : isDark ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900"
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {feedback?.isFinalized ? <CheckCircle size={16} className="text-emerald-500 shrink-0" /> : <Clock size={16} className="text-[#C5A059] shrink-0" />}
                                                <span>
                                                    {feedback?.isFinalized
                                                        ? `Đã được chấm điểm: ${feedback.essayScore != null ? feedback.essayScore + " điểm" : "Hoàn tất"}`
                                                        : "Đã nộp bài thành công (Chờ giảng viên chấm điểm)"}
                                                </span>
                                            </div>
                                            {feedback?.isFinalized && feedback?.essayFeedback && (
                                                <p className="text-xs italic text-emerald-600 font-semibold">Nhận xét: {feedback.essayFeedback}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Model Answer (Đáp án tham khảo / Bài mẫu) */}
                                    {(feedback?.modelAnswer || q.modelAnswer) && (
                                        <div className={`p-5 rounded-2xl border transition-all ${
                                            isDark
                                                ? "bg-[#0e0e0e] border-white/10 text-stone-200"
                                                : "bg-amber-50/70 border-amber-200 text-stone-900"
                                        }`}>
                                            <div className="font-bold text-xs uppercase tracking-wider text-[#C5A059] mb-2 flex items-center gap-2">
                                                <FileText size={16} />
                                                <span>Đáp án tham khảo / Bài mẫu:</span>
                                            </div>
                                            <FormattedMarkdown
                                                content={feedback?.modelAnswer || q.modelAnswer || ""}
                                            />
                                            {(feedback?.modelAnswerFileUrl || q.modelAnswerFileUrl) && (
                                                <div className="mt-3 pt-3 border-t border-stone-500/20">
                                                    <a
                                                        href={feedback?.modelAnswerFileUrl || q.modelAnswerFileUrl || "#"}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A059] hover:underline"
                                                    >
                                                        <FileText size={14} /> File đính kèm bài mẫu ↗
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* AI Explanation / Hướng dẫn giải thích */}
                                    {(feedback?.explanation || q.aiExplanation) && (
                                        <div className={`p-5 rounded-2xl border ${isDark ? "bg-blue-500/10 border-blue-500/20 text-stone-200" : "bg-blue-50/70 border-blue-200 text-stone-900"
                                            }`}>
                                            <div className="font-bold text-xs uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-2">
                                                <Bot size={16} />
                                                <span>Giải thích chi tiết:</span>
                                            </div>
                                            <FormattedMarkdown
                                                content={feedback?.explanation || q.aiExplanation || ""}
                                                className={isDark ? "text-stone-200" : "text-stone-800"}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* SUBMIT BUTTON */}
            {!result && (
                <div className="pt-6">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-full bg-[#C5A059] text-[#080808] font-bold text-xs uppercase tracking-widest hover:bg-[#e9c176] transition-all duration-300 shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Nộp bài tập ✨"}
                    </button>
                </div>
            )}

            {/* Lightbox / Modal phóng to thu nhỏ hình ảnh */}
            {zoomImageSrc && (
                <ImageZoomModal 
                    src={zoomImageSrc} 
                    onClose={() => setZoomImageSrc(null)} 
                />
            )}
        </div>
    );
}