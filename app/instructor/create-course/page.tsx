"use client";

import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Loader2, PlusCircle, User } from "lucide-react";

import { createClient } from "@/utils/supabase/client";

import { createCourse } from "@/app/actions/course";

export default function CreateCoursePage() {
    const [isPending, setIsPending] = useState(false);
    const [authorName, setAuthorName] = useState("Đang tải...");
    const router = useRouter();

    // 1. Lấy thông tin giảng viên để hiển thị (UX)
    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const name = user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split("@")[0];
                setAuthorName(name);
            } else {
                setAuthorName("Không xác định");
            }
        };

        fetchUser();
    }, []);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);

        // 👇 GỌI SERVER ACTION (createCourse)
        const res = await createCourse(formData);

        if (res?.success) {
            // Chuyển hướng sang trang Edit với ID vừa tạo
            // res.data chứa object course (bao gồm id)
            router.push(`/instructor/courses/${res.data?.id}/edit`);
            router.refresh();
        } else {
            alert(res?.error || "Có lỗi xảy ra khi tạo khóa học");
            setIsPending(false);
        }
    }

    return (
        <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border border-stone-200">
            <h1 className="text-2xl font-serif font-bold mb-6 text-stone-800 flex items-center gap-2">
                <PlusCircle className="text-[#C5A059]" /> Tạo Khóa Học Mới
            </h1>

            <form action={handleSubmit} className="space-y-6">
                {/* Tên khóa học */}
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Tên khóa học</label>
                    <input
                        name="title"
                        required
                        placeholder="Ví dụ: Lập trình Next.js từ cơ bản đến nâng cao..."
                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
                    />
                </div>

                {/* Giảng viên (Read-only) */}
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Giảng viên</label>
                    <div className="relative">
                        <input
                            disabled
                            value={authorName}
                            className="w-full p-3 pl-10 border border-stone-200 bg-stone-100 text-stone-500 rounded-lg cursor-not-allowed select-none"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    </div>
                    <p className="text-xs text-stone-400 mt-1 italic">
                        *Tự động lấy theo tài khoản đang đăng nhập.
                    </p>
                </div>

                {/* Mô tả */}
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Mô tả ngắn</label>
                    <textarea
                        name="description"
                        rows={4}
                        placeholder="Giới thiệu sơ lược về nội dung khóa học..."
                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all resize-none"
                    />
                </div>

                {/* Giá khóa học (Optional - nếu bạn muốn cho nhập ngay lúc tạo) */}
                {/* Nếu chưa cần nhập giá ngay thì có thể bỏ qua, chỉnh sửa sau */}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[#1a1a1a] text-[#C5A059] py-3 rounded-lg font-bold hover:bg-stone-800 hover:shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wide text-sm"
                >
                    {isPending ? <Loader2 className="animate-spin" /> : "Tạo & Tiếp tục"}
                </button>
            </form>
        </div>
    );
}