import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { loadImage, createCanvas } from "canvas";

// 1. Tính toán mã hash SHA-256 của file Buffer
export function getSha256(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
}

// 2. Đọc OCR Cache từ DB
export async function getCachedOcr(hash: string): Promise<any> {
    try {
        const entry = await (prisma as any).ocrCache.findUnique({
            where: { hash }
        });
        if (entry) {
            return {
                type: entry.type,
                text: entry.text,
                ...(entry.meta as object)
            };
        }
    } catch (e) {
        console.error("Error reading OCR cache from DB:", e);
    }
    return null;
}

// 3. Ghi OCR Cache vào DB
export async function setCachedOcr(
    hash: string,
    type: "pdf" | "image",
    text: string,
    meta: any
): Promise<void> {
    try {
        await (prisma as any).ocrCache.upsert({
            where: { hash },
            update: { type, text, meta },
            create: { hash, type, text, meta }
        });
    } catch (e) {
        console.error("Error writing OCR cache to DB:", e);
    }
}

// 4. Đếm tất cả ký tự chữ cái Latinh và tiếng Việt hợp lệ
export function countVietnameseChars(text: string): number {
    const matches = text.match(/[a-zA-ZàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g);
    return matches ? matches.length : 0;
}

// 5. Giới hạn Concurrency Pool (Worker Queue)
export async function runWithConcurrencyLimit<T>(
    factories: Array<() => Promise<T>>,
    limit: number
): Promise<T[]> {
    const results: T[] = new Array(factories.length);
    let index = 0;

    async function worker() {
        while (index < factories.length) {
            const currentIndex = index++;
            results[currentIndex] = await factories[currentIndex]();
        }
    }

    const workers = Array.from({ length: Math.min(limit, factories.length) }, worker);
    await Promise.all(workers);
    return results;
}

// 6. Timeout wrapper cho Promise
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn(`⏳ Task timed out after ${timeoutMs}ms. Falling back.`);
            resolve(defaultValue);
        }, timeoutMs);
    });
    return Promise.race([
        promise.then((res) => {
            clearTimeout(timeoutId);
            return res;
        }),
        timeoutPromise
    ]);
}

// 7. Resize hình ảnh bằng canvas nếu kích thước quá lớn (> 2500px)
export async function resizeImageIfNeeded(buffer: Buffer): Promise<Buffer> {
    try {
        const img = await loadImage(buffer);
        const maxDim = 2500;
        if (img.width > maxDim || img.height > maxDim) {
            let width = img.width;
            let height = img.height;
            if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }
            console.log(`🖼️ Resizing image from ${img.width}x${img.height} to ${width}x${height}`);
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            return canvas.toBuffer("image/jpeg");
        }
    } catch (e) {
        console.error("Error resizing image via canvas (will use original):", e);
    }
    return buffer;
}
