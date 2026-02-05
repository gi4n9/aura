
import crypto from 'crypto';

const MOMO_ENDPOINT = process.env.MOMO_API_ENDPOINT;
const PARTNER_CODE = process.env.MOMO_PARTNER_CODE;
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY;
const SECRET_KEY = process.env.MOMO_SECRET_KEY;

interface MomoPaymentRequest {
    orderId: string;
    amount: number;
    orderInfo: string;
    redirectUrl: string;
    ipnUrl: string;
    extraData?: string;
}

export async function createMomoPayment({
    orderId,
    amount,
    orderInfo,
    redirectUrl,
    ipnUrl,
    extraData = ""
}: MomoPaymentRequest) {
    if (!MOMO_ENDPOINT || !PARTNER_CODE || !ACCESS_KEY || !SECRET_KEY) {
        throw new Error("MOMO configuration is missing. Please check your .env file.");
    }

    const requestId = orderId;
    const requestType = "captureWallet";
    const lang = "vi";

    console.log("Creating MoMo Payment with config:", {
        PARTNER_CODE,
        REDIRECT: redirectUrl,
        IPN: ipnUrl
    });

    const rawSignature = [
        `accessKey=${ACCESS_KEY}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `ipnUrl=${ipnUrl}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `partnerCode=${PARTNER_CODE}`,
        `redirectUrl=${redirectUrl}`,
        `requestId=${requestId}`,
        `requestType=${requestType}`
    ].join('&');

    const signature = crypto
        .createHmac('sha256', SECRET_KEY!)
        .update(rawSignature)
        .digest('hex');
    const requestBody = {
        partnerCode: PARTNER_CODE,
        partnerName: "Aura Streaming",
        storeId: "MomoTestStore",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        lang: lang,
        requestType: requestType,
        autoCapture: true,
        extraData: extraData,
        signature: signature
    };
    try {
        const response = await fetch(MOMO_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.resultCode !== 0) {
            console.error("MoMo Response Error:", data);
        }

        return data; 

    } catch (error) {
        console.error("MoMo API Exception:", error);
        throw new Error("Failed to connect to MoMo Payment Gateway");
    }
}
