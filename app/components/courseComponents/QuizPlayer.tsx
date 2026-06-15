"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2, PlayCircle } from "lucide-react";
import confetti from "canvas-confetti"; // (Optional) Hiệu ứng pháo hoa: npm install canvas-confetti @types/canvas-confetti
import { submitQuiz } from "@/app/actions/student-quiz";
import { useRouter } from "next/navigation";

interface Question {
    id: string;
    content: string;
    options: string[]; // ["A. ...", "B. ..."]
    timestamp?: number; // thời điểm trong video (giây)
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
    initialAnswers?: Record<string, string>,
    onSeek?: (time: number) => void
}) {
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(initialAnswers || {});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<any>(initialResult || null); // Lưu kết quả trả về từ server

    // Xử lý khi chọn đáp án
    const handleSelect = (qId: string, optionPrefix: string) => {
        if (result) return; // Đã nộp rồi thì không cho chọn lại
        setSelectedAnswers(prev => ({
            ...prev,
            [qId]: optionPrefix
        }));
    };

    const router = useRouter();

    // Xử lý nộp bài
    const handleSubmit = async () => {
        // Validate: Phải chọn hết câu hỏi
        if (Object.keys(selectedAnswers).length < questions.length) {
            alert("Vui lòng trả lời hết các câu hỏi trước khi nộp!");
            return;
        }

        setIsSubmitting(true);

        // Convert state thành mảng gửi lên server
        const payload = Object.entries(selectedAnswers).map(([qid, val]) => ({
            questionId: qid,
            selectedOption: val
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
            return selectedAnswers[qId] === optionPrefix
                ? "bg-[#C5A059] text-white border-[#C5A059]"
                : "bg-white hover:bg-stone-100 border-stone-200";
        }

        // Đã nộp:
        const feedback = result.feedback.find((f: any) => f.questionId === qId);
        const isSelected = selectedAnswers[qId] === optionPrefix;
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
                    <div key={q.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex justify-between items-start gap-4  mb-5">
                            <div className="flex gap-3 items-start w-full">
                                {/* 1. Ô STT: Đổi sang màu tối, chữ trắng để nổi bật (hết bị chìm) */}
                                <span className="flex-shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded bg-[#1a1a1a] text-[#C5A059] text-xs font-bold uppercase tracking-wider shadow-sm mt-1 select-none">
                                    Câu {index + 1}
                                </span>

                                {/* 2. Nội dung câu hỏi và nút tua video */}
                                <div className="flex-1 flex flex-col pt-0.5 gap-2">
                                    <h4 className="font-bold text-stone-800 text-lg leading-snug">
                                        {q.content}
                                    </h4>
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

                        {/* OPTIONS */}
                        <div className="grid grid-cols-1 gap-3">
                            {q.options.map((opt, i) => {
                                // Giả sử option string là "A. Nội dung..."
                                // Ta cần tách lấy prefix "A", "B"... để so sánh
                                // Hoặc nếu bạn lưu option chỉ là text, thì cần logic map index sang A,B,C,D
                                // Ở đây giả sử bạn lưu chuẩn format: "A. Text" hoặc logic của bạn là so sánh index A,B,C,D
                                const prefix = ["A", "B", "C", "D"][i];

                                return (
                                    <button
                                        key={i}
                                        disabled={!!result}
                                        onClick={() => handleSelect(q.id, prefix)}
                                        className={`text-left p-3 rounded-lg border transition-all ${getOptionStyle(q.id, prefix)}`}
                                    >
                                        <span className="font-semibold mr-2">{prefix}.</span>
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>

                        {/* GIẢI THÍCH (Chỉ hiện khi đã nộp) */}
                        {result && feedback?.explanation && (
                            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex gap-2 items-start">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-bold">Giải thích: </span>
                                    {feedback.explanation}
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