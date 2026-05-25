
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const ACCESS_KEY = process.env.MOMO_ACCESS_KEY;
const SECRET_KEY = process.env.MOMO_SECRET_KEY;
const PARTNER_CODE = process.env.MOMO_PARTNER_CODE;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        
        // MoMo params
        const partnerCode = searchParams.get('partnerCode');
        const orderId = searchParams.get('orderId');
        const requestId = searchParams.get('requestId');
        const amount = searchParams.get('amount');
        const orderInfo = searchParams.get('orderInfo');
        const orderType = searchParams.get('orderType');
        const transId = searchParams.get('transId');
        const resultCode = searchParams.get('resultCode');
        const message = searchParams.get('message');
        const payType = searchParams.get('payType');
        const responseTime = searchParams.get('responseTime');
        const extraData = searchParams.get('extraData');
        const signature = searchParams.get('signature');

        // Basic validation
        if (!ACCESS_KEY || !SECRET_KEY) {
            return NextResponse.json({ error: "Config missing" }, { status: 500 });
        }

        // 1. Verify Signature (để đảm bảo an toàn)
        const rawSignature = [
            `accessKey=${ACCESS_KEY}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `message=${message}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `orderType=${orderType}`,
            `partnerCode=${partnerCode}`,
            `payType=${payType}`,
            `requestId=${requestId}`,
            `responseTime=${responseTime}`,
            `resultCode=${resultCode}`,
            `transId=${transId}`
        ].join('&');

        const generatedSignature = crypto.createHmac('sha256', SECRET_KEY).update(rawSignature).digest('hex');

        if (generatedSignature !== signature) {
            console.error("Return URL Signature Mismatch");
            // Trong môi trường dev, có thể lỏng lẻo hơn hoặc redirect về trang lỗi
            return NextResponse.redirect(new URL('/?error=signature_mismatch', req.url));
        }

        // 2. Process
        if (resultCode === '0') {
             const extraParts = (extraData || "").split("|");

             if (extraParts[0] === "BUNDLE") {
                 const userId = extraParts[1];
                 if (userId) {
                     // Check and update Purchase and enrollments
                     const purchase = await prisma.purchase.findUnique({ where: { id: orderId! } });
                     
                     if (purchase && purchase.isBundle && purchase.bundleCourseIds) {
                         await prisma.purchase.update({
                             where: { id: orderId! },
                             data: { status: 'COMPLETED', transactionId: transId!, provider: 'MOMO' }
                         });

                         const enrollmentsData = purchase.bundleCourseIds.map(cId => ({
                             userId,
                             courseId: cId,
                             progress: 0
                         }));
                         
                         await prisma.enrollment.createMany({
                             data: enrollmentsData,
                             skipDuplicates: true
                         });
                         
                         // Đọc cấu hình tạm thời từ Profile
                         const profile = await prisma.profile.findUnique({
                             where: { id: userId },
                             select: { learningPath: true }
                         });
                         
                         if (profile?.learningPath) {
                             const config = profile.learningPath as any;
                             
                             // Gọi hàm tạo lịch học
                             const { enrollAndCreateStudyPlan } = await import('@/app/actions/onboarding');
                             
                             await enrollAndCreateStudyPlan({
                                 courseIds: config.courseIds,
                                 roadmapId: config.roadmapId,
                                 daysOfWeek: config.daysOfWeek,
                                 dailyMinutes: config.dailyMinutes,
                                 startDate: new Date(config.startDate),
                                 overrideUserId: userId
                             });
                             
                             // Xóa cấu hình tạm thời
                             const { Prisma } = await import('@prisma/client');
                             await prisma.profile.update({
                                 where: { id: userId },
                                 data: { learningPath: Prisma.DbNull }
                             });
                         }
                     }
                     // Chuyển thẳng về Dashboard vì lịch học đã được tạo
                     return NextResponse.redirect(new URL(`/onboarding?payment=success`, req.url));
                 }
             } else {
                 const userId = extraParts[0];
                 const courseId = extraParts[1];

                 if (userId && courseId) {
                    // Update DB (Idempotent - an toàn khi chạy nhiều lần trùng với IPN)
                    await prisma.$transaction([
                        prisma.purchase.update({
                            where: { id: orderId! },
                            data: { 
                                status: 'COMPLETED', 
                                transactionId: transId!, 
                                provider: 'MOMO' 
                            }
                        }),
                        prisma.enrollment.upsert({
                            where: { userId_courseId: { userId, courseId } },
                            update: {},
                            create: { userId, courseId, progress: 0 }
                        })
                    ]);

                    // Redirect về trang khóa học
                    return NextResponse.redirect(new URL(`/courses/${courseId}?payment=success`, req.url));
                 }
             }
        }

        return NextResponse.redirect(new URL('/?error=payment_failed', req.url));

    } catch (error) {
        console.error("Payment Return Error:", error);
        return NextResponse.redirect(new URL('/?error=internal_error', req.url));
    }
}
