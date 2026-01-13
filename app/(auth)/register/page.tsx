"use client";

import Link from "next/link";
import { register } from "./action";
import { useTransition, useState } from "react";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleRegister = (formData: FormData) => {
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const res = await register(formData);

            if (res?.error) {
                setError(res.error);
            } else if (res?.success) {
                setSuccess(res.message);
            }
            // Nếu redirect thì Next.js tự xử lý
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F8F4]">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-stone-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-stone-800 font-serif">Đăng ký</h1>
                    <p className="text-stone-500 mt-2 text-sm">Tạo tài khoản để bắt đầu học tập</p>
                </div>

                {/* Thông báo Lỗi */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-100">
                        {error}
                    </div>
                )}

                {/* Thông báo Thành công (Check mail) */}
                {success ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center border border-green-100">
                        <p className="font-medium">{success}</p>
                        <Link href="/login" className="text-sm underline mt-2 block hover:text-green-800">
                            Quay lại đăng nhập
                        </Link>
                    </div>
                ) : (
                    <form action={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Họ và tên</label>
                            <input
                                name="fullName"
                                type="text"
                                required
                                placeholder="Nguyễn Văn A"
                                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="name@example.com"
                                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Mật khẩu</label>
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                minLength={6}
                                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none transition"
                            />
                        </div>

                        <button
                            disabled={isPending}
                            className="w-full bg-[#1a1a1a] hover:bg-stone-800 text-white py-2.5 rounded-lg font-medium transition flex justify-center items-center gap-2 mt-2"
                        >
                            {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : "Tạo tài khoản"}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm text-stone-500">
                    Đã có tài khoản?{" "}
                    <Link href="/login" className="text-[#C5A059] font-medium hover:underline">
                        Đăng nhập ngay
                    </Link>
                </div>
            </div>
        </div>
    );
}