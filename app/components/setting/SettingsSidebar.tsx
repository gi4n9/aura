"use client";

import { User, Lock, History, Key, Users, Smartphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsSidebar() {
    const pathname = usePathname();

    const menuSections = [
        {
            title: "TÀI KHOẢN",
            items: [
                { id: "profile", label: "Hồ sơ", icon: User, href: "/setting" },
                { id: "password", label: "Đổi mật khẩu", icon: Lock, href: "/setting/password" },
            ]
        },
        {
            title: "THANH TOÁN",
            items: [
                { id: "history", label: "Lịch sử đơn hàng", icon: History, href: "/setting/history" },
            ]
        },
        {
            title: "CÔNG CỤ",
            items: [
                { id: "activation", label: "Mã kích hoạt", icon: Key, href: "/setting/activation" },
                { id: "family", label: "Quản lý gia đình", icon: Users, href: "/setting/family" },
            ]
        },
        {
            title: "CÀI ĐẶT",
            items: [
                { id: "devices", label: "Quản lý thiết bị", icon: Smartphone, href: "/setting/devices" },
            ]
        }
    ];

    return (
        <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
            {menuSections.map((section, idx) => (
                <div key={idx}>
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 px-3">
                        {section.title}
                    </h3>
                    <div className="space-y-1">
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            // Check if active: exact match for /setting, or starts with for subpaths (but /setting is prefix of /setting/password so need careful check)
                            const isActive = item.href === "/setting"
                                ? pathname === "/setting"
                                : pathname.startsWith(item.href);

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? "bg-white text-[#C5A059] shadow-sm ring-1 ring-stone-200"
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
