import { generateSpeech } from "@/app/actions/tts-speak";

export async function POST(req: Request) {
    try {
        const { text, voice, speed } = await req.json();

        if (!text) {
            return Response.json({ error: "Missing text" }, { status: 400 });
        }

        // Lọc sạch mốc thời gian để tránh Edge TTS đọc sai (ví dụ 25:15 đọc thành 1h46p)
        const cleanTextForSpeech = (t: string) => {
            return t
                .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
                .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, "")
                .replace(/\b\d{1,2}:\d{2}\b/g, "")
                .replace(/\s+/g, " ")
                .trim();
        };

        const cleanedSpeechText = cleanTextForSpeech(text);

        if (!cleanedSpeechText) {
            return Response.json({ audioUrl: null, success: true });
        }

        const voiceId = voice || "vi-VN-HoaiMyNeural";
        const rateValue = typeof speed === "number" ? speed : parseFloat(speed || "1.0");

        const ttsResult = await generateSpeech(cleanedSpeechText, voiceId, rateValue);

        return Response.json({
            success: ttsResult.success,
            audioUrl: ttsResult.success ? ttsResult.audioUrl : null,
            error: ttsResult.success ? null : ttsResult.error
        });

    } catch (error: any) {
        console.error("TTS API Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
