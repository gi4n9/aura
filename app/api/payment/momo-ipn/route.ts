
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
            const [userId, courseId] = (extraData || "").split("|");

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
