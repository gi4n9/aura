
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const ACCESS_KEY = process.env.MOMO_ACCESS_KEY;
const SECRET_KEY = process.env.MOMO_SECRET_KEY;

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature
        } = body;

        if (!ACCESS_KEY || !SECRET_KEY) {
            console.error("Missing MoMo IPN Configuration");
            return NextResponse.json({ message: "Server Config Error" }, { status: 500 });
        }

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

        const generatedSignature = crypto.createHmac('sha256', SECRET_KEY!).update(rawSignature).digest('hex');

        if (generatedSignature !== signature) {
            console.error("IPN Signature Mismatch", {
                received: signature,
                generated: generatedSignature
            });
            return NextResponse.json({ message: "Invalid signature" }, { status: 400 });
        }

        if (resultCode === 0) {
            const extraParts = (extraData || "").split("|");
            
            if (extraParts[0] === "BUNDLE") {
                const userId = extraParts[1];
                console.log(`Bundle Payment Success for User ${userId}`);
                
                // Cập nhật trạng thái Purchase
                const updatedPurchase = await prisma.purchase.update({
                    where: { id: orderId },
                    data: { 
                        status: 'COMPLETED',
                        transactionId: String(transId),
                        provider: 'MOMO'
                    }
                });

                if (updatedPurchase && updatedPurchase.isBundle && updatedPurchase.bundleCourseIds) {
                    const enrollmentsData = updatedPurchase.bundleCourseIds.map(cId => ({
                        userId,
                        courseId: cId,
                        progress: 0
                    }));
                    
                    await prisma.enrollment.createMany({
                        data: enrollmentsData,
                        skipDuplicates: true
                    });
                }

                // Đọc cấu hình tạm thời từ Profile
                const profile = await prisma.profile.findUnique({
                    where: { id: userId },
                    select: { learningPath: true }
                });
                
                if (profile?.learningPath) {
                    const config = profile.learningPath as any;
                    
                    const { enrollAndCreateStudyPlan } = await import('@/app/actions/onboarding');
                    
                    await enrollAndCreateStudyPlan({
                        courseIds: config.courseIds,
                        roadmapId: config.roadmapId,
                        daysOfWeek: config.daysOfWeek,
                        dailyMinutes: config.dailyMinutes,
                        startDate: new Date(config.startDate),
                        overrideUserId: userId
                    });
                    
                    const { Prisma } = await import('@prisma/client');
                    await prisma.profile.update({
                        where: { id: userId },
                        data: { learningPath: Prisma.DbNull }
                    });
                }
            } else {
                const userId = extraParts[0];
                const courseId = extraParts[1];

                if (userId && courseId) {
                    console.log(`Payment Success for User ${userId}, Course ${courseId}`);

                    await prisma.$transaction([
                        prisma.purchase.update({
                            where: { id: orderId },
                            data: { 
                                status: 'COMPLETED',
                                transactionId: String(transId),
                                provider: 'MOMO'
                            }
                        }),
                        prisma.enrollment.upsert({
                            where: { userId_courseId: { userId, courseId } },
                            update: {}, 
                            create: {
                                userId,
                                courseId,
                                progress: 0
                            }
                        })
                    ]);
                }
            }
        } else {
             await prisma.purchase.update({
                where: { id: orderId },
                data: { status: 'FAILED', errorLog: message }
            });
        }

        return NextResponse.json({ message: "Success" }, { status: 204 });

    } catch (error) {
        console.error("IPN Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
