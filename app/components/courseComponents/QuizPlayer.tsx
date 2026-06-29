"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2, PlayCircle, Bot, FileText, User, BookOpen, Clock, Eye, Trash } from "lucide-react";
import confetti from "canvas-confetti"; // (Optional) Hiệu ứng pháo hoa: npm install canvas-confetti @types/canvas-confetti
import { submitQuiz } from "@/app/actions/student-quiz";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseFileUrls } from "@/app/utils/file-utils";

interface Question {
    id: string;
    content: string;
    type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE" | "FILL_IN_BLANK" | "READING_COMPREHENSION";
    options: string[]; // ["A. ...", "B. ..."]
    contentImageUrl?: string | null;
    timestamp?: number; // thời điểm trong video (giây)
    quizSource?: "AI_VIDEO" | "MANUAL" | "WORKSHEET";
    subItems?: { id: string; label: string; content: string; position: number; isCorrect?: boolean }[];
    passage?: { id: string; title: string | null; content: string } | null;
}

interface AnswerState {
    selectedOption?: string;
    answerText?: string;
    fileUrl?: string;
    subItemAnswers?: Record<string, boolean>; // subItemId -> boolean
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
    const [answers, setAnswers] = useState<Record<string, AnswerState>>(initialAnswers || {});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<any>(initialResult || null); // Lưu kết quả trả về từ server
    const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

    const supabase = createClient();

