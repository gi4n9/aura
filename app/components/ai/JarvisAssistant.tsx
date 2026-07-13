"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Play, BookOpen, AlertTriangle, User, Bot, Loader2, Send, Mic, Volume2, VolumeX } from "lucide-react";
import AuraAvatar3D from "./AuraAvatar3D";
import ReactMarkdown from "react-markdown";

interface JarvisProps {
    lessonId: string;
    onSeek: (seconds: number) => void;
    onOpenTab: (tabId: "quiz" | "ai" | "mindmap" | "flashcards") => void;
}

type OptionsVoice = {
    value: string;
    label: string;
};

type OptionsSpeed = {
    value: string;
    label: string;
};

const voiceOptions: OptionsVoice[] = [
    { value: "vi-VN-HoaiMyNeural", label: "🇻🇳 Hoài Mỹ" },
    { value: "vi-VN-NamMinhNeural", label: "🇻🇳 Nam Minh" },
    { value: "en-US-AriaNeural", label: "🇺🇸 Aria" },
    { value: "en-US-GuyNeural", label: "🇺🇸 Guy" }
];

const speedOptions: OptionsSpeed[] = [
    { value: "0.8", label: "0.8x" },
    { value: "1.0", label: "1.0x" },
    { value: "1.2", label: "1.2x" },
    { value: "1.5", label: "1.5x" }
];

