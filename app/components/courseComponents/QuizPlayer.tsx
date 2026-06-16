"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2, PlayCircle, Bot, FileText, User } from "lucide-react";
import confetti from "canvas-confetti"; // (Optional) Hiệu ứng pháo hoa: npm install canvas-confetti @types/canvas-confetti
import { submitQuiz } from "@/app/actions/student-quiz";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
    id: string;
    content: string;
    type: "MULTIPLE_CHOICE" | "ESSAY";
    options: string[]; // ["A. ...", "B. ..."]
    contentImageUrl?: string | null;
    timestamp?: number; // thời điểm trong video (giây)
    quizSource?: "AI_VIDEO" | "MANUAL" | "WORKSHEET";
}

interface AnswerState {
    selectedOption?: string;
    answerText?: string;
    fileUrl?: string;
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

    // Xử lý khi nhập text tự luận
    const handleTextChange = (qId: string, text: string) => {
        if (result) return;
        setAnswers(prev => ({
            ...prev,
            [qId]: { ...prev[qId], answerText: text }
        }));
    };

    // Xử lý khi upload file tự luận
    const handleFileUpload = async (qId: string, file: File) => {
        if (result) return;
        
        // Kiểm tra dung lượng (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("File quá lớn. Vui lòng chọn file dưới 5MB.");
            return;
        }

        try {
            setUploadingFiles(prev => ({ ...prev, [qId]: true }));
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${lessonId}/submissions/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from("quiz-attachments")
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from("quiz-attachments")
                .getPublicUrl(fileName);

            setAnswers(prev => ({
                ...prev,
                [qId]: { ...prev[qId], fileUrl: publicUrl }
            }));

        } catch (error) {
            console.error("Upload error:", error);
            alert("Không thể tải file lên. Vui lòng thử lại.");
        } finally {
            setUploadingFiles(prev => ({ ...prev, [qId]: false }));
        }
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
            fileUrl: val.fileUrl
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

                return (
                    <div key={q.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm overflow-hidden">
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

                        {/* OPTIONS HOẶC ESSAY INPUT */}
                        {q.type === "MULTIPLE_CHOICE" ? (
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
                        ) : (
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
                                        <span>Hoặc đính kèm hình ảnh/file đáp án:</span>
                                        {uploadingFiles[q.id] && <Loader2 size={16} className="animate-spin text-[#C5A059]" />}
                                    </label>
                                    
                                    {!answers[q.id]?.fileUrl ? (
                                        <input
                                            type="file"
                                            disabled={!!result || uploadingFiles[q.id]}
                                            accept="image/*,application/pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileUpload(q.id, file);
                                            }}
                                            className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C5A059]/10 file:text-[#C5A059] hover:file:bg-[#C5A059]/20 transition-all disabled:opacity-50"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                                            <span className="text-sm text-stone-700 truncate max-w-[200px] md:max-w-md">
                                                Đã đính kèm file
                                            </span>
                                            <a href={answers[q.id].fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                                                Xem file
                                            </a>
                                            {!result && (
                                                <button
                                                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: { ...prev[q.id], fileUrl: undefined } }))}
                                                    className="ml-auto text-red-500 text-sm hover:underline"
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
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