"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { createPlaylist } from "@/app/actions/playlist";

export default function CreateCoursePage() {
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        const res = await createPlaylist(formData);

        if (res?.success) {
            alert("Tạo khóa học thành công!");
            router.push("/instructor/upload"); // Chuyển hướng sang trang upload
        } else {
            alert(res?.error || "Có lỗi xảy ra");
            setIsPending(false);
        }
    }

    return (
        <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border border-stone-200">
            <h1 className="text-2xl font-bold mb-6 text-stone-800 flex items-center gap-2">
                <PlusCircle className="text-[#C5A059]" /> Tạo Khóa Học Mới
            </h1>

            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">Tên khóa học</label>
                    <input
                        name="title"
                        required
                        placeholder="Ví dụ: Lập trình Next.js cơ bản..."
                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">Tên giảng viên</label>
                    <input
                        name="channel"
                        placeholder="Ví dụ: F8 Official"
                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-600 mb-1">Mô tả ngắn</label>
                    <textarea
                        name="description"
                        rows={3}
                        placeholder="Mô tả nội dung khóa học..."
                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[#1a1a1a] text-white py-3 rounded-lg font-bold hover:bg-stone-800 transition flex justify-center items-center gap-2"
                >
                    {isPending ? <Loader2 className="animate-spin" /> : "Tạo Khóa Học"}
                </button>
            </form>
        </div>
    );
}