    // Xử lý khi chọn đáp án trắc nghiệm
    const handleSelectOption = (qId: string, optionPrefix: string) => {
        if (result) return;
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], selectedOption: optionPrefix }
        }));
    };

    // Xử lý khi chọn Đúng/Sai cho mệnh đề
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

    // Xử lý khi nhập text (tự luận / điền khuyết)
    const handleTextChange = (qId: string, text: string) => {
        if (result) return;
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], answerText: text }
        }));
    };

    // Xử lý khi upload nhiều file tự luận
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
                const fileName = `${lessonId}/submissions/${Date.now()}_${Math.random().toString(36).substring(7)}_${i}.${fileExt}`;

                const { error } = await supabase.storage
                    .from("quiz-attachments")
                    .upload(fileName, file);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from("quiz-attachments")
                    .getPublicUrl(fileName);

                uploadedUrls.push(publicUrl);
            }

            if (uploadedUrls.length === 0) return;

            // Nối vào danh sách file cũ của câu hỏi này
            const existingUrls = parseFileUrls(answers[qId]?.fileUrl);
            const newUrls = [...existingUrls, ...uploadedUrls];

            setAnswers(prev => ({
                ...prev,
                [qId]: { ...prev[qId], fileUrl: JSON.stringify(newUrls) }
            }));

        } catch (error) {
            console.error("Upload error:", error);
            alert("Không thể tải file lên. Vui lòng thử lại.");
        } finally {
            setUploadingFiles(prev => ({ ...prev, [qId]: false }));
        }
    };

    // Xử lý xóa một file đính kèm của học sinh
    const handleDeleteSubmissionFile = (qId: string, urlToDelete: string) => {
        const existingUrls = parseFileUrls(answers[qId]?.fileUrl);
        const filteredUrls = existingUrls.filter(url => url !== urlToDelete);
        
        setAnswers(prev => ({
            ...prev,
            [qId]: { 
                ...prev[qId], 
                fileUrl: filteredUrls.length > 0 ? JSON.stringify(filteredUrls) : undefined 
            }
        }));
    };

    const router = useRouter();

    // Xử lý nộp bài
    const handleSubmit = async () => {
        // Validate: Phải trả lời hết các câu hỏi
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

        // Convert state thành payload
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
            // Hiệu ứng pháo hoa nếu điểm cao
            if (res.score ?? 0 >= 80) confetti();
            // Scroll lên đầu để xem kết quả
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Ép UI tải lại dữ liệu từ Server Component (cập nhật thanh tiến độ)
            router.refresh();
        } else {
            alert(res.error);
        }
    };

    // Helper để lấy style cho từng option sau khi nộp
    const getOptionStyle = (qId: string, optionPrefix: string) => {
        if (!result) {
            // Chưa nộp: Highlight cái đang chọn
            return answers[qId]?.selectedOption === optionPrefix
                ? "bg-[#C5A059] text-white border-[#C5A059]"
                : "bg-white hover:bg-stone-100 border-stone-200";
        }

        // Đã nộp:
        const feedback = result.feedback.find((f: any) => f.questionId === qId);
        const isSelected = answers[qId]?.selectedOption === optionPrefix;

        // Nếu không có feedback (vd câu tự luận), mặc định
        if (!feedback) return "bg-stone-50 border-stone-200 opacity-50";

        const isCorrectAnswer = feedback.correctAnswer === optionPrefix;

        if (isCorrectAnswer) return "bg-green-100 border-green-500 text-green-700 font-bold"; // Đáp án đúng (luôn hiện xanh)
        if (isSelected && !feedback.isCorrect) return "bg-red-100 border-red-500 text-red-700"; // Chọn sai (hiện đỏ)

        return "bg-stone-50 border-stone-200 opacity-50"; // Các câu khác làm mờ
    };

    if (questions.length === 0) {
        return <div className="text-stone-500 italic">Bài học này chưa có câu hỏi ôn tập.</div>;
    }

    return (
        <div className="space-y-8 py-6">

            {/* HEADER KẾT QUẢ */}
            {result && (
                <div className={`p-6 rounded-xl text-center border-2 ${result.score >= 50 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <h3 className="text-2xl font-bold mb-2">
                        Kết quả: {result.score ?? 0}/100 điểm
                    </h3>
                    <p className="text-stone-600">
                        Bạn đã làm đúng <span className="font-bold">{result.correctCount}/{result.total}</span> câu hỏi.
                    </p>
                </div>
            )}

            {/* DANH SÁCH CÂU HỎI */}
            {questions.map((q, index) => {
                const feedback = result?.feedback.find((f: any) => f.questionId === q.id);
                // Kiểm tra xem có cần render passage (nếu là câu hỏi đầu tiên của passage này)
                const isFirstInPassage = q.passage && (index === 0 || questions[index - 1]?.passage?.id !== q.passage.id);

                return (
                    <div key={q.id} className="space-y-4">
                        {isFirstInPassage && (
                            <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                                <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                                    <BookOpen size={18} />
                                    {q.passage!.title || "Ngữ liệu đọc hiểu"}
                                </h4>
                                <div className="prose prose-sm max-w-none text-amber-950 prose-p:my-1">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {q.passage!.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                            <div className="flex justify-between items-start gap-4 mb-5 min-w-0">
                                <div className="flex gap-3 items-start w-full min-w-0">
                                    <div className="flex flex-row gap-2 items-center shrink-0 mt-1">
                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded bg-[#1a1a1a] text-[#C5A059] text-xs font-bold uppercase tracking-wider shadow-sm select-none">
                                            Câu {index + 1}
                                        </span>
                                        {q.quizSource === "AI_VIDEO" && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1.5 rounded whitespace-nowrap">
                                                <Bot size={12} /> AI
                                            </span>
                                        )}
                                        {q.quizSource === "WORKSHEET" && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded whitespace-nowrap">
                                                <FileText size={12} /> Phiếu BT
                                            </span>
                                        )}
                                        {q.quizSource === "MANUAL" && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1.5 rounded whitespace-nowrap">
                                                <User size={12} /> Thủ công
                                            </span>
                                        )}
                                    </div>

                                    {/* 2. Nội dung câu hỏi và nút tua video */}
                                    <div className="flex-1 min-w-0 flex flex-col pt-0.5 gap-2">
                                        {q.contentImageUrl && (
                                            <div className="mb-3">
                                                <img src={q.contentImageUrl} alt="Question image" className="max-h-60 rounded-lg border border-stone-200 object-contain" />
                                            </div>
                                        )}
                                        <div className="prose prose-sm md:prose-base max-w-none text-stone-800 prose-p:my-1 font-medium leading-snug w-full min-w-0">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    pre: ({ children }) => (
                                                        <pre className="bg-[#1a1a1a] text-slate-100 rounded-lg p-3 my-2 overflow-x-auto text-xs md:text-sm w-full max-w-full block border border-stone-850 scrollbar-thin">
                                                            {children}
                                                        </pre>
                                                    ),
                                                    code: ({ inline, children, className, ...props }: any) => {
                                                        return inline ? (
                                                            <code className="bg-stone-100 text-[#C5A059] px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                                                {children}
                                                            </code>
                                                        ) : (
                                                            <code className={`${className} font-mono`} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {q.content}
                                            </ReactMarkdown>
                                        </div>
                                        {q.timestamp != null && onSeek && (
                                            <button
                                                onClick={() => onSeek(q.timestamp!)}
                                                className="self-start text-[10px] font-bold uppercase tracking-wider bg-stone-100 hover:bg-stone-200 text-stone-600 px-2 py-1 rounded flex items-center gap-1 transition-colors mt-1"
                                            >
                                                <PlayCircle size={12} />
                                                Xem lại video ({Math.floor(q.timestamp / 60)}:{String(q.timestamp % 60).padStart(2, '0')})
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Icon đúng sai */}
                                {result && (
                                    <div className="flex-shrink-0 ml-2 mt-1">
                                        {feedback?.isCorrect ? (
                                            <CheckCircle className="text-green-500 fill-green-50" size={24} />
                                        ) : (
                                            <XCircle className="text-red-500 fill-red-50" size={24} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* OPTIONS HOẶC INPUT THEO TYPE */}
                            {q.type === "MULTIPLE_CHOICE" && (
                                <div className="grid grid-cols-1 gap-3 mt-4">
                                    {q.options.map((opt, i) => {
                                        const prefix = ["A", "B", "C", "D"][i];

                                        return (
                                            <button
                                                key={i}
                                                disabled={!!result}
                                                onClick={() => handleSelectOption(q.id, prefix)}
                                                className={`text-left p-3 rounded-lg border transition-all ${getOptionStyle(q.id, prefix)}`}
                                            >
                                                <span className="font-semibold mr-2">{prefix}.</span>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {q.type === "TRUE_FALSE" && (
                                <div className="mt-4 border rounded-xl overflow-hidden border-stone-200 divide-y divide-stone-200">
                                    <div className="bg-stone-50 grid grid-cols-[1fr_80px_80px] p-3 text-sm font-bold text-stone-600 text-center">
                                        <div className="text-left">Mệnh đề</div>
                                        <div>Đúng</div>
                                        <div>Sai</div>
                                    </div>
                                    {q.subItems?.map((sub) => {
                                        const subAnswer = answers[q.id]?.subItemAnswers?.[sub.id];
                                        const fbSubItem = feedback?.subItemFeedback?.[sub.id]; // Nếu server trả về kết quả từng ý
                                        const isCorrectFb = fbSubItem?.isCorrect; // true nếu sv chọn đúng theo barem

                                        const getTrueBtnClass = () => {
                                            if (!result) {
                                                return subAnswer === true ? "border-green-500 bg-green-500" : "border-stone-300 bg-white hover:border-green-400";
                                            }
                                            const isCorrectAns = sub.isCorrect === true;
                                            if (subAnswer === true) {
                                                return isCorrectAns ? "bg-green-500 border-green-500" : "bg-red-500 border-red-500";
                                            }
                                            if (subAnswer === false && isCorrectAns) {
                                                return "border-green-500 border-dashed bg-green-50";
                                            }
                                            return "border-stone-200 bg-stone-50 opacity-40";
                                        };

                                        const getFalseBtnClass = () => {
                                            if (!result) {
                                                return subAnswer === false ? "border-red-500 bg-red-500" : "border-stone-300 bg-white hover:border-red-400";
                                            }
                                            const isCorrectAns = sub.isCorrect === false;
                                            if (subAnswer === false) {
                                                return isCorrectAns ? "bg-green-500 border-green-500" : "bg-red-500 border-red-500";
                                            }
                                            if (subAnswer === true && isCorrectAns) {
                                                return "border-green-500 border-dashed bg-green-50";
                                            }
                                            return "border-stone-200 bg-stone-50 opacity-40";
                                        };

                                        return (
                                            <div key={sub.id} className="grid grid-cols-[1fr_80px_80px] p-3 items-center hover:bg-stone-50 transition-colors">
                                                <div className="pr-4 text-sm font-medium text-stone-700 flex items-start gap-2">
                                                    <span className="font-bold text-stone-900">{sub.label}.</span>
                                                    <span>{sub.content}</span>
                                                    {result && (
                                                        isCorrectFb ? (
                                                            <span className="inline-flex items-center text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">✓ Đúng</span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">✗ Sai</span>
                                                        )
                                                    )}
                                                </div>
                                                <div className="flex justify-center border-l border-stone-200">
                                                    <button
                                                        disabled={!!result}
                                                        onClick={() => handleSubItemSelect(q.id, sub.id, true)}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${getTrueBtnClass()}`}
                                                    >
                                                        {subAnswer === true && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                                    </button>
                                                </div>
                                                <div className="flex justify-center border-l border-stone-200">
                                                    <button
                                                        disabled={!!result}
                                                        onClick={() => handleSubItemSelect(q.id, sub.id, false)}
                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${getFalseBtnClass()}`}
                                                    >
                                                        {subAnswer === false && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {q.type === "FILL_IN_BLANK" && (
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        disabled={!!result}
                                        placeholder="Nhập câu trả lời ngắn của bạn vào đây..."
                                        value={answers[q.id]?.answerText || ""}
                                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                                        className={`w-full p-4 rounded-xl border-2 outline-none font-semibold text-lg transition-all 
                                        ${result ? (feedback?.isCorrect ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700") : "border-stone-200 focus:border-[#C5A059]"}`}
                                    />
                                    {result && !feedback?.isCorrect && (
                                        <div className="mt-2 text-sm text-green-600 font-bold">
                                            Đáp án đúng: {feedback?.correctAnswer}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(q.type === "ESSAY" || q.type === "READING_COMPREHENSION") && (
                                <div className="mt-4 space-y-4">
                                    <textarea
                                        disabled={!!result}
                                        placeholder="Nhập câu trả lời của bạn vào đây..."
                                        value={answers[q.id]?.answerText || ""}
                                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                                        className="w-full min-h-[120px] p-4 rounded-xl border border-stone-200 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none transition-all disabled:bg-stone-50 disabled:text-stone-500 resize-y"
                                    />

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-stone-700 flex items-center justify-between">
                                            <span>Đính kèm hình ảnh/file bài làm (có thể chọn nhiều file):</span>
                                            {uploadingFiles[q.id] && <Loader2 size={16} className="animate-spin text-[#C5A059]" />}
                                        </label>

                                        {!result && (
                                            <input
                                                type="file"
                                                multiple
                                                disabled={uploadingFiles[q.id]}
                                                accept="image/*,application/pdf"
                                                onChange={(e) => {
                                                    const files = e.target.files;
                                                    if (files && files.length > 0) handleFileUpload(q.id, files);
                                                }}
                                                className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C5A059]/10 file:text-[#C5A059] hover:file:bg-[#C5A059]/20 transition-all disabled:opacity-50"
                                            />
                                        )}

                                        {answers[q.id]?.fileUrl && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {parseFileUrls(answers[q.id].fileUrl).map((url, idx) => (
                                                    <div key={url} className="flex items-center gap-2 text-xs text-stone-700 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm">
                                                        <a href={url} target="_blank" rel="noreferrer" className="font-semibold hover:underline flex items-center gap-1">
                                                            <Eye size={12} className="text-stone-500" /> Bài làm trang {idx + 1}
                                                        </a>
                                                        {!result && (
                                                            <button
                                                                onClick={() => handleDeleteSubmissionFile(q.id, url)}
                                                                className="text-red-500 hover:text-red-700 transition-colors p-0.5 rounded hover:bg-red-100"
                                                                title="Xóa trang này"
                                                            >
                                                                <Trash size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Trạng thái chấm điểm tự luận (hiện sau khi nộp) */}
                                    {result && (
                                        <div className="mt-4 space-y-4">
                                            {feedback?.isPendingGrading ? (
                                                <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-xl flex gap-3 items-center border border-amber-200 shadow-sm">
                                                    <Clock size={18} className="shrink-0 text-amber-600 animate-pulse" />
                                                    <div>
                                                        <span className="font-bold block">Bài làm đang chờ chấm điểm</span>
                                                        <span className="text-amber-700/80 text-xs">Giảng viên đang chấm điểm hoặc duyệt kết quả. Bạn sẽ nhận được kết quả sau khi hoàn tất.</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {/* Kết quả chấm điểm */}
                                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                                                <CheckCircle size={18} className="text-emerald-600" />
                                                                Kết quả chấm điểm tự luận
                                                            </span>
                                                            <span className="text-lg font-black text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-lg">
                                                                {feedback?.essayScore ?? 0}/10 điểm
                                                            </span>
                                                        </div>
                                                        {feedback?.essayFeedback && (
                                                            <div className="mt-3 pt-3 border-t border-emerald-200/50">
                                                                <span className="text-xs font-bold text-emerald-800 block mb-1">💬 Nhận xét của giáo viên:</span>
                                                                <div className="prose prose-sm max-w-none text-emerald-950">
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                        {feedback.essayFeedback}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Đáp án mẫu từ giáo viên */}
                                                    {(feedback?.modelAnswer || feedback?.modelAnswerFileUrl) && (
                                                        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                                            <h5 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                                                <FileText size={16} className="text-indigo-600" />
                                                                Đáp án mẫu / Hướng dẫn chấm
                                                            </h5>
                                                            {feedback.modelAnswer && (
                                                                <div className="prose prose-sm max-w-none text-indigo-950 bg-white/60 p-3 rounded-lg border border-indigo-100/50">
                                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                        {feedback.modelAnswer}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            )}
                                                            {feedback.modelAnswerFileUrl && (
                                                                <div className="mt-3 space-y-2">
                                                                    <span className="text-xs text-[#C5A059] font-semibold block">Tài liệu hướng dẫn đính kèm ({parseFileUrls(feedback.modelAnswerFileUrl).length}):</span>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                        {parseFileUrls(feedback.modelAnswerFileUrl).map((url, idx) => {
                                                                            const isImage = /\.(png|jpe?g|webp|gif)($|\?)/i.test(url);
                                                                            return (
                                                                                <div key={url} className="border border-indigo-100 rounded-lg p-2 bg-white/85">
                                                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                                                        <span className="font-semibold text-indigo-850">Trang {idx + 1}</span>
                                                                                        <a href={url} target="_blank" rel="noreferrer" className="text-[#C5A059] hover:underline flex items-center gap-1">
                                                                                            <Eye size={10} /> Xem ảnh lớn
                                                                                        </a>
                                                                                    </div>
                                                                                    {isImage ? (
                                                                                        <img src={url} alt={`Đáp án mẫu trang ${idx + 1}`} className="max-h-60 w-full object-contain rounded border border-indigo-50 bg-white" />
                                                                                    ) : (
                                                                                        <div className="flex items-center gap-2 text-indigo-800 p-2 text-sm bg-white border border-indigo-50 rounded">
                                                                                            <FileText size={16} />
                                                                                            <span className="truncate flex-1">{url.split('/').pop()}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* GIẢI THÍCH (Chỉ hiện khi đã nộp) */}
                            {result && feedback?.explanation && (
                                <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex gap-2 items-start min-w-0 overflow-hidden">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0 prose prose-sm max-w-none text-blue-800 prose-p:my-0">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                pre: ({ children }) => (
                                                    <pre className="bg-[#1a1a1a] text-slate-100 rounded-lg p-3 my-2 overflow-x-auto text-xs w-full max-w-full block border border-stone-850">
                                                        {children}
                                                    </pre>
                                                ),
                                                code: ({ inline, children, className, ...props }: any) => {
                                                    return inline ? (
                                                        <code className="bg-blue-100/50 text-blue-900 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <code className={`${className} font-mono`} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {`**Giải thích:** ${feedback.explanation}`}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* SUBMIT BUTTON */}
            {!result && (
                <div className="sticky bottom-4 bg-white/90 backdrop-blur p-4 border rounded-xl shadow-lg border-stone-200">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-3 bg-[#1a1a1a] text-white font-bold rounded-lg hover:bg-stone-800 transition flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Nộp bài & Xem kết quả"}
                    </button>
                </div>
            )}
        </div>
    );
}