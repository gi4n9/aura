"use client";

import { useState } from "react";
import { updateUserProfile } from "@/app/actions/user-profile";
import { User, Mail, Save, Loader2, Shield, Image as ImageIcon, Sparkles } from "lucide-react";
import Image from "next/image";

interface ProfileFormProps {
    initialData: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
        role: string;
    };
}

const PRESET_AVATARS = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
];

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || "");

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setMsg("");
        const res = await updateUserProfile(formData);
        setIsLoading(false);
        if (res.success) setMsg("✅ Đã lưu thông tin hồ sơ.");
        else setMsg("❌ " + res.error);
    };

    const roleColor =
        initialData.role === "ADMIN" ? "bg-red-500/10 text-red-400 border-red-500/30" :
            initialData.role === "INSTRUCTOR" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30";

    return (
        <div className="bg-[#0e0e0e] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                    <User className="text-[#C5A059]" size={20} />
                    Thông tin cá nhân
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${roleColor}`}>
                    <Shield size={12} /> {initialData.role}
                </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
                {/* Avatar Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/10">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#C5A059] shadow-xl bg-stone-900 shrink-0">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt="Avatar"
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-[#C5A059] font-serif">
                                {(initialData.name || initialData.email).charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                        <h3 className="text-lg font-bold font-serif">{initialData.name || "Học viên Aura"}</h3>
                        <p className="text-stone-400 text-xs">{initialData.email}</p>
                        
                        {/* Avatar Presets */}
                        <div className="flex items-center gap-2 pt-2 justify-center sm:justify-start">
                            <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider mr-1">Mẫu nhanh:</span>
                            {PRESET_AVATARS.map((url, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setAvatarUrl(url)}
                                    className={`w-7 h-7 rounded-full overflow-hidden border transition-all relative ${
                                        avatarUrl === url ? "border-[#C5A059] ring-2 ring-[#C5A059]/50 scale-110" : "border-white/20 hover:border-white/50"
                                    }`}
                                >
                                    <Image src={url} alt="Preset" fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <form action={handleSubmit} className="space-y-6">
                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                            <Mail size={14} /> Email đăng nhập
                        </label>
                        <input
                            type="email"
                            value={initialData.email}
                            disabled
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-stone-400 cursor-not-allowed focus:outline-none text-sm"
                        />
                        <p className="text-[10px] text-stone-500 italic">Email cố định gắn liền với tài khoản Supabase Auth.</p>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                            <User size={14} /> Họ và tên hiển thị
                        </label>
                        <input
                            name="fullName"
                            defaultValue={initialData.name || ""}
                            placeholder="Nhập tên hiển thị của bạn"
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all text-sm"
                        />
                    </div>

                    {/* Avatar URL */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon size={14} /> Đường dẫn ảnh Đại diện (Avatar URL)
                        </label>
                        <input
                            name="avatarUrl"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://example.com/avatar.jpg"
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-stone-500 focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all text-sm"
                        />
                        <p className="text-[10px] text-stone-500">Dán đường dẫn ảnh đính kèm (URL) hoặc chọn mẫu nhanh phía trên.</p>
                    </div>

                    {msg && <p className="text-sm font-medium animate-pulse text-[#C5A059]">{msg}</p>}

                    <div className="pt-4 border-t border-white/10 flex justify-end">
                        <button
                            disabled={isLoading}
                            className="px-6 py-3 bg-[#C5A059] text-[#080808] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#b08d4b] transition-all flex items-center gap-2 disabled:opacity-70 shadow-lg cursor-pointer"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Lưu thông tin hồ sơ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}