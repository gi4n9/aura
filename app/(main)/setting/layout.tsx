"use client";

import SettingsSidebar from "@/app/components/setting/SettingsSidebar";
import { useTheme } from "@/lib/theme/ThemeContext";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    return (
        <div className={`min-h-screen pt-28 pb-12 px-4 md:px-8 font-sans transition-colors duration-500 ${
            isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
        }`}>
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                <SettingsSidebar />
                <div className={`flex-1 rounded-2xl shadow-sm border p-6 md:p-10 transition-colors ${
                    isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                }`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
