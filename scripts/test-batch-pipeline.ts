import fs from "fs";
import path from "path";
import { parseQuestionsFromFilesBatch } from "../lib/worksheet-parser";

async function main() {
    console.log("🚀 Testing parseQuestionsFromFilesBatch with the 5 uploaded images (NO DB SYNC)...");

    const filePaths = [
        "/home/giang/.gemini/antigravity-ide/brain/95ce2033-b3d9-4ba9-92b1-d66b7096f40e/.user_uploaded/media_1788619446953.jpg",
        "/home/giang/.gemini/antigravity-ide/brain/95ce2033-b3d9-4ba9-92b1-d66b7096f40e/.user_uploaded/media_1788619446975.jpg",
        "/home/giang/.gemini/antigravity-ide/brain/95ce2033-b3d9-4ba9-92b1-d66b7096f40e/.user_uploaded/media_1788619446995.jpg",
        "/home/giang/.gemini/antigravity-ide/brain/95ce2033-b3d9-4ba9-92b1-d66b7096f40e/.user_uploaded/media_1788619447015.jpg",
        "/home/giang/.gemini/antigravity-ide/brain/95ce2033-b3d9-4ba9-92b1-d66b7096f40e/.user_uploaded/media_1788619447033.jpg"
    ];

    const fileBuffers = filePaths.map(p => ({
        buffer: fs.readFileSync(p),
        mimeType: "image/jpeg"
    }));

    const startTime = Date.now();
    const result = await parseQuestionsFromFilesBatch(fileBuffers);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n========================================`);
    console.log(`⏱️ Completed in: ${duration}s`);
    console.log(`📋 Total Questions: ${result.questions.length}`);
    console.log(`🏷️ Exam Code: ${result.examCode}`);
    console.log(`📚 Subject Hint: ${result.subjectHint}`);
    console.log(`========================================\n`);

    const scratchDir = "/home/giang/.gemini/antigravity-ide/brain/95ce2033-b3d9-4ba9-92b1-d66b7096f40e/scratch";

    let questionsWithImages = 0;
    result.questions.forEach((q, idx) => {
        const hasImg = !!q.contentImageUrl;
        if (hasImg) questionsWithImages++;

        console.log(`Q#${idx + 1} (Type: ${q.type}): ${q.content.replace(/\n/g, ' ').slice(0, 75)}...`);
        console.log(`   Has Image: ${hasImg ? "✅ YES" : "❌ NO"}`);

        if (hasImg && q.contentImageUrl) {
            const base64Data = q.contentImageUrl.replace(/^data:image\/\w+;base64,/, "");
            const buf = Buffer.from(base64Data, "base64");
            const outImg = path.join(scratchDir, `endpoint_test_q_${idx + 1}.png`);
            fs.writeFileSync(outImg, buf);
            console.log(`   Saved image to: ${outImg} (${(buf.length / 1024).toFixed(1)} KB)`);
        }
    });

    console.log(`\n🎉 Test completed successfully! Questions with visuals: ${questionsWithImages}/7 expected.`);
}

main().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