export default function JarvisAssistant({ lessonId, onSeek, onOpenTab }: JarvisProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [warmupData, setWarmupData] = useState<{ greeting: string; suggestions: string[] } | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [confidenceWarning, setConfidenceWarning] = useState<boolean>(false);
    const [voiceId, setVoiceId] = useState<string>("vi-VN-HoaiMyNeural"); // Giọng đọc mặc định
    const [speed, setSpeed] = useState("1.0"); // Tốc độ đọc
    const [isMuted, setIsMuted] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);
    const hasFetchedRef = useRef<Record<string, boolean>>({});
    const prevSettingsRef = useRef({ voiceId, speed });


    const chatEndRef = useRef<HTMLDivElement>(null);

    // Tự động scroll xuống khi có tin nhắn mới
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    //  ===== Hàm chuẩn bị text cho TTS =====
    // Chuyển timestamp [MM:SS] thành lời nói tiếng Việt tự nhiên
    // Loại bỏ markdown formatting không phát âm được
    const prepareTextForSpeech = useCallback((text: string): string => {
        return text
            // Chuyển [MM:SS] hoặc (MM:SS) hoặc các khoảng thời gian thành lời đọc tiếng Việt
            .replace(/[\[\(](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*-\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?[\]\)]/g, (_match, g1, g2, g3, g4, g5, g6) => {
                const hours1 = g3 ? parseInt(g1, 10) : 0;
                const min1 = g3 ? parseInt(g2, 10) : parseInt(g1, 10);
                const sec1 = g3 ? parseInt(g3, 10) : parseInt(g2, 10);
                let text1 = hours1 > 0 ? `${hours1} giờ ` : "";
                text1 += min1 > 0 ? (sec1 > 0 ? `${min1} phút ${sec1} giây` : `${min1} phút`) : `${sec1} giây`;
                
                if (g4 && g5) {
                    const hours2 = g6 ? parseInt(g4, 10) : 0;
                    const min2 = g6 ? parseInt(g5, 10) : parseInt(g4, 10);
                    const sec2 = g6 ? parseInt(g6, 10) : parseInt(g5, 10);
                    let text2 = hours2 > 0 ? `${hours2} giờ ` : "";
                    text2 += min2 > 0 ? (sec2 > 0 ? `${min2} phút ${sec2} giây` : `${min2} phút`) : `${sec2} giây`;
                    return `khoảng thời gian từ ${text1} đến ${text2}`;
                }
                
                return `khoảng thời gian ${text1}`;
            })
            // Xóa các cụm từ hướng dẫn không cần đọc
            .replace(/\b(trong video|ở bài giảng|tại phút|tại giây)\b/gi, "")
            .replace(/\*\*/g, "").replace(/\*/g, "").replace(/__/g, "")
            // Loại bỏ markdown headers
            .replace(/^#+\s*/gm, "")
            // Loại bỏ emoji icons (giữ lại text)
            .replace(/[📌💡⚠️✅❌🎯🔑📝🧠]/g, "")
            // Loại bỏ bullet points
            .replace(/^[\-\*]\s*/gm, "")
            .replace(/\s+/g, " ")
            .trim();
    }, []);

    // Hàng đợi phát âm thanh tuần tự (Sentence-by-Sentence queue)
    const isSpeakingRef = useRef(false);
    const audioQueueRef = useRef<string[]>([]);

    const queueAudio = useCallback((url: string) => {
        if (!url) return;
        if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setAudioUrl(url);
            setIsSpeaking(true);
        } else {
            audioQueueRef.current.push(url);
        }
    }, []);

    // Tránh re-creation callback để tránh lặp âm thanh và tự động lấy câu tiếp theo
    const handleSpeakEnd = useCallback(() => {
        const nextUrl = audioQueueRef.current.shift();
        if (nextUrl) {
            setAudioUrl(nextUrl);
            setIsSpeaking(true);
            isSpeakingRef.current = true;
        } else {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setAudioUrl(null);
        }
    }, []);

    // 1. Tải Socratic Greeting và Gợi ý câu hỏi khi vào bài học
    useEffect(() => {
        if (hasFetchedRef.current[lessonId]) return;
        hasFetchedRef.current[lessonId] = true;

        const fetchWarmup = async () => {
            try {
                const res = await fetch(`/api/chat/jarvis-warmup?lessonId=${lessonId}`);

                if (res.ok) {
                    const data = await res.json();
                    setWarmupData(data);

                    // Thêm câu chào của Jarvis vào lịch sử chat
                    setMessages([
                        {
                            id: "greeting",
                            role: "assistant",
                            content: data.greeting,
                            isFromCurriculum: true
                        }
                    ]);

                    if (data.greeting) {
                        const sentences = data.greeting.split(/(?<=[.?!。:\n])/).map((s: string) => s.trim()).filter(Boolean);
                        (async () => {
                            for (const s of sentences) {
                                try {
                                    const res = await fetch("/api/chat/tts", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ text: s, voice: voiceId, speed })
                                    });
                                    const d = await res.json();
                                    if (d.audioUrl) queueAudio(d.audioUrl);
                                } catch (err) {
                                    console.error("Lỗi greeting tts:", err);
                                }
                            }
                        })();
                    }
                }
            } catch (err) {
                console.error("Lỗi lấy thông tin khởi tạo Jarvis:", err);
            }
        };
        fetchWarmup();
    }, [lessonId]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMsg = { id: String(Date.now()), role: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);
        setConfidenceWarning(false);

        // Tạm thời dừng phát hiện tại và xóa hàng đợi khi gửi tin mới
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setAudioUrl(null);
        audioQueueRef.current = [];

        try {
            // Gọi API Chat 3D RAG dạng streaming
            const res = await fetch("/api/chat/video-3d", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId, query: text })
            });

            if (!res.ok) throw new Error("API call failed");

            // Đọc RAG metadata từ custom headers
            const maxSimilarity = parseFloat(res.headers.get("x-max-similarity") || "0");
            const isFromCurriculum = res.headers.get("x-is-from-curriculum") === "true";

            if (maxSimilarity < 0.45) {
                setConfidenceWarning(true);
            }

            // Tạo tin nhắn trống của assistant trong UI để append text stream
            const assistantMsgId = String(Date.now() + 1);
            setMessages(prev => [...prev, {
                id: assistantMsgId,
                role: "assistant",
                content: "",
                isFromCurriculum
            }]);

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No stream reader");

            let responseText = "";
            let sentenceBuffer = "";

            // Hàng đợi xử lý TTS ngầm (giúp không block quá trình render text lên UI)
            const ttsQueue: string[] = [];
            let isProcessingTts = false;

            const processTtsQueue = async () => {
                if (isProcessingTts) return;
                isProcessingTts = true;
                while (ttsQueue.length > 0) {
                    const sentence = ttsQueue.shift();
                    if (sentence) {
                        await processSentence(sentence);
                    }
                }
                isProcessingTts = false;
            };

            // Hàm con xử lý gọi TTS cho từng câu (chuyển đổi timestamp trước khi phát)
            const processSentence = async (sentence: string) => {
                const prepared = prepareTextForSpeech(sentence);
                if (!prepared) return;
                const textToSpeak = prepared.trim();
                if (!textToSpeak) return;

                try {
                    const ttsRes = await fetch("/api/chat/tts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: textToSpeak, voice: voiceId, speed })
                    });
                    const d = await ttsRes.json();
                    if (d.audioUrl) {
                        queueAudio(d.audioUrl);
                    }
                } catch (err) {
                    console.error("Lỗi tts cho câu trong stream:", textToSpeak, err);
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const rawChunk = decoder.decode(value, { stream: true });
                let chunkText = rawChunk;
                // Nếu server trả về toàn bộ text (thay vì delta), ta chỉ lấy phần mới
                if (responseText.length > 0 && rawChunk.length > responseText.length && rawChunk.startsWith(responseText)) {
                    chunkText = rawChunk.slice(responseText.length);
                }

                if (!chunkText) continue;

                responseText += chunkText;
                sentenceBuffer += chunkText;

                // Cập nhật UI ngay lập tức khi nhận token text mới
                setMessages(prev => {
                    return prev.map(m => {
                        if (m.id === assistantMsgId) {
                            return { ...m, content: responseText };
                        }
                        return m;
                    });
                });

                // Phân tách câu thông minh: Gom các câu ngắn lại với nhau để giọng đọc tự nhiên và liền mạch hơn
                while (true) {
                    let splitIndex = -1;
                    const regex = /([.?!。:]+['"”’\)\]*_]*[\s]+)|(\n+)/g;
                    let match;

                    // Duyệt qua các dấu ngắt câu trong buffer
                    while ((match = regex.exec(sentenceBuffer)) !== null) {
                        splitIndex = match.index + match[0].length;

                        // Nếu đã gom đủ độ dài (> 60 ký tự) HOẶC gặp đoạn xuống dòng, thì chốt vị trí cắt
                        if (splitIndex >= 60 || match[0].includes('\n')) {
                            break;
                        }
                    }

                    // Nếu không tìm thấy dấu ngắt câu nào, hoặc đoạn cắt được quá ngắn (và không phải xuống dòng)
                    // -> Ta break để chờ thêm text từ stream truyền về
                    if (splitIndex === -1 || (splitIndex < 60 && !sentenceBuffer.substring(0, splitIndex).includes('\n'))) {
                        // Ngoại lệ: Nếu buffer đã rất dài (quá 120 ký tự) mà không có dấu câu nào thoả mãn, ta vẫn cắt ở dấu câu cuối cùng tìm được để tránh kẹt
                        if (sentenceBuffer.length > 120 && splitIndex !== -1) {
                            // Cắt tạm ở đây
                        } else {
                            break;
                        }
                    }

                    const sentence = sentenceBuffer.substring(0, splitIndex);
                    sentenceBuffer = sentenceBuffer.substring(splitIndex); // Xoá phần đã đọc khỏi buffer, đảm bảo KHÔNG BAO GIỜ đọc lại

                    ttsQueue.push(sentence);
                    processTtsQueue(); // Kích hoạt xử lý ngầm (không await để không block stream text)
                }
            }

            // Xử lý nốt phần văn bản còn lại trong buffer
            if (sentenceBuffer.trim()) {
                ttsQueue.push(sentenceBuffer);
                processTtsQueue();
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: String(Date.now() + 1),
                role: "assistant",
                content: "⚠️ Có lỗi xảy ra khi kết nối trợ lý Jarvis. Vui lòng thử lại sau.",
                isFromCurriculum: false
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Khởi tạo Speech Recognition (Nhận diện giọng nói Web Speech API)
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false; // Dừng khi người dùng ngừng nói
            rec.interimResults = false; // Chỉ lấy kết quả hoàn chỉnh cuối cùng
            rec.lang = voiceId.startsWith("en-") ? "en-US" : "vi-VN"; // Tự động đổi ngôn ngữ theo giọng đọc

            rec.onstart = () => {
                setIsRecording(true);
            };

            rec.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript && transcript.trim()) {
                    setInput(transcript);
                    handleSendMessage(transcript);
                }
            };

            rec.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsRecording(false);
                if (event.error === "network") {
                    setMessages(prev => [...prev, {
                        id: String(Date.now()),
                        role: "assistant",
                        content: "⚠️ Lỗi kết nối mạng khi nhận diện giọng nói (Web Speech API). Vui lòng kiểm tra lại đường truyền internet của bạn hoặc tải lại trang.",
                        isFromCurriculum: false
                    }]);
                }
            };

            rec.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current = rec;
        }
    }, [voiceId]);

    const toggleSpeechRecognition = () => {
        if (!recognitionRef.current) {
            alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Web Speech API). Hãy sử dụng Chrome hoặc Edge để có trải nghiệm tốt nhất.");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            // Tạm thời dừng âm thanh nói của Jarvis để không bị nhiễu micro
            setIsSpeaking(false);
            setAudioUrl(null);

            try {
                recognitionRef.current.start();
            } catch (err) {
                console.warn("Ghi âm đã bắt đầu sẵn rồi hoặc lỗi micro:", err);
            }
        }
    };

    // Helper function để xử lý đệ quy qua các children của ReactMarkdown
    const processChildren = (children: React.ReactNode): React.ReactNode => {
        if (typeof children === 'string') {
            return parseTimestamps(children);
        }
        if (Array.isArray(children)) {
            return children.map((child, index) => (
                <span key={index}>{processChildren(child)}</span>
            ));
        }
        if (React.isValidElement(children)) {
            return React.cloneElement(children as React.ReactElement<any>, {
                children: processChildren((children.props as any).children)
            });
        }
        return children;
    };

    // Render markdown với clickable timestamps
    const renderContent = (content: string) => {
        return (
            <ReactMarkdown
                components={{
                    p: ({ children }) => (
                        <p className="mb-2 last:mb-0">
                            {processChildren(children)}
                        </p>
                    ),
                    code: ({ inline, children, className, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <pre className="!bg-[#1e1e1e] !text-[#d4d4d4] rounded-lg p-3 my-2 overflow-x-auto text-xs w-full max-w-full block">
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </pre>
                        ) : (
                            <code className="bg-stone-100 text-[#C5A059] px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                {children}
                            </code>
                        );
                    },
                    ul: ({ children }) => <ul className="list-disc list-outside space-y-1 my-2 ml-4">{processChildren(children)}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-outside space-y-1 my-2 ml-4">{processChildren(children)}</ol>,
                    li: ({ children }) => <li>{processChildren(children)}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-[#C5A059]">{processChildren(children)}</strong>,
                }}
            >
                {content}
            </ReactMarkdown>
        );
    };

    const parseTimestamps = (text: string) => {
        const regex = /[\[\(](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*-\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?[\]\)]/g;
        const parts: (string | React.ReactNode)[] = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            const hours = match[3] ? parseInt(match[1]) : 0;
            const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1]);
            const seconds = match[3] ? parseInt(match[3]) : parseInt(match[2]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            parts.push(
                <button
                    key={match.index}
                    onClick={() => onSeek(totalSeconds)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-[#C5A059]/10 text-[#C5A059] rounded font-mono text-xs hover:bg-[#C5A059]/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                    <Play size={12} className="fill-current" />
                    {match[0].slice(1, -1)}
                </button>
            );

            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    // State để toggle mở rộng panel lịch sử chat
    const [showChat, setShowChat] = useState(false);

    // Lấy tin nhắn cuối cùng của assistant để hiển thị dạng subtitle
    const lastAssistantMsg = messages.filter(m => m.role === "assistant").slice(-1)[0];

    return (
        <div className="flex flex-col h-full bg-[#0A0A0A] overflow-hidden relative">
            {/* ===== LAYER 1: 3D Sphere chiếm toàn bộ panel ===== */}
            <div className="relative h-full min-h-[500px]">
                <AuraAvatar3D
                    audioUrl={audioUrl}
                    isSpeaking={isSpeaking}
                    isRecording={isRecording}
                    isLoading={isLoading}
                    onSpeakEnd={handleSpeakEnd}
                    isMuted={isMuted}
                    showChat={showChat}
                />

                {/* Gradient fade ở top */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0A0A0A] to-transparent pointer-events-none z-10" />

                {/* Gradient fade ở bottom */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none z-10" />

                {/* ===== Top bar: Controls ===== */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20">
                    {/* Trạng thái hoạt động */}
                    <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-3 py-1.5 rounded-full text-[11px] text-white/70 border border-white/10">
                        <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' :
                            isSpeaking ? 'bg-amber-400 animate-pulse' :
                                isLoading ? 'bg-blue-400 animate-pulse' :
                                    'bg-emerald-400'
                            }`} />
                        {isRecording ? "Đang lắng nghe..." :
                            isSpeaking ? "Jarvis đang nói..." :
                                isLoading ? "Đang suy nghĩ..." :
                                    "Jarvis sẵn sàng"}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Cảnh báo ngoài giáo trình */}
                        {confidenceWarning && (
                            <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 backdrop-blur-xl px-2.5 py-1.5 rounded-full text-[10px] font-bold border border-amber-400/20">
                                <AlertTriangle size={11} /> Ngoài giáo trình
                            </span>
                        )}
                        {/* Nút tắt âm */}
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 bg-white/5 backdrop-blur-xl hover:bg-white/10 z-50 rounded-full text-white/60 hover:text-white transition-all border border-white/10"
                            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                        >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        {/* Nút toggle chat history */}
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`p-2 backdrop-blur-xl rounded-full transition-all border ${showChat
                                ? 'bg-[#C5A059]/20 text-[#C5A059] border-[#C5A059]/30'
                                : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'
                                }`}
                            title={showChat ? "Ẩn lịch sử chat" : "Xem lịch sử chat"}
                        >
                            <BookOpen size={14} />
                        </button>
                    </div>
                </div>

                {/* ===== Floating Info Overlay (Subtitle + Suggestions stacked) ===== */}
                {!showChat && (
                    <div className="absolute bottom-20 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none">
                        {/* Subtitle - Tin nhắn assistant gần nhất */}
                        {lastAssistantMsg && (
                            <div className="bg-black/50 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/10 max-h-[140px] overflow-y-auto pointer-events-auto custom-scrollbar shadow-lg">
                                <div className="text-white/90 text-xs leading-relaxed">
                                    {renderContent(lastAssistantMsg.content)}
                                </div>
                            </div>
                        )}

                        {/* Suggestions - Chỉ hiện khi chưa có tin nhắn của user và không đang load */}
                        {warmupData && messages.filter(m => m.role === "user").length === 0 && !isLoading && (
                            <div className="pointer-events-auto">
                                <p className="text-[10px] text-white/40 font-bold mb-1.5 uppercase tracking-wider flex items-center gap-1 justify-center">
                                    <Sparkles size={10} className="text-[#C5A059]" /> Câu hỏi đề xuất
                                </p>
                                <div className="flex flex-col gap-1.5">
                                    {warmupData.suggestions.map((s, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSendMessage(s)}
                                            className="text-left text-[11px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 hover:border-[#C5A059]/50 hover:bg-[#C5A059]/10 hover:text-[#C5A059] transition-all text-white/70 font-medium w-full"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ===== LAYER 2: Bottom Control Bar - Mic + Input ===== */}
            <div className="relative z-30 px-4 pb-3 pt-2">
                {/* Cài đặt giọng nói / tốc độ */}
                <div className="flex items-center justify-center gap-4 mb-2">
                    <select
                        value={voiceId ?? ""}
                        onChange={(e) => setVoiceId(e.target.value)}
                        className="text-[10px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-2.5 py-1 outline-none focus:border-[#C5A059]/50 text-white/60 appearance-none cursor-pointer"
                    >
                        {voiceOptions.map((vo) => (
                            <option className="text-black" key={vo.value} value={vo.value}>
                                {vo.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={speed ?? ""}
                        onChange={(e) => setSpeed(e.target.value)}
                        className="text-[10px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-2.5 py-1 outline-none focus:border-[#C5A059]/50 text-white/60 appearance-none cursor-pointer"
                    >
                        {speedOptions.map((so) => (
                            <option className="text-black" key={so.value} value={so.value}>
                                {so.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Input bar + Mic button */}
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
                    className="flex items-center gap-2"
                >
                    {/* Nút Mic lớn */}
                    <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isRecording
                            ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110 animate-pulse'
                            : 'bg-[#C5A059] text-white hover:bg-[#d4b569] shadow-[0_0_20px_rgba(197,160,89,0.3)]'
                            }`}
                        title={isRecording ? "Dừng lắng nghe" : "Nói trực tiếp với Jarvis"}
                        disabled={isLoading}
                    >
                        <Mic size={20} />
                    </button>

                    {/* Ô nhập text */}
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isRecording ? "🎤 Đang lắng nghe..." : "Nhập câu hỏi..."}
                        className={`flex-1 px-4 py-2.5 rounded-full border text-xs focus:outline-none transition-all bg-white/5 backdrop-blur-xl text-white placeholder-white/30 ${isRecording
                            ? 'border-red-500/50 bg-red-500/5'
                            : 'border-white/10 focus:border-[#C5A059]/50'
                            }`}
                        disabled={isLoading || isRecording}
                    />
                    <button
                        type="submit"
                        className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-white/60 hover:text-[#C5A059] hover:border-[#C5A059]/50 flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-30"
                        disabled={isLoading || isRecording || !input.trim()}
                    >
                        <Send size={16} />
                    </button>
                </form>
            </div>

            {/* ===== LAYER 3: Slide-up Chat History Panel ===== */}
            <div className={`absolute inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out ${showChat ? 'translate-y-0' : 'translate-y-full'
                }`} style={{ pointerEvents: showChat ? 'auto' : 'none' }}>
                <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl max-h-[75vh] h-[420px] flex flex-col pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative">
                    {/* Handle bar */}
                    <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 bg-white/20 rounded-full" />
                    </div>

                    <div className="flex items-center justify-between px-4 pb-2">
                        <span className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Lịch sử hội thoại</span>
                        <button
                            onClick={() => setShowChat(false)}
                            className="text-[10px] text-white/40 hover:text-white/70 transition-all"
                        >
                            Đóng ✕
                        </button>
                    </div>

                    {/* Chat messages */}
                    <div className="flex-1 text-white overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
                        {messages.map((m) => (
                            <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white ${m.role === 'user' ? 'bg-white/10 order-2' : 'bg-[#C5A059]/20 text-[#C5A059]'}`}>
                                    {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                                </div>

                                <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user'
                                    ? 'bg-white/10 text-white/80 rounded-tr-none'
                                    : 'bg-white/5 border border-white/10 rounded-tl-none text-white/80'
                                    }`}>
                                    {m.role === 'user' ? m.content : renderContent(m.content)}

                                    {m.role === 'assistant' && (
                                        <div className="mt-2  flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                                            <button
                                                onClick={() => onOpenTab("mindmap")}
                                                className="flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg border border-white/10 text-[9px] transition-all cursor-pointer"
                                            >
                                                <BookOpen size={9} /> Mindmap
                                            </button>
                                            <button
                                                onClick={() => onOpenTab("flashcards")}
                                                className="flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg border border-white/10 text-[9px] transition-all cursor-pointer"
                                            >
                                                <Sparkles size={9} /> Flashcards
                                            </button>
                                            <button
                                                onClick={() => onOpenTab("quiz")}
                                                className="flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg border border-white/10 text-[9px] transition-all cursor-pointer"
                                            >
                                                <Play size={9} /> Trắc nghiệm
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2.5 justify-start">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[#C5A059] bg-[#C5A059]/20">
                                    <Bot size={12} />
                                </div>
                                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 rounded-tl-none flex items-center gap-2">
                                    <Loader2 size={12} className="animate-spin text-[#C5A059]" />
                                    <span className="text-[11px] text-white/40">Jarvis đang truy xuất...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}
