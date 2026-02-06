"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Send, User, Bot, Clock, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface VideoChatProps {
    lessonId: string;
    onSeek: (seconds: number) => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function VideoChat({ lessonId, onSeek }: VideoChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat/video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, query: userMessage.content })
            });

            if (!response.ok) throw new Error('API Error');

            // Read the streaming response
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

                // Update the assistant message content in real-time
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
                content: "Có lỗi xảy ra. Vui lòng thử lại."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Render timestamp citations as clickable
    const renderContent = (content: string) => {
        // Match patterns like [05:30] or [00:05:30]
        const parts = content.split(/(\[\d{1,2}:\d{2}(?::\d{2})?\])/g);

        return (
            <ReactMarkdown
                components={{
                    p: ({ children }) => (
                        <p className="mb-2 last:mb-0">
                            {typeof children === 'string' ? parseTimestamps(children) : children}
                        </p>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        );
    };

    const parseTimestamps = (text: string) => {
        const regex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }

            // Calculate seconds
            const hours = match[3] ? parseInt(match[1]) : 0;
            const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1]);
            const seconds = match[3] ? parseInt(match[3]) : parseInt(match[2]);
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            // Add clickable timestamp
            parts.push(
                <button
                    key={match.index}
                    onClick={() => onSeek(totalSeconds)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-[#C5A059]/10 text-[#C5A059] rounded font-mono text-xs hover:bg-[#C5A059]/20 transition-colors"
                >
                    <Clock size={10} />
                    {match[0].slice(1, -1)}
                </button>
            );

            lastIndex = regex.lastIndex;
        }

        // Add remaining text
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
                    <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 p-8">
                        <Bot size={48} className="mb-4 text-stone-300" />
                        <h3 className="font-bold text-stone-600 mb-2">AI Trợ giảng</h3>
                        <p className="text-sm max-w-xs">
                            Hỏi bất kỳ điều gì về nội dung bài học. AI sẽ trả lời dựa trên video và trích dẫn mốc thời gian.
                        </p>
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
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
                            ? 'bg-stone-100 text-stone-800 rounded-tr-none'
                            : 'bg-white border border-stone-200 shadow-sm text-stone-800 rounded-tl-none'
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
                        <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-sm rounded-tl-none">
                            <Loader2 size={16} className="animate-spin text-[#C5A059]" />
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
                        className="flex-1 px-4 py-2 rounded-full border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] text-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 rounded-full bg-[#C5A059] text-white hover:bg-[#b08d4b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
}
