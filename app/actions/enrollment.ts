"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createMomoPayment } from "@/lib/payment/momo";


export async function enrollFreeCourse(courseId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "Bạn cần đăng nhập để đăng ký khóa học." };
        }

        // Check Course
        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { price: true, isFree: true, chapters: { include: { lessons: true } } }
        });

        if (!course) return { success: false, error: "Khóa học không tồn tại." };

        const isActuallyFree = Number(course.price) === 0 || course.isFree;
        if (!isActuallyFree) return { success: false, error: "Đây là khóa học trả phí. Vui lòng thanh toán." };

        // Check & Create Enrollment
        const existingEnroll = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId } }
        });

        if (!existingEnroll) {
            await prisma.enrollment.create({
                data: { userId: user.id, courseId, progress: 0 }
            });
        }

        revalidatePath(`/courses/${courseId}`);

        const firstLesson = course.chapters[0]?.lessons[0];
        if (firstLesson) return { success: true, message: "Đăng ký thành công!", redirectUrl: `/courses/${courseId}/lessons/${firstLesson.id}` };

        return { success: true, message: "Đăng ký thành công!", redirectUrl: `/courses/${courseId}` };

    } catch (error) {
        console.error("Enroll Free Error:", error);
        return { success: false, error: "Lỗi hệ thống. Vui lòng thử lại sau." };
    }
}

export async function purchaseCourse(courseId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Bạn cần đăng nhập để mua khóa học." };

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { id: true, price: true, title: true }
        });

        if (!course) return { success: false, error: "Khóa học không tồn tại." };

        const existingEnroll = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId } }
        });
        if (existingEnroll) return { success: false, error: "Bạn đã sở hữu khóa học này." };

        const purchase = await prisma.purchase.create({
            data: {
                userId: user.id,
                courseId: courseId,
                amount: course.price,
                currency: "VND",
                provider: "MOMO", 
                status: "PENDING",
            }
        });

        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
        const ipnUrl = process.env.MOMO_IPN_URL || "https://momo.vn"; 

        const momoRes = await createMomoPayment({
            orderId: purchase.id, 
            amount: Number(course.price),
            orderInfo: `Thanh toan khoa hoc: ${course.title}`,
            redirectUrl: `${appBaseUrl}/api/payment/return`, // Use internal handler for DB update on return
            ipnUrl: ipnUrl,
            extraData: `${user.id}|${course.id}` 
        });

        if (momoRes && momoRes.resultCode === 0) {
            return { 
                success: true, 
                message: "Đang chuyển hướng sang MoMo...", 
                redirectUrl: momoRes.payUrl, 
                qrCodeUrl: momoRes.qrCodeUrl 
            };
        } else {
             await prisma.purchase.update({
                where: { id: purchase.id },
                data: { status: 'FAILED', errorLog: momoRes?.message || "MoMo Init Failed" }
            });
            return { success: false, error: momoRes?.message || "Lỗi khởi tạo thanh toán MoMo." };
        }

    } catch (error) {
        console.error("Purchase Error:", error);
        return { success: false, error: "Lỗi thanh toán. Vui lòng thử lại sau." };
    }
}

export async function purchaseBundle(data: {
    paidCourseIds: string[];
    studyPlanConfig?: any;
}) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Bạn cần đăng nhập để mua khóa học." };

        // Lấy thông tin các khóa học
        const courses = await prisma.course.findMany({
            where: { id: { in: data.paidCourseIds } },
            select: { id: true, price: true, title: true }
        });

        if (courses.length === 0) return { success: false, error: "Khóa học không tồn tại." };

        // Tính tổng tiền
        const totalAmount = courses.reduce((sum, c) => sum + Number(c.price), 0);
        
        if (totalAmount <= 0) return { success: false, error: "Các khóa học này miễn phí, không cần thanh toán." };

        // Lưu config study plan tạm thời vào Profile.learningPath
        if (data.studyPlanConfig) {
            await prisma.profile.update({
                where: { id: user.id },
                data: { learningPath: data.studyPlanConfig }
            });
        }

        // Tạo bản ghi Purchase Bundle
        const purchase = await prisma.purchase.create({
            data: {
                userId: user.id,
                amount: totalAmount,
                currency: "VND",
                provider: "MOMO",
                status: "PENDING",
                isBundle: true,
                bundleCourseIds: courses.map(c => c.id)
            }
        });

        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
        const ipnUrl = process.env.MOMO_IPN_URL || "https://momo.vn";

        const orderInfo = `Thanh toán gộp ${courses.length} khóa học: ${courses.map(c => c.title).join(", ")}`.substring(0, 200);

        const momoRes = await createMomoPayment({
            orderId: purchase.id,
            amount: totalAmount,
            orderInfo: orderInfo,
            redirectUrl: `${appBaseUrl}/api/payment/return`,
            ipnUrl: ipnUrl,
            extraData: `BUNDLE|${user.id}`
        });

        if (momoRes && momoRes.resultCode === 0) {
            return {
                success: true,
                message: "Đang chuyển hướng sang MoMo...",
                redirectUrl: momoRes.payUrl,
                qrCodeUrl: momoRes.qrCodeUrl
            };
        } else {
            await prisma.purchase.update({
                where: { id: purchase.id },
                data: { status: 'FAILED', errorLog: momoRes?.message || "MoMo Init Failed" }
            });
            return { success: false, error: momoRes?.message || "Lỗi khởi tạo thanh toán MoMo." };
        }

    } catch (error) {
        console.error("Purchase Bundle Error:", error);
        return { success: false, error: "Lỗi thanh toán. Vui lòng thử lại sau." };
    }
}

