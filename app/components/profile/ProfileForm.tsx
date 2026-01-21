"use client";

import { useState } from "react";
import { updateUserProfile } from "@/app/actions/user-profile";
import { User, Mail, Save, Loader2, Shield } from "lucide-react";
import Image from "next/image";

interface ProfileFormProps {
    initialData: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: string; // "USER", "INSTRUCTOR", "ADMIN"
    };
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setMsg("");
        const res = await updateUserProfile(formData);
        setIsLoading(false);
        if (res.success) setMsg("✅ Đã lưu thay đổi.");
        else setMsg("❌ " + res.error);
    };

    // Xác định màu sắc dựa trên Role để dễ phân biệt
    const roleColor =
        initialData.role === "ADMIN" ? "bg-red-100 text-red-700 border-red-200" :
            initialData.role === "INSTRUCTOR" ? "bg-purple-100 text-purple-700 border-purple-200" :
                "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20";

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-[#F9F8F4] border-b border-stone-100 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-stone-800">Thông tin cá nhân</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${roleColor}`}>
                    <Shield size={12} /> {initialData.role}
                </span>
            </div>

            <div className="p-8">
                <div className="flex items-center gap-6 mb-8">
                    {/* Avatar Placeholder */}
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-stone-200">
                        <Image
                            src={initialData.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + initialData.name}
                            alt="Avatar"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">{initialData.name || "Chưa đặt tên"}</h3>
                        <p className="text-stone-500 text-sm">{initialData.email}</p>
                    </div>
                </div>

                <form action={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-600 flex items-center gap-2">
                            <Mail size={16} /> Email
                        </label>
                        <input
                            type="email"
                            value={initialData.email}
                            disabled
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-500 cursor-not-allowed focus:outline-none"
                        />
                        <p className="text-[10px] text-stone-400 italic">Email không thể thay đổi.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-600 flex items-center gap-2">
                            <User size={16} /> Họ và tên
                        </label>
                        <input
                            name="fullName"
                            defaultValue={initialData.name || ""}
                            placeholder="Nhập tên hiển thị của bạn"
                            className="w-full p-3 bg-white border border-stone-300 rounded-lg text-stone-800 focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all"
                        />
                    </div>

                    {msg && <p className="text-sm font-medium animate-pulse">{msg}</p>}

                    <div className="pt-4 border-t border-stone-100">
                        <button
                            disabled={isLoading}
                            className="px-6 py-3 bg-[#1a1a1a] text-white font-bold rounded-lg hover:bg-[#C5A059] transition-colors flex items-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Lưu thay đổi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}