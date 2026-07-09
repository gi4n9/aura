import { generateSpeech } from "@/app/actions/tts-speak";

function formatTimestamp(ts: string) {
    const parts = ts.split(":").map(Number);

    if (parts.some(Number.isNaN)) {
        return ts;
    }

    if (parts.length === 2) {
        const [m, s] = parts;
        return `tại thời điểm ${m} phút và ${s} giây`;
    }

    if (parts.length === 3) {
        const [h, m, s] = parts;
        return `tại thời điểm ${h} giờ ${m} phút và ${s} giây`;
    }

    return ts;
}

export async function POST(req: Request) {
    try {
        const { text, voice, speed } = await req.json();
        console.log("TTS Request Received:", { text, voice, speed });

        if (!text) {
            return Response.json({ error: "Missing text" }, { status: 400 });
        }


        // Lọc sạch mốc thời gian để tránh Edge TTS đọc sai, ví dụ 25:15 thành 1h46p.
        const cleanTextForSpeech = (text: string) => {
            return text
                .replace(/\[([^\]]+)\]/g, (_, content) => {
                    const timestamps = content
                        .split(",")
                        .map((x: string) => x.trim())
                        .map(formatTimestamp);

                    return `(${timestamps.join(" và ")})`;
                })

                .replace(/\(([0-9:, ]+)\)/g, (_, content) => {
                    const timestamps = content
                        .split(",")
                        .map((x: string) => x.trim())
                        .map(formatTimestamp);

                    return `(${timestamps.join(" và ")})`;
                })

                .replace(/\n+/g, ". ")
                .replace(/\*\*(.*?)\*\*/g, "$1")
                .replace(/^\s*[-*]\s+/gm, "")
                .replace(/\s+/g, " ")
                .trim();
        };

        const cleanedSpeechText = cleanTextForSpeech(text);
        console.log(`Cleaned Speech Text: ${cleanedSpeechText} \n ---------------------------------`);

        if (!cleanedSpeechText) {
            return Response.json({ audioUrl: null, success: true });
        }

        const voiceId = voice;
        const rateValue = typeof speed === "number" ? speed : parseFloat(speed || "1.0");

        const ttsResult = await generateSpeech(cleanedSpeechText, voiceId, rateValue);

        return Response.json({
            success: ttsResult.success,
            audioUrl: ttsResult.success ? ttsResult.audioUrl : null,
            error: ttsResult.success ? null : ttsResult.error
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown TTS error";
        console.error("TTS API Error:", error);
        return Response.json({ error: message }, { status: 500 });
    }
}
