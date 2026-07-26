import sharp from "sharp";
import { createCanvas, loadImage } from "canvas";

export interface PreprocessOptions {
    maxWidth?: number;
    maxHeight?: number;
    binarize?: boolean;
    thresholdValue?: number;
}

/**
 * Tối ưu hóa dung lượng, kích thước và độ tương phản của ảnh cho OCR bằng Sharp
 */
export async function optimizeImageForOCR(
    inputBuffer: Buffer,
    options: PreprocessOptions = {}
): Promise<Buffer> {
    try {
        const {
            maxWidth = 2400,
            maxHeight = 2400,
            binarize = false,
            thresholdValue = 175
        } = options;

        let pipeline = sharp(inputBuffer)
            .rotate() // Tự động xoay ảnh theo EXIF orientation của camera
            .resize({
                width: maxWidth,
                height: maxHeight,
                fit: "inside",
                withoutEnlargement: true
            })
            .grayscale() // Chuyển sang ảnh xám (Grayscale) 8-bit
            .normalize() // Cân bằng dải sáng (Auto-contrast)
            .sharpen({ sigma: 1.2 }); // Làm nét các nét chữ bị mờ

        if (binarize) {
            pipeline = pipeline.threshold(thresholdValue);
        }

        return await pipeline.png({ quality: 100 }).toBuffer();
    } catch (error) {
        console.warn("⚠️ Canvas/Sharp image optimization warning, returning original buffer:", error);
        return inputBuffer;
    }
}

/**
 * Cắt vùng chọn chính xác (Crop) bằng Canvas 2D
 */
export async function cropSubRegionWithCanvas(
    imageBuffer: Buffer,
    box: { x: number; y: number; width: number; height: number }
): Promise<Buffer> {
    try {
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(box.width, box.height);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
            img,
            box.x, box.y, box.width, box.height,
            0, 0, box.width, box.height
        );

        return canvas.toBuffer("image/png");
    } catch (error) {
        console.error("❌ Lỗi khi crop ảnh bằng Canvas:", error);
        return imageBuffer;
    }
}

/**
 * Ghép nhiều ảnh nhỏ thành 1 Canvas duy nhất (Sprite Batching)
 */
export async function stitchImagesToCanvas(imageBuffers: Buffer[]): Promise<Buffer> {
    if (imageBuffers.length === 0) return Buffer.from([]);
    if (imageBuffers.length === 1) return imageBuffers[0];

    try {
        const images = await Promise.all(imageBuffers.map(b => loadImage(b)));
        const totalHeight = images.reduce((sum, img) => sum + img.height + 10, 0);
        const maxWidth = Math.max(...images.map(img => img.width));

        const canvas = createCanvas(maxWidth, totalHeight);
        const ctx = canvas.getContext("2d");

        // Tô nền trắng
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, maxWidth, totalHeight);

        let currentY = 0;
        for (const img of images) {
            ctx.drawImage(img, 0, currentY);
            currentY += img.height + 10;
        }

        return canvas.toBuffer("image/png");
    } catch (error) {
        console.error("❌ Lỗi khi ghép ảnh bằng Canvas:", error);
        return imageBuffers[0];
    }
}
