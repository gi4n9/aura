"use client";

import { useAuth } from "@/app/components/AuthProvider";
import { Camera, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function SettingPage() {
    const { user, profile } = useAuth();

    // Placeholder state for form fields
    const [formData, setFormData] = useState({
        displayName: profile?.fullName || "",
        birthDate: "02/02/2004", // Example from screenshot
        email: user?.email || "",
        phoneNumber: "+84782446689", // Example
        occupation: "Undergraduate",
        country: "Vietnam",
        city: "Hà Nội"
    });

    return (
        <>
            {/* Header */}
            <div className="mb-8 border-b border-stone-100 pb-4">
                <h2 className="text-2xl font-bold text-stone-800">Hồ sơ</h2>
            </div>

            {/* Avatar Upload */}
            <div className="flex items-center gap-6 mb-10">
                <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-stone-100 shadow-inner">
                        <Image
                            src={profile?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                            alt="Avatar"
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                        />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-[#C5A059] text-white p-2 rounded-full border-2 border-white shadow-sm group-hover:bg-[#b08d4b] transition-colors">
                        <Camera size={16} />
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-stone-800">{profile?.fullName || "User Name"}</h3>
                    <p className="text-sm text-stone-500">Thay đổi ảnh đại diện của bạn</p>
                </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

                {/* Full Name */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">
                        Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all"
                    />
                </div>

                {/* Birthday */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">
                        Ngày sinh <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all text-stone-600"
                    />
                </div>

                {/* Email */}
                <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-stone-600">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-lg text-sm text-stone-500 cursor-not-allowed"
                    />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">
                        Số điện thoại
                    </label>
                    <input
                        type="text"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all"
                    />
                </div>

                {/* Occupation */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">
                        Nghề nghiệp
                    </label>
                    <div className="relative">
                        <select
                            value={formData.occupation}
                            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all"
                        >
                            <option value="Undergraduate">Sinh viên</option>
                            <option value="Developer">Lập trình viên</option>
                            <option value="Designer">Thiết kế</option>
                            <option value="Other">Khác</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">
                        Quốc gia <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <select
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all"
                        >
                            <option value="Vietnam">Vietnam</option>
                            <option value="USA">United States</option>
                            <option value="Other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-600">
                        Tỉnh thành
                    </label>
                    <div className="relative">
                        <select
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all"
                        >
                            <option value="Hà Nội">Hà Nội</option>
                            <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                            <option value="Đà Nẵng">Đà Nẵng</option>
                            <option value="Other">Khác</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                    </div>
                </div>

            </div>

            {/* Submit Button */}
            <div className="flex justify-end mb-12">
                <button className="px-8 py-3 bg-[#1a1a1a] text-white font-bold rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg shadow-stone-200 flex items-center gap-2">
                    Lưu thay đổi
                </button>
            </div>

            {/* Delete Account */}
            <div className="border-t border-stone-100 pt-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-stone-800 mb-1">Xoá tài khoản</h4>
                        <p className="text-xs text-stone-500">Xóa vĩnh viễn tất cả tiến trình học tập và dữ liệu của bạn</p>
                    </div>
                    <button className="text-sm font-bold text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1 group">
                        Tiếp tục <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            </div>
        </>
    );
}