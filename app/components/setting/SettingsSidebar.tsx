"use client";

import { User, Lock, History, Key, Users, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

export default function SettingsSidebar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const menuSections = [
        {
            title: t("settings.sectionAccount", "TÀI KHOẢN"),
            items: [
                { id: "profile", label: t("settings.profile", "Hồ sơ"), icon: User, href: "/setting" },
                { id: "password", label: t("settings.changePassword", "Đổi mật khẩu"), icon: Lock, href: "/setting/password" },
            ]
        },
        {
            title: t("settings.sectionBilling", "THANH TOÁN"),
            items: [
                { id: "history", label: t("settings.orderHistory", "Lịch sử đơn hàng"), icon: History, href: "/setting/history" },
            ]
        },
        {
            title: t("settings.sectionTools", "CÔNG CỤ"),
            items: [
                { id: "activation", label: t("settings.activationCode", "Mã kích hoạt"), icon: Key, href: "/setting/activation" },
                { id: "family", label: t("settings.familyManagement", "Quản lý gia đình"), icon: Users, href: "/setting/family" },
            ]
        },
        {
            title: t("settings.sectionSettings", "CÀI ĐẶT"),
            items: [
                { id: "devices", label: t("settings.deviceManagement", "Quản lý thiết bị"), icon: Smartphone, href: "/setting/devices" },
            ]
        }
    ];

    return (
        <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
            {menuSections.map((section, idx) => (
                <div key={idx}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 px-3 ${
                        isDark ? "text-stone-500" : "text-stone-400"
                    }`}>
                        {section.title}
                    </h3>
                    <div className="space-y-1">
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.href === "/setting"
                                ? pathname === "/setting"
                                : pathname.startsWith(item.href);

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? isDark
                                                ? "bg-white/10 text-[#C5A059] shadow-sm ring-1 ring-white/10"
                                                : "bg-white text-[#C5A059] shadow-sm ring-1 ring-stone-200"
                                            : isDark
                                                ? "text-stone-400 hover:bg-white/5 hover:text-white"
                                                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                                    }`}
                                >
                                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
