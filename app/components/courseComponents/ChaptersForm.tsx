"use client";

import { useState } from "react";
import { PlusCircle, Loader2, Eye, EyeOff, Pencil, FileQuestion } from "lucide-react"; // Added FileQuestion
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createChapter, updateChapter } from "@/app/actions/chapter";
import ChapterQuizModal from "./ChapterQuizModal"; // Import Modal

interface ChaptersFormProps {
    initialData: {
        chapters: { id: string; title: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; position: number }[];
    };
    courseId: string;
}

export const ChaptersForm = ({ initialData, courseId }: ChaptersFormProps) => {
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [editingChapter, setEditingChapter] = useState<{ id: string, title: string } | null>(null); // State for modal
    const router = useRouter();

    // ... (existing toggleCreating, onSubmit, onTogglePublish)
    const toggleCreating = () => {
        setIsCreating((current) => !current);
        setTitle("");
    };

    const onSubmit = async () => {
        if (!title) return;
        try {
            setIsLoading(true);
            const res = await createChapter(courseId, title);

            if (res.success) {
                toggleCreating();
                router.refresh();
            } else {
                alert(res.error);
            }
        } catch {
            alert("Lỗi khi tạo chương");
        } finally {
            setIsLoading(false);
        }
    };

    const onTogglePublish = async (chapterId: string, currentStatus: string) => {
        try {
            setIsLoading(true);
            const isPublished = currentStatus === "PUBLISHED";
            await updateChapter(courseId, chapterId, {
                isPublished: !isPublished,
            });
            router.refresh();
        } catch {
            alert("Có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 border border-stone-200 bg-stone-50 rounded-md p-4 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-md">
                    <Loader2 className="animate-spin text-[#C5A059]" />
                </div>
            )}

            <div className="font-bold text-stone-500 text-xs uppercase flex items-center justify-between">
                Các chương học

                <button onClick={toggleCreating} className="text-[#C5A059] hover:underline flex items-center gap-1">
                    {isCreating ? (
                        <>Hủy</>
                    ) : (
                        <>
                            <PlusCircle className="h-4 w-4" /> Thêm chương
                        </>
                    )}
                </button>
            </div>

            {isCreating && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ví dụ: Chương 1 - Giới thiệu..."
                        className="w-full p-2 bg-white border border-stone-300 rounded-md outline-none focus:ring-2 focus:ring-[#C5A059]"
                        autoFocus
                    />
                    <button
                        onClick={onSubmit}
                        disabled={!title || isLoading}
                        className="mt-2 bg-[#1a1a1a] text-white text-xs px-3 py-2 rounded-md font-bold hover:bg-stone-800 transition w-full flex justify-center items-center gap-2"
                    >
                        Tạo chương
                    </button>
                </div>
            )}

            {/* Danh sách chương đã tạo */}
            {!isCreating && (
                <div className={`mt-4 space-y-2 ${initialData.chapters.length === 0 && "text-stone-500 italic text-sm text-center"}`}>
                    {!initialData.chapters.length && "Chưa có chương nào. Hãy thêm chương đầu tiên!"}

                    {initialData.chapters.map((chapter) => (
                        <div
                            key={chapter.id}
                            className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-md shadow-sm hover:border-[#C5A059]/50 transition"
                        >
                            <Link href={`/instructor/courses/${courseId}/chapters/${chapter.id}`} className="flex-1 cursor-pointer">
                                <span className="text-sm font-medium text-stone-700 hover:text-[#C5A059] transition">
                                    {chapter.title}
                                </span>
                            </Link>

                            <div className="flex items-center gap-2">
                                {/* Badge Status */}
                                {chapter.status === "PUBLISHED" ? (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">Đã đăng</span>
                                ) : (
                                    <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded font-bold">Nháp</span>
                                )}

                                {/* Nút QUIZ (New) - Có thể giữ lại hoặc ẩn nếu muốn flow tập trung */}
                                <button
                                    onClick={() => setEditingChapter({ id: chapter.id, title: chapter.title })}
                                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100 transition"
                                    title="Quản lý câu hỏi trắc nghiệm nhanh"
                                >
                                    <FileQuestion size={14} /> Câu hỏi
                                </button>

                                {/* Nút Bật/Tắt Publish */}
                                <button
                                    onClick={() => onTogglePublish(chapter.id, chapter.status)}
                                    className="p-1 hover:bg-stone-100 rounded transition text-stone-500 hover:text-[#C5A059]"
                                    title={chapter.status === "PUBLISHED" ? "Gỡ bài" : "Đăng bài"}
                                >
                                    {chapter.status === "PUBLISHED" ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>

                                {/* Nút Sửa (Icon bút chì) -> Dẫn sang trang quản lý Lesson */}
                                <Link
                                    href={`/instructor/courses/${courseId}/chapters/${chapter.id}`}
                                    className="p-1 hover:bg-stone-100 rounded transition text-stone-500 hover:text-[#C5A059]"
                                    title="Quản lý bài học"
                                >
                                    <Pencil size={16} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Chapter Modal */}
            {editingChapter && (
                <ChapterQuizModal
                    chapterId={editingChapter.id}
                    chapterTitle={editingChapter.title}
                    onClose={() => setEditingChapter(null)}
                />
            )}
        </div>
    );
};
