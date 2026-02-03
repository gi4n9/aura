"use client";

import { useState } from "react";
import { Trash, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateChapter, deleteChapter } from "@/app/actions/chapter";
import { toast } from "sonner";

interface ChapterActionsProps {
    disabled: boolean;
    courseId: string;
    chapterId: string;
    isPublished: boolean;
    onDelete?: () => void; // Optional callbak for delete
}

export const ChapterActions = ({ disabled, courseId, chapterId, isPublished, onDelete }: ChapterActionsProps) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        try {
            setIsLoading(true);

            if (isPublished) {
                // Đang Public -> Muốn Gỡ
                const res = await updateChapter(courseId, chapterId, { isPublished: false });
                if (res.success) {
                    toast.success("Đã chuyển chương về bản nháp!");
                    router.refresh();
                } else {
                    toast.error(res.error);
                }
            } else {
                // Đang Draft -> Muốn Public
                const res = await updateChapter(courseId, chapterId, { isPublished: true });
                if (res.success) {
                    toast.success("Xuất bản chương thành công!");
                    router.refresh();
                } else {
                    toast.error(res.error);
                }
            }
        } catch {
            toast.error("Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        const ok = confirm("Bạn chắc chắn muốn xóa chương này và toàn bộ bài học bên trong?");
        if (!ok) return;

        try {
            setIsLoading(true);
            const res = await deleteChapter(courseId, chapterId);
            if (res.success) {
                toast.success("Đã xóa chương thành công");
                router.refresh();
                if (onDelete) onDelete();
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("Lỗi xóa chương");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center gap-x-2 animate-in fade-in slide-in-from-right-4">
            <button
                onClick={onClick}
                disabled={disabled || isLoading}
                className={`px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all flex items-center gap-2 ${isPublished
                    ? "bg-stone-200 text-stone-600 hover:bg-stone-300"
                    : disabled
                        ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                        : "bg-[#1a1a1a] text-[#C5A059] hover:shadow-lg hover:scale-105"
                    }`}
            >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPublished ? "Ngưng xuất bản" : "Xuất bản"}
            </button>

            {/* Nút xóa nhỏ bên cạnh */}
            <button
                onClick={handleDelete}
                disabled={isLoading}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                title="Xóa chương này"
            >
                <Trash size={18} />
            </button>
        </div>
    );
};
