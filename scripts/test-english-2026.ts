import fs from "fs";
import path from "path";
import { parseQuestionsFromFilesBatch } from "../lib/worksheet-parser";

async function runEnglishExamTest() {
    console.log("🚀 Đang chạy phân tích Đề thi Tốt nghiệp THPT 2026 - Môn Tiếng Anh (Mã đề 1116)...");

    const filePaths = [
        "/home/giang/.gemini/antigravity-ide/brain/c5ad5e82-fd74-47d3-86f1-69074f1a7335/.user_uploaded/media_1788779280028.png",
        "/home/giang/.gemini/antigravity-ide/brain/c5ad5e82-fd74-47d3-86f1-69074f1a7335/.user_uploaded/media_1788779280087.png",
        "/home/giang/.gemini/antigravity-ide/brain/c5ad5e82-fd74-47d3-86f1-69074f1a7335/.user_uploaded/media_1788779280151.png",
        "/home/giang/.gemini/antigravity-ide/brain/c5ad5e82-fd74-47d3-86f1-69074f1a7335/.user_uploaded/media_1788779280255.png"
    ];

    const fileBuffers = filePaths.map(p => ({
        buffer: fs.readFileSync(p),
        mimeType: "image/png"
    }));

    const startTime = Date.now();
    const result = await parseQuestionsFromFilesBatch(fileBuffers);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n========================================`);
    console.log(`⏱️ Thời gian xử lý: ${duration}s`);
    console.log(`📋 Tổng số câu hỏi: ${result.questions.length}`);
    console.log(`🏷️ Mã đề: ${result.examCode}`);
    console.log(`📚 Môn học (Subject Hint): ${result.subjectHint}`);
    console.log(`========================================\n`);

    // Lưu kết quả JSON trước
    const outPath = "/home/giang/.gemini/antigravity-ide/brain/c5ad5e82-fd74-47d3-86f1-69074f1a7335/scratch/english_exam_2026_parsed.json";
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`💾 Đã lưu JSON kết quả tại: ${outPath}\n`);

    // 1. Kiểm tra yêu cầu (directives) từ câu 1-5
    console.log(`--- [1. KIỂM TRA YÊU CẦU ĐỀ BÀI CÂU 1-5] ---`);
    for (let i = 0; i < Math.min(5, result.questions.length); i++) {
        const q = result.questions[i];
        const hasDirective = q.content.toLowerCase().includes("mark the letter") || q.content.toLowerCase().includes("arrangement");
        console.log(`Câu ${q.index || i + 1}: ${hasDirective ? "✅ CÓ CHỈ DẪN" : "❌ THIẾU CHỈ DẪN"}`);
        console.log(`   Nội dung: ${q.content.slice(0, 100)}...`);
    }

    // 2. Kiểm tra câu 2: đáp án có đủ 3 thứ tự không
    console.log(`\n--- [2. KIỂM TRA ĐÁP ÁN CÂU 2] ---`);
    const q2 = result.questions.find(q => q.index === 2) || result.questions[1];
    if (q2 && q2.options) {
        console.log(`Câu 2 options:`, q2.options);
        const all3Parts = q2.options.every(opt => opt.split(/[-–—]/).filter(Boolean).length === 3);
        console.log(`Kết quả kiểm tra 3 thành phần: ${all3Parts ? "✅ ĐỦ 3 CHỮ CÁI" : "❌ BỊ CẮT BỚT CHỮ CÁI"}`);
    }

    // 3. Kiểm tra câu 14: thứ tự [IV], [III], [II], [I]
    console.log(`\n--- [3. KIỂM TRA THỨ TỰ ĐÁP ÁN CÂU 14] ---`);
    const q14 = result.questions.find(q => q.index === 14) || result.questions[13];
    if (q14 && q14.options) {
        console.log(`Câu 14 options:`, q14.options);
        const isCorrectOrder = q14.options[0]?.includes("IV") && q14.options[1]?.includes("III") && q14.options[2]?.includes("II") && q14.options[3]?.includes("I");
        console.log(`Kết quả kiểm tra thứ tự: ${isCorrectOrder ? "✅ ĐÚNG THỨ TỰ [IV], [III], [II], [I]" : "❌ SAI THỨ TỰ"}`);
    }

    // 4. Kiểm tra các thẻ gạch chân <u>...</u>
    console.log(`\n--- [4. KIỂM TRA THẺ GẠCH CHÂN <u>] ---`);
    let underlineCount = 0;
    result.questions.forEach(q => {
        const passageU = (q.passageContent?.match(/<u>.*?<\/u>/g) || []).length;
        const contentU = (q.content?.match(/<u>.*?<\/u>/g) || []).length;
        const optionsU = (q.options?.join(" ").match(/<u>.*?<\/u>/g) || []).length;
        underlineCount += passageU + contentU + optionsU;
        if (passageU > 0 || contentU > 0) {
            console.log(`Câu ${q.index}: có ${passageU} thẻ <u> trong passage, ${contentU} thẻ <u> trong content`);
        }
    });
    console.log(`Tổng số thẻ <u> tìm thấy: ${underlineCount}`);

    // 5. Kiểm tra đoạn 4 của bài đọc câu 21-28
    console.log(`\n--- [5. KIỂM TRA TÍNH NGUYÊN VĂN ĐOẠN 4 BÀI ĐỌC CÂU 21-28] ---`);
    const reading3 = result.questions.find(q => (q.index >= 21 && q.index <= 28) && q.passageContent);
    if (reading3 && reading3.passageContent) {
        const hasVerbatimSentence = reading3.passageContent.includes("Things go from bad to worse");
        console.log(`Câu đầu đoạn 4: ${hasVerbatimSentence ? "✅ NGUYÊN VĂN 'Things go from bad to worse...'" : "❌ BỊ THAY ĐỔI TỪ NGỮ"}`);
        console.log(`Trích đoạn văn:\n...${reading3.passageContent.slice(-400)}`);
    } else {
        console.log(`Không tìm thấy passageContent cho nhóm câu 21-28`);
    }
}

runEnglishExamTest().catch(err => {
    console.error("❌ Lỗi test:", err);
    process.exit(1);
});
