"use client";

import { useState } from "react";
import { Trash, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { publishCourse, unpublishCourse } from "@/app/actions/course";

interface CourseActionsProps {
    disabled: boolean;
    courseId: string;
    isPublished: boolean;
}

export const CourseActions = ({ disabled, courseId, isPublished }: CourseActionsProps) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        try {
            setIsLoading(true);

            if (isPublished) {
                // Đang Public -> Muốn Gỡ
                const res = await unpublishCourse(courseId);
                if (res.success) {
                    alert("Đã chuyển về bản nháp!");
                    router.refresh();
                }
            } else {
                // Đang Draft -> Muốn Public
                const res = await publishCourse(courseId);
                if (res.success) {
                    alert("Xuất bản khóa học thành công!");
                    // Có thể thêm hiệu ứng bắn pháo hoa (confetti) ở đây nếu muốn
                    router.refresh();
                } else {
                    alert(res.error);
                }
            }
        } catch {
            alert("Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    const onDelete = async () => {
        // Logic xóa khóa học (Bạn có thể thêm action deleteCourse sau)
        const ok = confirm("Bạn chắc chắn muốn xóa khóa học này?");
        if (ok) alert("Tính năng đang phát triển");
    }

    return (
        <div className="flex items-center gap-x-2">
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
                onClick={onDelete}
                disabled={isLoading}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
            >
                <Trash size={18} />
            </button>
        </div>
    );
};