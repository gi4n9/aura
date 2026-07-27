"use client";

import { useAuth } from "@/app/components/AuthProvider";
import { Camera, ChevronDown, RefreshCw, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import UserAvatar from "@/app/components/common/UserAvatar";
import { updateUserProfile, syncGoogleAvatar } from "@/app/actions/user-profile";
import { toast } from "sonner";

export default function SettingPage() {
    const { user, profile } = useAuth();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [displayName, setDisplayName] = useState(profile?.fullName || "");
    const [birthDate, setBirthDate] = useState("2004-02-02");
    const [phoneNumber, setPhoneNumber] = useState("+84782446689");
    const [occupation, setOccupation] = useState("Undergraduate");
    const [country, setCountry] = useState("Vietnam");
    const [city, setCity] = useState("Hà Nội");
    
    const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl || null);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (profile?.fullName) setDisplayName(profile.fullName);
        if (profile?.avatarUrl) setAvatarUrl(profile.avatarUrl);
    }, [profile]);

    const handleSyncGoogle = async () => {
        setSyncing(true);
        const result = await syncGoogleAvatar();
        setSyncing(false);

        if (result.success && result.avatarUrl) {
            setAvatarUrl(result.avatarUrl);
            toast.success(t("settings.syncGoogleSuccess", "Đã đồng bộ avatar từ Google thành công!"));
        } else {
            toast.error(result.error || t("settings.syncGoogleError", "Không tìm thấy avatar từ tài khoản Google"));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const result = await updateUserProfile({
            fullName: displayName.trim(),
            avatarUrl: avatarUrl,
            phoneNumber,
            birthDate,
            occupation,
            country,
            city
        });
        setSaving(false);

        if (result.success) {
            toast.success(t("settings.saveSuccess", "Cập nhật thông tin hồ sơ thành công!"));
        } else {
            toast.error(result.error || t("settings.saveError", "Có lỗi xảy ra khi lưu thông tin"));
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className={`mb-8 border-b pb-4 ${isDark ? "border-white/10" : "border-stone-100"}`}>
                <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-stone-800"}`}>
                    {t("settings.profileTitle", "Hồ sơ cá nhân")}
                </h2>
            </div>

            {/* Avatar Upload / Google Sync */}
            <div className="flex flex-wrap items-center gap-6 mb-10">
                <div className="relative group cursor-pointer">
                    <UserAvatar
                        src={avatarUrl}
                        name={displayName || user?.email}
                        size={96}
                        className="border-2 border-[#C5A059] shadow-md"
                    />
                    <div className="absolute bottom-0 right-0 bg-[#C5A059] text-white p-2 rounded-full border-2 border-white shadow-sm group-hover:bg-[#b08d4b] transition-colors">
                        <Camera size={16} />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <h3 className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-stone-800"}`}>
                        {displayName || user?.email?.split("@")[0] || "User Name"}
                    </h3>
                    <p className={`text-sm mb-3 ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                        {t("settings.avatarSubtitle", "Quản lý ảnh đại diện của bạn")}
                    </p>
                    <button
                        type="button"
                        onClick={handleSyncGoogle}
                        disabled={syncing}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                            isDark
                                ? "bg-white/5 border-white/10 text-[#C5A059] hover:bg-white/10"
                                : "bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200"
                        }`}
                    >
                        {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {t("settings.syncGoogleAvatar", "Đồng bộ từ Google")}
                    </button>
                </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

                {/* Full Name */}
                <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                        {t("settings.fullName", "Họ và tên")} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all ${
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder-stone-500"
                                : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                        }`}
                    />
                </div>

                {/* Birthday */}
                <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                        {t("settings.birthDate", "Ngày sinh")}
                    </label>
                    <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all ${
                            isDark
                                ? "bg-white/5 border-white/10 text-white"
                                : "bg-stone-50 border-stone-200 text-stone-700"
                        }`}
                    />
                </div>

                {/* Email */}
                <div className="space-y-1.5 md:col-span-2">
                    <label className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                        {t("settings.email", "Email")} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className={`w-full px-4 py-3 rounded-lg text-sm border cursor-not-allowed ${
                            isDark
                                ? "bg-white/[0.02] border-white/5 text-stone-500"
                                : "bg-stone-100 border-stone-200 text-stone-500"
                        }`}
                    />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                        {t("settings.phoneNumber", "Số điện thoại")}
                    </label>
                    <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all ${
                            isDark
                                ? "bg-white/5 border-white/10 text-white placeholder-stone-500"
                                : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                        }`}
                    />
                </div>

                {/* Occupation */}
                <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                        {t("settings.occupation", "Nghề nghiệp")}
                    </label>
                    <div className="relative">
                        <select
                            value={occupation}
                            onChange={(e) => setOccupation(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg text-sm appearance-none border focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all ${
                                isDark
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-stone-50 border-stone-200 text-stone-900"
                            }`}
                        >
                            <option value="Undergraduate" className={isDark ? "bg-stone-900 text-white" : ""}>{t("settings.student", "Sinh viên")}</option>
                            <option value="Developer" className={isDark ? "bg-stone-900 text-white" : ""}>{t("settings.developer", "Lập trình viên")}</option>
                            <option value="Designer" className={isDark ? "bg-stone-900 text-white" : ""}>{t("settings.designer", "Thiết kế")}</option>
                            <option value="Other" className={isDark ? "bg-stone-900 text-white" : ""}>{t("settings.other", "Khác")}</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                        {t("settings.country", "Quốc gia")}
                    </label>
                    <div className="relative">
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg text-sm appearance-none border focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all ${
                                isDark
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-stone-50 border-stone-200 text-stone-900"
                            }`}
                        >
                            <option value="Vietnam" className={isDark ? "bg-stone-900 text-white" : ""}>Vietnam</option>
                            <option value="USA" className={isDark ? "bg-stone-900 text-white" : ""}>United States</option>
                            <option value="Other" className={isDark ? "bg-stone-900 text-white" : ""}>{t("settings.other", "Khác")}</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                    </div>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                    <label className={`text-sm font-semibold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                        {t("settings.city", "Tỉnh thành")}
                    </label>
                    <div className="relative">
                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg text-sm appearance-none border focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] transition-all ${
                                isDark
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-stone-50 border-stone-200 text-stone-900"
                            }`}
                        >
                            <option value="Hà Nội" className={isDark ? "bg-stone-900 text-white" : ""}>Hà Nội</option>
                            <option value="Hồ Chí Minh" className={isDark ? "bg-stone-900 text-white" : ""}>TP. Hồ Chí Minh</option>
                            <option value="Đà Nẵng" className={isDark ? "bg-stone-900 text-white" : ""}>Đà Nẵng</option>
                            <option value="Other" className={isDark ? "bg-stone-900 text-white" : ""}>{t("settings.other", "Khác")}</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                    </div>
                </div>

            </div>

            {/* Submit Button */}
            <div className="flex justify-end mb-12">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3 bg-[#1a1a1a] text-[#C5A059] font-bold rounded-lg hover:bg-stone-800 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {t("settings.saveChanges", "Lưu thay đổi")}
                </button>
            </div>

            {/* Delete Account */}
            <div className={`border-t pt-8 ${isDark ? "border-white/10" : "border-stone-100"}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className={`font-bold mb-1 ${isDark ? "text-white" : "text-stone-800"}`}>
                            {t("settings.deleteAccountTitle", "Xoá tài khoản")}
                        </h4>
                        <p className={`text-xs ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            {t("settings.deleteAccountSubtitle", "Xóa vĩnh viễn tất cả tiến trình học tập và dữ liệu của bạn")}
                        </p>
                    </div>
                    <button type="button" className="text-sm font-bold text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1 group">
                        {t("settings.continue", "Tiếp tục")} <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            </div>
        </form>
    );
}