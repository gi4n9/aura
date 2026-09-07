import sharp from "sharp";
import { extractImageCrop } from "../lib/worksheet-parser";

async function runTest() {
    console.log("🧪 Bắt đầu kiểm tra hàm extractImageCrop với Fallback và CV Refine...");

    // Tạo ảnh SVG mô phỏng câu hỏi đề thi Toán với bảng biến thiên
    const width = 1000;
    const height = 700;

    const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <!-- Dòng chữ đề bài ở trên (y: 50 -> 80) -->
        <text x="50" y="70" font-family="sans-serif" font-size="22" fill="black">
            Câu 4: Cho hàm số y = f(x) liên tục trên R và có bảng biến thiên:
        </text>

        <!-- Khung bảng biến thiên (y: 120 -> 320, x: 80 -> 900) -->
        <rect x="80" y="120" width="820" height="200" fill="none" stroke="black" stroke-width="2"/>
        <line x1="80" y1="180" x2="900" y2="180" stroke="black" stroke-width="2"/>
        <line x1="80" y1="240" x2="900" y2="240" stroke="black" stroke-width="2"/>
        <line x1="160" y1="120" x2="160" y2="320" stroke="black" stroke-width="2"/>

        <text x="110" y="160" font-family="sans-serif" font-size="20" fill="black">x</text>
        <text x="110" y="220" font-family="sans-serif" font-size="20" fill="black">y'</text>
        <text x="110" y="290" font-family="sans-serif" font-size="20" fill="black">y</text>

        <!-- Các cực trị và mũi tên ở hàng y -->
        <text x="220" y="295" font-family="sans-serif" font-size="18" fill="black">-∞</text>
        <text x="500" y="295" font-family="sans-serif" font-size="18" fill="black">3</text>
        <text x="800" y="295" font-family="sans-serif" font-size="18" fill="black">+∞</text>

        <!-- Dòng đáp án trắc nghiệm ở dưới bảng (y: 400 -> 430) -->
        <text x="50" y="420" font-family="sans-serif" font-size="22" fill="black">
            A. (0; 3)       B. (-∞; 1)       C. (1; +∞)       D. (2; 5)
        </text>
    </svg>
    `;

    const imgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    // Giả lập LLM trả về bbox bị lệch:
    // ymin = 60 (dính dòng Câu 4)
    // ymax = 270 (cắt cụt hàng y vì đáy bảng là 320)
    const roughYminNorm = (60 / height) * 1000;
    const roughXminNorm = (70 / width) * 1000;
    const roughYmaxNorm = (270 / height) * 1000; // Cụt đáy
    const roughXmaxNorm = (910 / width) * 1000;

    const roughBbox = [roughYminNorm, roughXminNorm, roughYmaxNorm, roughXmaxNorm];
    console.log(`📍 Tọa độ thô: [ymin=${roughYminNorm.toFixed(1)}, xmin=${roughXminNorm.toFixed(1)}, ymax=${roughYmaxNorm.toFixed(1)}, xmax=${roughXmaxNorm.toFixed(1)}]`);

    const cropResult = await extractImageCrop(imgBuffer, roughBbox);

    if (!cropResult) {
        throw new Error("❌ extractImageCrop trả về undefined!");
    }

    console.log("✅ extractImageCrop đã tạo ảnh Base64 thành công! Độ dài chuỗi:", cropResult.length);

    // Giải mã Base64 và kiểm tra kích thước ảnh đã crop
    const base64Data = cropResult.replace(/^data:image\/png;base64,/, "");
    const croppedBuffer = Buffer.from(base64Data, "base64");
    const croppedMeta = await sharp(croppedBuffer).metadata();

    console.log(`🖼️ Kích thước ảnh sau crop: ${croppedMeta.width}x${croppedMeta.height} px`);
    
    // Đảm bảo ảnh crop có chiều cao đủ lớn để không bị cụt hàng y
    if ((croppedMeta.height || 0) < 150) {
        throw new Error("❌ Chiều cao ảnh crop quá nhỏ, có nguy cơ bị cụt đáy!");
    }

    console.log("🎉 Test TypeScript extractImageCrop thành công!");
}

runTest().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
