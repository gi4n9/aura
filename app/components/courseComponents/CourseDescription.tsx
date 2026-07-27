"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface CourseDescriptionProps {
    description: string;
}

export default function CourseDescription({ description }: CourseDescriptionProps) {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";
    const [isExpanded, setIsExpanded] = useState(false);

    if (!description) {
        return (
            <div className={`p-4 rounded-2xl italic text-sm ${isDark ? "text-stone-400 bg-white/5" : "text-stone-500 bg-stone-100"}`}>
                {t("courseDetail.noDescription", "Chưa có mô tả chi tiết cho khóa học này.")}
            </div>
        );
    }

    return (
        <div className="space-y-3 relative z-10">
            {/* CONTAINER CARD FOR DESCRIPTION */}
            <div
                className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-500 ease-in-out relative ${
                    isDark ? "bg-white/5 border-white/10" : "bg-stone-50 border-stone-200"
                } ${
                    isExpanded
                        ? "max-h-[320px] overflow-y-auto custom-scrollbar"
                        : "max-h-[56px] overflow-hidden"
                }`}
            >
                <p className={`text-sm md:text-base leading-relaxed whitespace-pre-line text-justify font-light ${
                    isDark ? "text-stone-200" : "text-stone-700"
                } ${!isExpanded ? "line-clamp-2" : ""}`}>
                    {description}
                </p>

                {/* Fade gradient overlay when collapsed */}
                {!isExpanded && (
                    <div className={`absolute inset-x-0 bottom-0 h-10 pointer-events-none bg-gradient-to-t ${
                        isDark
                            ? "from-[#0e0e0e] via-[#0e0e0e]/80 to-transparent"
                            : "from-stone-50 via-stone-50/80 to-transparent"
                    }`} />
                )}
            </div>

            {/* Expand / Collapse Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsExpanded((prev) => !prev);
                }}
                className="relative z-20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/40 text-xs font-bold text-[#C5A059] hover:bg-[#C5A059] hover:text-[#080808] transition-all uppercase tracking-wider group cursor-pointer shadow-sm"
            >
                {isExpanded ? (
                    <>
                        {t("common.collapse", "Thu gọn")} <ChevronUp size={15} className="group-hover:-translate-y-0.5 transition-transform" />
                    </>
                ) : (
                    <>
                        {t("common.expand", "Xem thêm mô tả")} <ChevronDown size={15} className="group-hover:translate-y-0.5 transition-transform" />
                    </>
                )}
            </button>
        </div>
    );
}