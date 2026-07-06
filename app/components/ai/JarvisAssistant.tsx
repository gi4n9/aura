"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Play, BookOpen, AlertTriangle, User, Bot, Loader2, Send, Mic, Volume2, VolumeX } from "lucide-react";
import AuraAvatar3D from "./AuraAvatar3D";
import ReactMarkdown from "react-markdown";

import { generateSpeech } from "@/app/actions/tts-speak";

interface JarvisProps {
    lessonId: string;
    onSeek: (seconds: number) => void;
    onOpenTab: (tabId: "quiz" | "ai" | "mindmap" | "flashcards") => void;
}

export default function JarvisAssistant({ lessonId, onSeek, onOpenTab }: JarvisProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [warmupData, setWarmupData] = useState<{ greeting: string; suggestions: string[] } | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [confidenceWarning, setConfidenceWarning] = useState<boolean>(false);
    const [voiceId, setVoiceId] = useState("vi-VN-HoaiMyNeural"); // default voice
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

                    // Luôn sinh và phát audio bằng queue phát tuần tự câu
                    if (data.greeting) {
                        const cleanTextForSpeech = (t: string) => {
                            return t
                                .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
                                .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, "")
                                .replace(/\b\d{1,2}:\d{2}\b/g, "")
                                .replace(/\s+/g, " ")
                                .trim();
                        };
                        const cleaned = cleanTextForSpeech(data.greeting);
                        const sentences = cleaned.split(/(?<=[.?!。:\n])/).map(s => s.trim()).filter(Boolean);
                        
                        for (const s of sentences) {
                            fetch("/api/chat/tts", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ text: s, voice: voiceId, speed })
                            })
                            .then(res => res.json())
                            .then(d => {
                                if (d.audioUrl) queueAudio(d.audioUrl);
                            })
                            .catch(err => console.error("Lỗi greeting tts:", err));
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi lấy thông tin khởi tạo Jarvis:", err);
            }
        };
        fetchWarmup();
    }, [lessonId]);

    // 2. Tự động đọc lại tin nhắn cuối cùng khi thay đổi giọng nói hoặc tốc độ đọc
    useEffect(() => {
        // Chỉ kích hoạt phát lại khi người dùng thay đổi thực tế voiceId hoặc speed qua dropdown
        const hasChanged = prevSettingsRef.current.voiceId !== voiceId || prevSettingsRef.current.speed !== speed;
        prevSettingsRef.current = { voiceId, speed };

        if (!hasChanged) return;

        const assistantMessages = messages.filter(m => m.role === "assistant");
        if (assistantMessages.length === 0) return;
        
        const lastMsg = assistantMessages[assistantMessages.length - 1];
        
        const changeVoiceAndSpeed = async () => {
            // Tạm thời dừng phát hiện tại và xóa hàng đợi
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            setAudioUrl(null);
            audioQueueRef.current = [];
            
            try {
                const cleanTextForSpeech = (text: string) => {
                    return text
                        .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
                        .replace(/\(\d{1,2}:\d{2}(?::\d{2})?\)/g, "")
                        .replace(/\b\d{1,2}:\d{2}\b/g, "")
                        .replace(/\s+/g, " ")
                        .trim();
                };
                const cleanedText = cleanTextForSpeech(lastMsg.content);
                const sentences = cleanedText.split(/(?<=[.?!。:\n])/).map(s => s.trim()).filter(Boolean);
                
                for (const s of sentences) {
                    fetch("/api/chat/tts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: s, voice: voiceId, speed })
                    })
                    .then(res => res.json())
                    .then(d => {
                        if (d.audioUrl) queueAudio(d.audioUrl);
                    })
                    .catch(err => console.error("Lỗi changeVoiceAndSpeed tts:", err));
                }
            } catch (err) {
                console.error("Lỗi đổi giọng nói/tốc độ:", err);
            }
        };
        
        changeVoiceAndSpeed();
    }, [voiceId, speed]);

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

            // Hàm con xử lý gọi TTS cho từng câu ngầm
            const processSentence = async (sentence: string) => {
                const trimmed = sentence.trim();
                if (!trimmed) return;
                try {
                    const ttsRes = await fetch("/api/chat/tts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: trimmed, voice: voiceId, speed })
                    });
                    const d = await ttsRes.json();
                    if (d.audioUrl) {
                        queueAudio(d.audioUrl);
                    }
                } catch (err) {
                    console.error("Lỗi tts cho câu trong stream:", trimmed, err);
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                responseText += chunk;
                sentenceBuffer += chunk;

                // Cập nhật UI ngay lập tức khi nhận token text mới
                setMessages(prev => {
                    return prev.map(m => {
                        if (m.id === assistantMsgId) {
                            return { ...m, content: responseText };
                        }
                        return m;
                    });
                });

                // Phân tách câu
                const sentences = sentenceBuffer.split(/(?<=[.?!。:\n])/);
                if (sentences.length > 1) {
                    sentenceBuffer = sentences.pop() || "";
                    for (const s of sentences) {
                        // Chạy song song không block stream
                        processSentence(s);
                    }
                }
            }

            // Xử lý nốt phần văn bản còn lại trong buffer
            if (sentenceBuffer.trim()) {
                await processSentence(sentenceBuffer);
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

    // Render markdown với clickable timestamps
    const renderContent = (content: string) => {
        return (
            <ReactMarkdown
                components={{
                    p: ({ children }) => (
                        <p className="mb-2 last:mb-0">
                            {typeof children === 'string' ? parseTimestamps(children) : children}
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
                    ul: ({ children }) => <ul className="list-disc list-outside space-y-1 my-2 ml-4">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-outside space-y-1 my-2 ml-4">{children}</ol>,
                    strong: ({ children }) => <strong className="font-bold text-stone-900">{children}</strong>,
                }}
            >
                {content}
            </ReactMarkdown>
        );
    };

    const parseTimestamps = (text: string) => {
        const regex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
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
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-[#C5A059]/10 text-[#C5A059] rounded font-mono text-xs hover:bg-[#C5A059]/20 transition-colors cursor-pointer"
                >
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

    return (
        <div className="flex flex-col h-full bg-[#F9F8F4] overflow-hidden">
            {/* Cột 1: 3D Jarvis Visualizer (Pulsing Sphere) */}
            <div className="h-[200px] w-full bg-[#111111] relative flex items-center justify-center border-b border-stone-800">
                <AuraAvatar3D 
                    audioUrl={audioUrl} 
                    isSpeaking={isSpeaking} 
                    onSpeakEnd={handleSpeakEnd}
                    isMuted={isMuted}
                />
                
                {/* Trạng thái hoạt động overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] text-white">
                    <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-amber-500 animate-ping' : 'bg-stone-500'}`} />
                        {isSpeaking ? "Jarvis đang phát âm thanh..." : "Jarvis sẵn sàng"}
                    </span>
                    {confidenceWarning && (
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <AlertTriangle size={12} /> Kiến thức ngoài giáo trình
                        </span>
                    )}
                </div>

                {/* Nút điều khiển âm thanh */}
                <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 rounded-lg text-white transition-all"
                    title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
            </div>

            {/* Cột 2: Khung Chat */}
            <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${m.role === 'user' ? 'bg-stone-600 order-2' : 'bg-[#C5A059]'}`}>
                                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed overflow-x-hidden ${
                                m.role === 'user' 
                                    ? 'bg-stone-100 text-stone-800 rounded-tr-none' 
                                    : 'bg-stone-50 border border-stone-100 rounded-tl-none shadow-sm'
                            }`}>
                                {m.role === 'user' ? m.content : renderContent(m.content)}
                                
                                {/* Nút hành động nhanh sau tin nhắn trợ lý */}
                                {m.role === 'assistant' && (
                                    <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-stone-200/60">
                                        <button 
                                            onClick={() => onOpenTab("mindmap")}
                                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 text-stone-600 rounded-lg border border-stone-200 text-[10px] transition-all cursor-pointer"
                                        >
                                            <BookOpen size={10} /> Mindmap
                                        </button>
                                        <button 
                                            onClick={() => onOpenTab("flashcards")}
                                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 text-stone-600 rounded-lg border border-stone-200 text-[10px] transition-all cursor-pointer"
                                        >
                                            <Sparkles size={10} /> Flashcards
                                        </button>
                                        <button 
                                            onClick={() => onOpenTab("quiz")}
                                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 text-stone-600 rounded-lg border border-stone-200 text-[10px] transition-all cursor-pointer"
                                        >
                                            <Play size={10} /> Trắc nghiệm
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex gap-3 justify-start">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white bg-[#C5A059]">
                                <Bot size={14} />
                            </div>
                            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 rounded-tl-none flex items-center gap-2">
                                <Loader2 size={12} className="animate-spin text-[#C5A059]" />
                                <span className="text-[11px] text-stone-400">Jarvis đang truy xuất thông tin...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Gợi ý thảo luận - Hóa giải Trang giấy trắng */}
                {warmupData && messages.length <= 1 && (
                    <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 flex-shrink-0">
                        <p className="text-[10px] text-stone-400 font-bold mb-1.5 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={11} className="text-[#C5A059]" /> Câu hỏi đề xuất cho bài học:
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {warmupData.suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(s)}
                                    className="text-left text-[11px] bg-white border border-stone-200 rounded-lg px-3 py-1.5 hover:border-[#C5A059] hover:bg-amber-50/50 hover:text-[#C5A059] transition-all text-stone-700 font-medium"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form nhập chat + Selector Giọng đọc */}
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} 
                    className="p-3 border-t border-stone-100 bg-white flex-shrink-0"
                >
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-stone-400 font-medium">Ngôn ngữ & Giọng đọc:</span>
                            <select 
                                value={voiceId} 
                                onChange={(e) => setVoiceId(e.target.value)}
                                className="text-[10px] border border-stone-200 rounded px-1.5 py-0.5 outline-none focus:border-[#C5A059] text-stone-600 bg-white"
                            >
                                <option value="vi-VN-HoaiMyNeural">🇻🇳 Hoài Mỹ (Nữ Tiếng Việt)</option>
                                <option value="vi-VN-NamMinhNeural">🇻🇳 Nam Minh (Nam Tiếng Việt)</option>
                                <option value="en-US-AriaNeural">🇺🇸 Aria (Nữ Tiếng Anh)</option>
                                <option value="en-US-GuyNeural">🇺🇸 Guy (Nam Tiếng Anh)</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-stone-400 font-medium">Tốc độ đọc:</span>
                            <select 
                                value={speed} 
                                onChange={(e) => setSpeed(e.target.value)}
                                className="text-[10px] border border-stone-200 rounded px-1.5 py-0.5 outline-none focus:border-[#C5A059] text-stone-600 bg-white"
                            >
                                <option value="0.8">Chậm (0.8x)</option>
                                <option value="1.0">Bình thường (1.0x)</option>
                                <option value="1.2">Nhanh (1.2x)</option>
                                <option value="1.4">Rất nhanh (1.4x)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={toggleSpeechRecognition}
                            className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                                isRecording 
                                    ? 'bg-red-50 text-red-500 border-red-200 animate-pulse scale-105 shadow-inner' 
                                    : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100 hover:text-stone-700'
                            }`}
                            title={isRecording ? "Dừng lắng nghe" : "Nói trực tiếp với Jarvis"}
                            disabled={isLoading}
                        >
                            <Mic size={16} className={isRecording ? "animate-bounce" : ""} />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isRecording ? "🎤 Jarvis đang lắng nghe... Hãy nói ngay!" : "Hỏi Jarvis về nội dung bài giảng..."}
                            className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#C5A059] text-xs transition-all ${
                                isRecording 
                                    ? 'border-red-300 bg-red-50/20 placeholder-red-400 font-medium' 
                                    : 'border-stone-200'
                            }`}
                            disabled={isLoading || isRecording}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[#C5A059] hover:bg-[#b08d4b] text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                            disabled={isLoading || isRecording || !input.trim()}
                        >
                            Gửi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
