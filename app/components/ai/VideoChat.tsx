"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import { Send, User, Bot, Clock, Loader2, Sparkles, AlertCircle, Zap } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { checkLessonEmbeddings } from "@/app/actions/video-chat";

interface VideoChatProps {
    lessonId: string;
    onSeek: (seconds: number) => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const SUGGESTED_QUESTIONS = [
    "Tóm tắt nội dung chính của bài giảng",
    "Giảng viên đã giải thích khái niệm nào quan trọng nhất?",
    "Liệt kê các bước thực hành trong bài",
    "Giải thích lại phần code ví dụ trong bài",
];

export default function VideoChat({ lessonId, onSeek }: VideoChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [embeddingStatus, setEmbeddingStatus] = useState<{ ready: boolean; count: number } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Check embedding status & load chat history on mount
    useEffect(() => {
        const initData = async () => {
            try {
                // Load embedding info
                const result = await checkLessonEmbeddings(lessonId);
                setEmbeddingStatus({ ready: result.hasEmbeddings, count: result.count });

                // Load chat history
                const res = await fetch(`/api/chat/history?lessonId=${lessonId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.messages && data.messages.length > 0) {
                        setMessages(data.messages);
                    }
                }
            } catch (error) {
                console.error("Failed to load init data:", error);
                setEmbeddingStatus({ ready: false, count: 0 });
            }
        };
        initData();
    }, [lessonId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        await sendMessage(input.trim());
    };

    const sendMessage = async (text: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat/video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, query: text })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            // Stream response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = "";

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: ""
            };
            setMessages(prev => [...prev, assistantMessage]);

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantContent += chunk;

                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMessage.id
                            ? { ...m, content: assistantContent }
                            : m
                    )
                );
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "⚠️ Có lỗi xảy ra khi kết nối AI. Vui lòng thử lại sau."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Render markdown with clickable timestamps
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
                    <Clock size={10} />
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
        <div className="flex flex-col h-full bg-[#F9F8F4]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        {/* AI Header */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C5A059] to-amber-600 flex items-center justify-center mb-4 shadow-lg">
                            <Sparkles size={28} className="text-white" />
                        </div>
                        <h3 className="font-bold text-stone-800 text-lg mb-1">AI Trợ giảng</h3>
                        <p className="text-sm text-stone-500 max-w-xs mb-1">
                            Hỏi bất kỳ điều gì về bài học. AI sẽ trả lời dựa trên nội dung video và trích dẫn mốc thời gian.
                        </p>

                        {/* Embedding Status */}
                        {embeddingStatus && (
                            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-5 ${embeddingStatus.ready
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                                }`}>
                                {embeddingStatus.ready ? (
                                    <><Zap size={12} /> {embeddingStatus.count} đoạn đã được index</>
                                ) : (
                                    <><AlertCircle size={12} /> Chưa có dữ liệu embedding</>
                                )}
                            </div>
                        )}

                        {/* Quick Suggestions */}
                        <div className="w-full space-y-2">
                            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Gợi ý câu hỏi</p>
                            <div className="grid grid-cols-1 gap-2">
                                {SUGGESTED_QUESTIONS.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(q)}
                                        className="text-left text-sm text-stone-600 bg-white border border-stone-200 rounded-xl px-4 py-2.5 hover:border-[#C5A059] hover:bg-amber-50 hover:text-[#C5A059] transition-all"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white ${m.role === 'user' ? 'bg-stone-600 order-2' : 'bg-[#C5A059]'
                            }`}>
                            {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed overflow-x-hidden ${m.role === 'user'
                            ? 'bg-stone-100 text-stone-800 rounded-tr-none'
                            : 'bg-white border border-stone-200 shadow-sm text-stone-800 rounded-tl-none [&_pre]:!bg-[#1e1e1e] [&_code]:!bg-transparent [&_pre_code]:!text-[#d4d4d4]'
                            }`}>
                            {m.role === 'user' ? m.content : renderContent(m.content)}
                        </div>
                    </div>
                ))}

                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex gap-3 justify-start">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white bg-[#C5A059]">
                            <Bot size={14} />
                        </div>
                        <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-sm rounded-tl-none flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin text-[#C5A059]" />
                            <span className="text-xs text-stone-400">Đang phân tích...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-stone-200 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Hỏi về nội dung bài học..."
                        className="flex-1 px-4 py-2.5 rounded-full border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="w-14 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl bg-[#C5A059] text-white hover:bg-[#b08d4b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} className="translate-x-[1px] translate-y-[-1px]" />
                    </button>
                </div>
            </form>
        </div>
    );
}
