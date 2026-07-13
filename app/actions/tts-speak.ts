"use server";

import { createClient } from "@/utils/supabase/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { EdgeTTS } from 'node-edge-tts'

export async function generateSpeech(text: string, voiceId: string, rate = 1.0) {
    try {
        const tts = new MsEdgeTTS();

        // Cấu hình giọng đọc và chất lượng audio đầu ra
        await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        // Tạo stream từ text với tùy chọn tốc độ nói (rate)
        const { audioStream } = tts.toStream(text.substring(0, 4000), { rate });

        // Thu thập buffer
        const chunks: Buffer[] = [];
        const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
            let resolved = false;
            const finish = () => {
                if (!resolved) {
                    resolved = true;
                    resolve(Buffer.concat(chunks));
                }
            };
            audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
            audioStream.on("end", finish);
            audioStream.on("close", finish);
            audioStream.on("error", (err) => reject(err));
        });

        const finalBuffer = Buffer.concat(chunks);
        if (finalBuffer.length === 0) {
            console.warn(`⚠️ [Edge TTS] API trả về 0 bytes (Text: "${text.substring(0, 50)}..."). Đã bỏ qua an toàn.`);
            return { success: false, error: "Audio rỗng" };
        }

        // Upload trực tiếp lên Supabase Storage
        const supabase = await createClient();
        const fileName = `jarvis-audio/${Date.now()}.mp3`;

        const { error: uploadError } = await supabase.storage
            .from("lecture-audio")
            .upload(fileName, finalBuffer, {
                contentType: "audio/mpeg",
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from("lecture-audio")
            .getPublicUrl(fileName);

        return { success: true, audioUrl: urlData.publicUrl };

    } catch (error: any) {
        console.error(`❌ [Edge TTS] Lỗi hệ thống: ${error.message || "Unknown error"}`);
        return { success: false, error: error.message };
    }
}
