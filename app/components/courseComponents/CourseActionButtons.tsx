"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { enrollFreeCourse, purchaseCourse } from "@/app/actions/enrollment";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

interface CourseActionButtonsProps {
    courseId: string;
    price: number;
    isFree: boolean;
    firstLessonId?: string;
}

export default function CourseActionButtons({ courseId, price, isFree, firstLessonId }: CourseActionButtonsProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [isLoading, setIsLoading] = useState(false);

    const handleEnrollFree = async () => {
        setIsLoading(true);
        try {
            const res = await enrollFreeCourse(courseId);
            if (res.success) {
                toast.success(res.message);
                if (res.redirectUrl) {
                    router.push(res.redirectUrl);
                } else {
                    router.refresh();
                }
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error(t("common.error", "Đã xảy ra lỗi."));
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async () => {
        setIsLoading(true);
        try {
            const res = await purchaseCourse(courseId);
            if (res.success) {
                toast.success(res.message);
                if (res.redirectUrl) {
                    window.location.href = res.redirectUrl;
                } else {
                    router.refresh();
                }
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error(t("common.error", "Lỗi thanh toán."));
        } finally {
            setIsLoading(false);
        }
    };

    const formattedPrice = new Intl.NumberFormat("vi-VN", { style: 'currency', currency: 'VND' }).format(price);

    if (isFree || price === 0) {
        return (
            <button
                onClick={handleEnrollFree}
                disabled={isLoading}
                className="w-full py-4 bg-[#C5A059] text-[#080808] font-bold tracking-widest uppercase text-xs rounded-xl hover:bg-[#e9c176] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                {isLoading 
                    ? t("courseDetail.enrolling", "Đang đăng ký...") 
                    : (firstLessonId ? t("courseDetail.enrollFree", "Vào học ngay (Miễn phí)") : t("courseDetail.enrollNow", "Đăng ký ngay"))}
            </button>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-baseline gap-2 mb-2 justify-center">
                <span className={`text-3xl font-serif font-bold ${isDark ? "text-white" : "text-stone-900"}`}>
                    {formattedPrice}
                </span>
            </div>

            <button
                onClick={handlePurchase}
                disabled={isLoading}
                className="w-full py-4 bg-[#C5A059] text-[#080808] font-bold tracking-widest uppercase text-xs rounded-xl hover:bg-[#e9c176] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                {isLoading ? t("courseDetail.processing", "Đang xử lý...") : t("courseDetail.buyNow", "Đăng ký ngay")}
            </button>
        </div>
    );
}
