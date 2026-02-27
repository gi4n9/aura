"use client";

import { useState } from "react";
import { generateMindmap, generateFlashcards } from "@/app/actions/ai-lesson-content";

export default function AIGeneratorButton({ lessonId, transcript }: { lessonId: string, transcript: string }) {
    // Quản lý trạng thái loading và tiến trình
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0); // Từ 0 đến 100
    const [statusText, setStatusText] = useState("");

    // Hàm tạo độ trễ ở phía Client
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const handleGenerateAIContent = async () => {
        setIsGenerating(true);
        setProgress(10);
        setStatusText("Đang phân tích video và tạo Mindmap...");

        try {
            // 1. Gọi hàm tạo Mindmap TRƯỚC
            const mindmapRes = await generateMindmap(lessonId, transcript, false);
            if (!mindmapRes.success) {
                throw new Error(mindmapRes.error || "Lỗi khi tạo Mindmap");
            }

            // Cập nhật UI khi xong Mindmap
            setProgress(50);
            setStatusText("Đã xong Mindmap! Đang nghỉ vài giây để hệ thống ổn định...");

            // 2. NGHỈ GIỮA HIỆP (Rất quan trọng để tránh lỗi 429)
            // Nghỉ khoảng 5-8 giây (5000ms - 8000ms) cho an toàn
            await delay(6000);

            // 3. Cập nhật UI và gọi hàm tạo Flashcards SAU
            setProgress(60);
            setStatusText("Đang tiến hành tạo Flashcards học tập...");

            const flashcardRes = await generateFlashcards(lessonId, transcript, false);
            if (!flashcardRes.success) {
                throw new Error(flashcardRes.error || "Lỗi khi tạo Flashcards");
            }

            // 4. Hoàn tất toàn bộ
            setProgress(100);
            setStatusText("Tuyệt vời! Đã tạo xong toàn bộ nội dung AI.");

            // (Tùy chọn) Đợi 1 chút rồi ẩn thanh progress hoặc reload trang
            await delay(2000);
            setIsGenerating(false);

        } catch (error: any) {
            console.error("Lỗi quá trình tạo AI:", error);
            setProgress(0);
            setStatusText(`❌ Đã xảy ra lỗi: ${error.message}. Vui lòng thử lại sau.`);
            setIsGenerating(false); // Hoặc bạn có thể giữ state để hiện thông báo lỗi
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            {/* Nút bấm kích hoạt */}
            <button
                onClick={handleGenerateAIContent}
                disabled={isGenerating}
                className={`px-6 py-2 rounded-lg font-semibold text-white transition-all 
          ${isGenerating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
            >
                {isGenerating ? "Hệ thống AI đang làm việc..." : "Tạo Mindmap & Flashcards AI"}
            </button>

            {/* Giao diện UI/UX hiển thị Progress */}
            {isGenerating && (
                <div className="w-full max-w-md mt-4">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            {statusText}
                        </span>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            {progress}%
                        </span>
                    </div>

                    {/* Thanh Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
}