"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { enrollFreeCourse, purchaseCourse } from "@/app/actions/enrollment";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface CourseActionButtonsProps {
    courseId: string;
    price: number;
    isFree: boolean;
    firstLessonId?: string;
}

export default function CourseActionButtons({ courseId, price, isFree, firstLessonId }: CourseActionButtonsProps) {
    const router = useRouter();
    const { t } = useLanguage();
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

    // Case 1: FREE COURSE
    if (isFree || price === 0) {
        return (
            <button
                onClick={handleEnrollFree}
                disabled={isLoading}
                className="block w-full py-4 bg-[#1a1a1a] text-white text-center font-bold tracking-widest uppercase text-sm rounded-lg hover:bg-[#C5A059] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                {isLoading 
                    ? t("courseDetail.enrolling", "Đang đăng ký...") 
                    : (firstLessonId ? t("courseDetail.enrollFree", "Vào học ngay (Miễn phí)") : t("courseDetail.enrollNow", "Đăng ký ngay"))}
            </button>
        );
    }

    // Case 2: PAID COURSE
    return (
        <div className="space-y-4">
            <div className="text-3xl font-serif text-stone-900 text-center">
                {formattedPrice}
            </div>

            <button
                onClick={handlePurchase}
                disabled={isLoading}
                className="block w-full py-4 bg-[#C5A059] text-white text-center font-bold tracking-widest uppercase text-sm rounded-lg hover:bg-[#b08d4b] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                {isLoading ? t("courseDetail.processing", "Đang xử lý...") : t("courseDetail.buyNow", "Mua ngay")}
            </button>

            <p className="text-xs text-center text-stone-500 italic">
                {t("courseDetail.simulatedCheckout", "*Thanh toán giả lập (Click là thành công)")}
            </p>
        </div>
    );
}
