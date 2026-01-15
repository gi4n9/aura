"use client";

import { useState } from "react";
import { Pencil, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateCourse } from "@/app/actions/course";

interface DescriptionFormProps {
    initialData: {
        description: string | null;
    };
    courseId: string;
}

export const DescriptionForm = ({ initialData, courseId }: DescriptionFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [description, setDescription] = useState(initialData.description || "");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const toggleEdit = () => setIsEditing((current) => !current);

    const onSubmit = async () => {
        try {
            setIsLoading(true);
            const res = await updateCourse(courseId, { description: description });
            if (res.success) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert(res.error);
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
                Mô tả khóa học
                <button onClick={toggleEdit} className="text-[#C5A059] hover:underline flex items-center gap-1">
                    {isEditing ? "Hủy" : <><Pencil className="h-4 w-4" /> Sửa</>}
                </button>
            </div>

            {!isEditing && (
                <p className={`text-sm mt-2 ${!initialData.description && "text-stone-400 italic"}`}>
                    {initialData.description || "Chưa có mô tả..."}
                </p>
            )}

            {isEditing && (
                <div className="mt-2 space-y-2">
                    <textarea
                        disabled={isLoading}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full p-2 bg-white border border-stone-300 rounded-md outline-none focus:ring-2 focus:ring-[#C5A059]"
                    />
                    <button
                        onClick={onSubmit}
                        disabled={isLoading}
                        className="bg-[#1a1a1a] text-white text-xs px-3 py-2 rounded-md font-bold hover:bg-stone-800 transition flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
                    </button>
                </div>
            )}
        </div>
    );
};