"use client";

import { useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateCourse } from "@/app/actions/course";

interface PriceFormProps {
    initialData: {
        price: number | null;
    };
    courseId: string;
}

export const PriceForm = ({ initialData, courseId }: PriceFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [price, setPrice] = useState(initialData.price ? String(initialData.price) : "0");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const toggleEdit = () => setIsEditing((current) => !current);

    const onSubmit = async () => {
        try {
            setIsLoading(true);
            const res = await updateCourse(courseId, { price: parseFloat(price) });
            if (res.success) {
                setIsEditing(false);
                router.refresh();
            }
        } catch {
            alert("Lỗi");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 border border-stone-200 bg-stone-50 rounded-md p-4">
            <div className="font-bold text-stone-500 text-xs uppercase flex items-center justify-between">
                Giá khóa học
                <button onClick={toggleEdit} className="text-[#C5A059] hover:underline flex items-center gap-1">
                    {isEditing ? "Hủy" : <><Pencil className="h-4 w-4" /> Sửa</>}
                </button>
            </div>

            {!isEditing && (
                <p className="text-stone-800 font-medium mt-2 text-sm">
                    {initialData.price
                        ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(initialData.price)
                        : "Miễn phí"
                    }
                </p>
            )}

            {isEditing && (
                <div className="mt-2 space-y-2">
                    <input
                        type="number"
                        disabled={isLoading}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-300 rounded-md outline-none focus:ring-2 focus:ring-[#C5A059]"
                        placeholder="Nhập giá tiền (VNĐ)..."
                    />
                    <button
                        onClick={onSubmit}
                        disabled={isLoading}
                        className="bg-[#1a1a1a] text-white text-xs px-3 py-2 rounded-md font-bold hover:bg-stone-800 transition flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu giá"}
                    </button>
                </div>
            )}
        </div>
    );
};