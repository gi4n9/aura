
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
        amount: Math.round(Number(amount)),
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        lang: lang,
        requestType: requestType,
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

        // 1. Lấy response dưới dạng Text thô thay vì ép sang JSON ngay
        const responseText = await response.text();

        let data;
        try {
            // 2. Cố gắng parse text thành JSON
            data = JSON.parse(responseText);
        } catch (parseError) {
            // 3. Nếu crash ở đây, nghĩa là MoMo trả về HTML (hoặc text rác)
            console.error("❌ LỖI NGHIÊM TRỌNG: MoMo không trả về JSON!");
            console.error("HTTP Status Code:", response.status);
            console.error("Nội dung HTML/Text nhận được:", responseText); // In ra để xem MoMo chửi gì
            throw new Error(`Gateway MoMo trả về định dạng sai (HTTP ${response.status}). Vui lòng xem log server.`);
        }

        // 4. Đã parse JSON thành công, tiếp tục kiểm tra resultCode
        if (data.resultCode !== 0) {
            console.error("⚠️ MoMo từ chối giao dịch. Chi tiết:", JSON.stringify(data, null, 2));
            console.error("Body đã gửi lên:", JSON.stringify(requestBody, null, 2));
        }

        return data;

    } catch (error) {
        console.error("MoMo API Exception:", error);
        throw new Error("Failed to connect to MoMo Payment Gateway");
    }
}
