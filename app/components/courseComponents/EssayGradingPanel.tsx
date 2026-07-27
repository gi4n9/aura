"use client";

import { useState, useCallback } from "react";
import {
    BookOpen, Upload, Save, Bot, CheckCircle, Clock, XCircle,
    ChevronDown, ChevronUp, FileText, Loader2, Star, User, Eye, Trash, Sparkles
} from "lucide-react";
import FormattedMarkdown from "../common/FormattedMarkdown";
import { uploadModelAnswer, getEssaySubmissions, gradeEssaySubmission, aiGradeEssay } from "@/app/actions/essay-grading";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseFileUrls } from "@/app/utils/file-utils";
import FormattedMarkdownForInstructors from "../common/FormattedMarkdownForInstructors";

interface EssayQuestion {
    id: string;
    content: string;
    type: string;
    modelAnswer: string | null;
    modelAnswerFileUrl: string | null;
    passage: { title: string | null; content: string } | null;
    submissions: EssaySubmission[];
}

interface EssaySubmission {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    answerText: string | null;
    fileUrl: string | null;
    score: number | null;
    feedback: string | null;
    gradedAt: string | null;
    gradedBy: string | null;
    isAiGraded: boolean;
    isFinalized: boolean;
    createdAt: string;
}

export default function EssayGradingPanel({ lessonId }: { lessonId: string }) {
    const [questions, setQuestions] = useState<EssayQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);
    const [gradingSubmission, setGradingSubmission] = useState<EssaySubmission | null>(null);
    const [gradingQuestion, setGradingQuestion] = useState<EssayQuestion | null>(null);

    // Model answer editing
    const [editingModelAnswer, setEditingModelAnswer] = useState<Record<string, string>>({});
    const [savingModelAnswer, setSavingModelAnswer] = useState<Record<string, boolean>>({});
    const [uploadingFile, setUploadingFile] = useState<Record<string, boolean>>({});

    // Grading form
    const [gradeScore, setGradeScore] = useState<number>(0);
    const [gradeFeedback, setGradeFeedback] = useState("");
    const [isGrading, setIsGrading] = useState(false);
    const [isAiGrading, setIsAiGrading] = useState(false);

    const supabase = createClient();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getEssaySubmissions(lessonId);
            if (result.success && result.data) {
                setQuestions(result.data);
                setIsLoaded(true);
            } else {
                toast.error(result.error || "Lỗi tải dữ liệu");
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [lessonId]);

    // Save model answer text
    const handleSaveModelAnswer = async (questionId: string) => {
        setSavingModelAnswer(prev => ({ ...prev, [questionId]: true }));
        try {
            const text = editingModelAnswer[questionId] || "";
            const result = await uploadModelAnswer(questionId, text);
            if (result.success) {
                toast.success(result.message);
                await loadData();
            } else {
                toast.error(result.error);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSavingModelAnswer(prev => ({ ...prev, [questionId]: false }));
        }
    };

    // Upload model answer files
    const handleFileUpload = async (questionId: string, files: FileList) => {
        setUploadingFile(prev => ({ ...prev, [questionId]: true }));
        try {
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 10 * 1024 * 1024) {
                    toast.error(`File ${file.name} vượt quá 10MB và sẽ bị bỏ qua.`);
                    continue;
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `${lessonId}/model-answer-${questionId}-${Date.now()}-${i}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from("quiz-attachments")
                    .upload(fileName, file, { upsert: true });

                if (uploadError) throw new Error(uploadError.message);

                const { data: publicUrlData } = supabase.storage
                    .from("quiz-attachments")
                    .getPublicUrl(fileName);

                uploadedUrls.push(publicUrlData.publicUrl);
            }

            if (uploadedUrls.length === 0) return;

            // Get existing urls
            const question = questions.find(q => q.id === questionId);
            const existingUrls = parseFileUrls(question?.modelAnswerFileUrl);
            const newUrls = [...existingUrls, ...uploadedUrls];

            const result = await uploadModelAnswer(questionId, undefined, JSON.stringify(newUrls));
            if (result.success) {
                toast.success(`Đã tải lên ${uploadedUrls.length} file đáp án mẫu.`);
                await loadData();
            } else {
                toast.error(result.error);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setUploadingFile(prev => ({ ...prev, [questionId]: false }));
        }
    };

    // Delete a model answer file page
    const handleDeleteModelAnswerFile = async (questionId: string, urlToDelete: string) => {
        const question = questions.find(q => q.id === questionId);
        if (!question) return;

        const existingUrls = parseFileUrls(question.modelAnswerFileUrl);
        const filteredUrls = existingUrls.filter(url => url !== urlToDelete);

        // If no files left, we clear the field by passing null
        const newUrlParam = filteredUrls.length > 0 ? JSON.stringify(filteredUrls) : null;

        try {
            const result = await uploadModelAnswer(questionId, undefined, newUrlParam);
            if (result.success) {
                toast.success("Đã xóa file đáp án mẫu.");
                await loadData();
            } else {
                toast.error(result.error);
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    // Open grading modal
    const openGrading = (question: EssayQuestion, submission: EssaySubmission) => {
        setGradingQuestion(question);
        setGradingSubmission(submission);
        setGradeScore(submission.score ?? 0);
        setGradeFeedback(submission.feedback || "");
    };

    // Submit grade
    const handleGrade = async () => {
        if (!gradingSubmission) return;
        setIsGrading(true);
        try {
            const result = await gradeEssaySubmission(gradingSubmission.id, gradeScore, gradeFeedback, true);
            if (result.success) {
                toast.success(result.message);
                setGradingSubmission(null);
                setGradingQuestion(null);
                await loadData();
            } else {
                toast.error(result.error);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsGrading(false);
        }
    };

    // AI grade
    const handleAiGrade = async () => {
        if (!gradingSubmission) return;
        setIsAiGrading(true);
        try {
            const result = await aiGradeEssay(gradingSubmission.id);
            if (result.success) {
                toast.success(result.message);
                setGradeScore(result.suggestedScore ?? 0);
                setGradeFeedback(result.suggestedFeedback ?? "");
                // Update local data
                await loadData();
            } else {
                toast.error(result.error);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsAiGrading(false);
        }
    };

    // Status badge
    const getStatusBadge = (sub: EssaySubmission) => {
        if (sub.isFinalized) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                    <CheckCircle size={10} /> Đã chấm
                </span>
            );
        }
        if (sub.isAiGraded) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    <Bot size={10} /> AI đã chấm
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                <Clock size={10} /> Chờ chấm
            </span>
        );
    };

    if (!isLoaded) {
        return (
            <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <BookOpen className="text-indigo-600" size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800 text-lg">Chấm bài Tự luận</h3>
                        <p className="text-sm text-slate-500">Xem bài nộp tự luận, upload đáp án mẫu và chấm điểm.</p>
                    </div>
                </div>
                <button
                    onClick={loadData}
                    disabled={isLoading}
                    className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                    {isLoading ? "Đang tải..." : "Tải danh sách bài tự luận"}
                </button>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm text-center">
                <BookOpen className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 text-sm">Chưa có câu hỏi tự luận nào trong bài học này.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <BookOpen className="text-indigo-600" size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 text-lg">Chấm bài Tự luận</h3>
                    <p className="text-sm text-slate-500">{questions.length} câu hỏi · {questions.reduce((acc, q) => acc + q.submissions.length, 0)} bài nộp</p>
                </div>
                <button onClick={loadData} className="ml-auto text-sm text-indigo-600 hover:underline flex items-center gap-1">
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : null} Tải lại
                </button>
            </div>

            {questions.map((q, qIdx) => (
                <div key={q.id} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                    {/* Question Header */}
                    <button
                        onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                        className="w-full p-4 flex items-start gap-3 hover:bg-stone-50 transition-colors text-left"
                    >
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0 mt-0.5">
                            {q.type === "READING_COMPREHENSION" ? "Đọc hiểu" : "Tự luận"}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 line-clamp-2">{q.content}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-stone-400">{q.submissions.length} bài nộp</span>
                                {q.modelAnswer && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle size={10} /> Có đáp án mẫu
                                    </span>
                                )}
                                {!q.modelAnswer && (
                                    <span className="text-xs text-amber-600 flex items-center gap-1">
                                        <Clock size={10} /> Chưa có đáp án mẫu
                                    </span>
                                )}
                            </div>
                        </div>
                        {expandedQ === q.id ? <ChevronUp size={16} className="text-stone-400 mt-1" /> : <ChevronDown size={16} className="text-stone-400 mt-1" />}
                    </button>

                    {expandedQ === q.id && (
                        <div className="border-t border-stone-100 p-4 space-y-4">
                            {/* Đáp án mẫu Section */}
                            <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
                                <h4 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                    <FileText size={14} /> Đáp án mẫu / Hướng dẫn chấm
                                </h4>
                                <textarea
                                    value={editingModelAnswer[q.id] ?? q.modelAnswer ?? ""}
                                    onChange={(e) => setEditingModelAnswer(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Nhập đáp án mẫu, ý chính cần đạt, hoặc rubric chấm điểm (hỗ trợ Markdown)..."
                                    className="w-full min-h-[120px] p-3 rounded-lg border border-indigo-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y bg-white text-black"
                                />
                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        onClick={() => handleSaveModelAnswer(q.id)}
                                        disabled={savingModelAnswer[q.id]}
                                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {savingModelAnswer[q.id] ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Lưu đáp án mẫu
                                    </button>

                                    <label className="px-4 py-2 rounded-lg border border-indigo-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-2">
                                        {uploadingFile[q.id] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        Upload file
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.doc,.docx,image/*"
                                            className="hidden"
                                            disabled={uploadingFile[q.id]}
                                            onChange={(e) => {
                                                const files = e.target.files;
                                                if (files && files.length > 0) handleFileUpload(q.id, files);
                                            }}
                                        />
                                    </label>
                                </div>

                                {q.modelAnswerFileUrl && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {parseFileUrls(q.modelAnswerFileUrl).map((url, idx) => (
                                            <div key={url} className="flex items-center gap-2 text-xs text-indigo-800 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                                                <a href={url} target="_blank" rel="noreferrer" className="font-semibold hover:underline flex items-center gap-1">
                                                    <Eye size={12} className="text-indigo-500" /> File trang {idx + 1}
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteModelAnswerFile(q.id, url)}
                                                    className="text-red-500 hover:text-red-700 transition-colors p-0.5 rounded hover:bg-red-50"
                                                    title="Xóa trang này"
                                                >
                                                    <Trash size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Submissions List */}
                            {q.submissions.length === 0 ? (
                                <p className="text-sm text-stone-400 italic text-center py-4">Chưa có học viên nộp bài cho câu này.</p>
                            ) : (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
                                        <User size={14} /> Danh sách bài nộp ({q.submissions.length})
                                    </h4>
                                    {q.submissions.map(sub => (
                                        <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-100 hover:border-stone-200 hover:bg-stone-50/50 transition-all">
                                            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500 overflow-hidden shrink-0">
                                                {sub.userAvatar ? (
                                                    <img src={sub.userAvatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    sub.userName?.[0]?.toUpperCase() || "U"
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-stone-700 truncate">{sub.userName}</p>
                                                <p className="text-xs text-stone-400 line-clamp-1">{sub.answerText?.slice(0, 80) || "(Đính kèm file)"}{sub.answerText && sub.answerText.length > 80 ? "..." : ""}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {getStatusBadge(sub)}
                                                {sub.score != null && (
                                                    <span className="text-sm font-bold text-stone-700 flex items-center gap-1">
                                                        <Star size={12} className="text-amber-500" /> {sub.score}/10
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => openGrading(q, sub)}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                                                >
                                                    Chấm
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Grading Modal */}
            {gradingSubmission && gradingQuestion && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setGradingSubmission(null); setGradingQuestion(null); }}>
                    <div className="bg-white text-stone-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                            <div>
                                <h3 className="font-bold text-stone-800 text-lg">Chấm bài tự luận</h3>
                                <p className="text-xs text-stone-500 mt-0.5">Học viên: <span className="font-bold text-stone-800">{gradingSubmission.userName}</span></p>
                            </div>
                            <button onClick={() => { setGradingSubmission(null); setGradingQuestion(null); }} className="text-stone-400 hover:text-stone-600">
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Bài làm */}
                                <div>
                                    <h4 className="text-sm font-bold text-stone-800 mb-2 flex items-center gap-2">
                                        <User size={14} /> Bài làm của học viên
                                    </h4>

                                    {/* Câu hỏi */}
                                    <div className="bg-stone-50 rounded-lg p-3.5 mb-3 text-sm text-stone-900 border border-stone-200 font-medium">
                                        <span className="font-bold text-stone-900">Câu hỏi: </span>
                                        {gradingQuestion.content}
                                    </div>

                                    {/* Bài làm */}
                                    <div className="bg-white rounded-lg p-4 border border-stone-200 min-h-[200px] text-stone-900">
                                        {gradingSubmission.answerText ? (
                                            <FormattedMarkdownForInstructors content={gradingSubmission.answerText} className="text-stone-900" />
                                        ) : (
                                            <p className="text-sm text-stone-400 italic">Không có nội dung text.</p>
                                        )}
                                        {gradingSubmission.fileUrl && (
                                            <div className="mt-3 space-y-2">
                                                <span className="text-xs font-bold text-stone-600 block">Hình ảnh bài làm ({parseFileUrls(gradingSubmission.fileUrl).length}):</span>
                                                <div className="flex flex-col gap-3">
                                                    {parseFileUrls(gradingSubmission.fileUrl).map((url, idx) => {
                                                        const isImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(url);
                                                        return (
                                                            <div key={url} className="border border-stone-200 rounded-lg p-2 bg-stone-50 text-stone-900">
                                                                <div className="flex items-center justify-between text-xs mb-1">
                                                                    <span className="font-semibold text-stone-700">Trang {idx + 1}</span>
                                                                    <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-semibold">
                                                                        <Eye size={10} /> Mở tab mới
                                                                    </a>
                                                                </div>
                                                                {isImage ? (
                                                                    <img src={url} alt={`Trang ${idx + 1}`} className="max-h-[500px] w-full object-contain rounded border border-stone-200 bg-white" />
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-stone-800 p-2 text-sm bg-white border border-stone-200 rounded">
                                                                        <FileText size={16} />
                                                                        <span className="truncate flex-1 font-medium">{url.split('/').pop()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Tiêu chí chấm điểm */}
                                <div>
                                    <h4 className="text-sm font-bold text-stone-800 mb-2 flex items-center gap-2">
                                        <FileText size={14} /> Tiêu chí chấm điểm (Rubric)
                                    </h4>
                                    <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100 min-h-[200px] text-stone-900">
                                        {(() => {
                                            let parsedRubric: any = null;
                                            let plainAnswer: string | null = null;
                                            try {
                                                if (gradingQuestion.modelAnswer && gradingQuestion.modelAnswer.trim().startsWith("{")) {
                                                    const obj = JSON.parse(gradingQuestion.modelAnswer);
                                                    if (obj.rubric || obj.isRubric) {
                                                        parsedRubric = obj.rubric || obj;
                                                    } else if (obj.answer) {
                                                        plainAnswer = obj.answer;
                                                    }
                                                } else {
                                                    plainAnswer = gradingQuestion.modelAnswer;
                                                }
                                            } catch (e) {
                                                plainAnswer = gradingQuestion.modelAnswer;
                                            }

                                            if (parsedRubric) {
                                                return (
                                                    <div className="bg-white p-3.5 rounded-xl border border-indigo-200 text-xs text-stone-900 space-y-3 shadow-xs">
                                                        <div className="font-bold text-indigo-900 border-b border-indigo-100 pb-2 flex justify-between items-center">
                                                            <span className="flex items-center gap-1.5 font-bold text-sm">
                                                                <Sparkles size={16} className="text-indigo-600" />
                                                                Tiêu chí chấm điểm (Rubric AI)
                                                            </span>
                                                            <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold text-xs">
                                                                Tổng: {parsedRubric.totalScore || parsedRubric.score || 10}đ
                                                            </span>
                                                        </div>
                                                        {parsedRubric.general && (
                                                            <div>
                                                                <span className="font-bold text-indigo-900 text-xs block mb-1">Yêu cầu chung:</span>
                                                                <div className="text-stone-800 font-medium pl-2.5 border-l-2 border-indigo-300 leading-relaxed text-xs">
                                                                    <FormattedMarkdownForInstructors content={parsedRubric.general} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {parsedRubric.criteria && (
                                                            <div className="space-y-2 mt-2">
                                                                <span className="font-bold text-indigo-900 text-xs block mb-1">Tiêu chí chi tiết:</span>
                                                                {parsedRubric.criteria.map((c: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-start bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100 text-stone-900 font-medium text-xs">
                                                                        <div className="flex-1 pr-3">
                                                                            <span className="font-bold text-indigo-900 block mb-1">{c.label || `Ý ${idx + 1}`}:</span>
                                                                            <FormattedMarkdownForInstructors content={c.description} />
                                                                        </div>
                                                                        <span className="font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md shrink-0">{c.score}đ</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            if (plainAnswer) {
                                                return <FormattedMarkdown content={plainAnswer} className="text-stone-900" />;
                                            }

                                            return <p className="text-sm text-indigo-400 italic">Chưa có tiêu chí chấm điểm / đáp án mẫu.</p>;
                                        })()}

                                        {gradingQuestion.modelAnswerFileUrl && (
                                            <div className="mt-3 space-y-2">
                                                <span className="text-xs font-bold text-indigo-800 block">File đính kèm ({parseFileUrls(gradingQuestion.modelAnswerFileUrl).length}):</span>
                                                <div className="flex flex-col gap-3">
                                                    {parseFileUrls(gradingQuestion.modelAnswerFileUrl).map((url, idx) => {
                                                        const isImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(url);
                                                        return (
                                                            <div key={url} className="border border-indigo-150 rounded-lg p-2 bg-indigo-50/30 text-stone-900">
                                                                <div className="flex items-center justify-between text-xs mb-1">
                                                                    <span className="font-semibold text-indigo-800">Trang {idx + 1}</span>
                                                                    <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold">
                                                                        <Eye size={10} /> Mở tab mới
                                                                    </a>
                                                                </div>
                                                                {isImage ? (
                                                                    <img src={url} alt={`Đáp án trang ${idx + 1}`} className="max-h-[500px] w-full object-contain rounded border border-indigo-100 bg-white" />
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-indigo-800 p-2 text-sm bg-white border border-indigo-100 rounded">
                                                                        <FileText size={16} />
                                                                        <span className="truncate flex-1 font-medium">{url.split('/').pop()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grading Form */}
                            <div className="mt-6 bg-amber-50/50 rounded-lg p-4 border border-amber-100 text-stone-900">
                                <h4 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                    <Star size={14} /> Chấm điểm
                                </h4>

                                <div className="flex items-center gap-4 mb-3">
                                    <label className="text-sm font-semibold text-stone-700">Điểm (0-10):</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={0.5}
                                        value={gradeScore}
                                        onChange={(e) => setGradeScore(parseFloat(e.target.value) || 0)}
                                        className="w-24 px-3 py-2 rounded-lg border border-amber-200 text-center font-bold text-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                    <div className="flex gap-1">
                                        {[0, 2, 4, 5, 6, 7, 8, 9, 10].map(v => (
                                            <button
                                                key={v}
                                                onClick={() => setGradeScore(v)}
                                                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${gradeScore === v ? "bg-amber-500 text-white" : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"}`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea
                                    value={gradeFeedback}
                                    onChange={(e) => setGradeFeedback(e.target.value)}
                                    placeholder="Nhận xét chi tiết cho học viên (hỗ trợ Markdown)..."
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-amber-200 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y font-medium"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between bg-stone-50">
                            <button
                                onClick={handleAiGrade}
                                disabled={isAiGrading || !gradingSubmission.answerText}
                                className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isAiGrading ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                                AI Gợi ý điểm
                            </button>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setGradingSubmission(null); setGradingQuestion(null); }}
                                    className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-100 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleGrade}
                                    disabled={isGrading}
                                    className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isGrading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    Xác nhận điểm ({gradeScore}/10)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
