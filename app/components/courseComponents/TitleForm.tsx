"use client";

import { useState } from "react";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateCourse } from "@/app/actions/course";

interface TitleFormProps {
    initialData: {
        title: string;
    };
    courseId: string;
}

export const TitleForm = ({ initialData, courseId }: TitleFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(initialData.title);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const toggleEdit = () => {
        setIsEditing((current) => !current);
        setTitle(initialData.title); // Reset nếu hủy
    };

    const onSubmit = async () => {
        try {
            setIsLoading(true);
            const res = await updateCourse(courseId, { title: title });

            if (res.success) {
                setIsEditing(false);
                router.refresh(); // Refresh để cập nhật dữ liệu mới nhất
            } else {
                alert("Lỗi: " + res.error);
            }
        } catch {
            alert("Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 border border-stone-200 bg-stone-50 rounded-md p-4">
            <div className="font-bold text-stone-500 text-xs uppercase flex items-center justify-between">
                Tên khóa học
                <button onClick={toggleEdit} className="text-[#C5A059] hover:underline flex items-center gap-1">
                    {isEditing ? (
                        <>Hủy</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4" /> Sửa
                        </>
                    )}
                </button>
            </div>

            {!isEditing && (
                <p className="text-stone-800 font-medium mt-2 text-sm">
                    {initialData.title}
                </p>
            )}

            {isEditing && (
                <div className="mt-2 space-y-2">
                    <input
                        disabled={isLoading}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-300 rounded-md outline-none focus:ring-2 focus:ring-[#C5A059]"
                        autoFocus
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSubmit}
                            disabled={isLoading || !title}
                            className="bg-[#1a1a1a] text-white text-xs px-3 py-2 rounded-md font-bold hover:bg-stone-800 transition flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Lưu
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};