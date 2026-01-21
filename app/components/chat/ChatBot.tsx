"use client";

import { useState, useRef, useEffect } from "react";

import { MessageSquare, X, Send, Sparkles, Bot, Link as LinkIcon } from "lucide-react";

import Link from "next/link";

import { motion, AnimatePresence } from "framer-motion";

import ReactMarkdown from "react-markdown";

import { useChat } from "@ai-sdk/react";

import { DefaultChatTransport } from "ai";

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState(""); // Quản lý input thủ công

  // 2. Sử dụng hook useChat với cấu hình Transport
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // 3. Hàm xử lý gửi tin nhắn
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input }); // Gửi object { text }
      setInput("");
    }
  };

  // Kiểm tra trạng thái để disable nút
  const isBusy = status !== 'ready';

  return (
    <>
      {/* Nút mở Chat (Floating Button) */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#1a1a1a] text-[#C5A059] rounded-full shadow-2xl border border-[#C5A059]/50 flex items-center justify-center hover:scale-110 transition-transform group"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ rotate: 10 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="relative">
             <MessageSquare size={24} />
             <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C5A059]"></span>
              </span>
          </div>
        )}
      </motion.button>

      {/* Cửa sổ Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[90vw] md:w-[400px] h-[500px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col font-sans"
          >
            {/* Header */}
            <div className="bg-[#1a1a1a] p-4 flex items-center gap-3 border-b border-[#C5A059]/30">
              <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 border border-[#C5A059] flex items-center justify-center text-[#C5A059]">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-[#F9F8F4] font-serif font-bold text-lg flex items-center gap-2">
                  Aura Assistant <Sparkles size={14} className="text-[#C5A059]" />
                </h3>
                <p className="text-xs text-stone-400 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></span>
                  {isBusy ? 'Thinking...' : 'Online'}
                </p>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#F9F8F4] space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center text-stone-400 text-sm mt-10">
                  Hãy bắt đầu trò chuyện với Aura AI...
                </div>
              )}
              
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#1a1a1a] text-white rounded-tr-none"
                        : "bg-white text-stone-700 border border-stone-200 rounded-tl-none"
                    }`}
                  >
                    {/* 4. Render Message Parts (Text) */}
                    {msg.parts.map((part, index) =>
                      part.type === 'text' ? (
                        <ReactMarkdown
                            key={index}
                            components={{
                              // 1. XỬ LÝ LINK (Thẻ a)
                              a: ({ node, href, children, ...props }) => {
                                if (!href) return null;
                                
                                // Kiểm tra xem link có phải nội bộ không
                                const isInternal = href.startsWith('/') || href.includes(process.env.NEXT_PUBLIC_APP_URL || 'localhost');

                                const className = "text-blue-600 hover:text-blue-800 font-bold hover:underline inline-flex items-center gap-1";

                                if (isInternal) {
                                  return (
                                    <Link href={href} className={className}>
                                      {children} <LinkIcon size={14} />
                                    </Link>
                                  );
                                }

                                return (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
                                    {children} ↗
                                  </a>
                                );
                              },

                              // 2. XỬ LÝ ẢNH (Thẻ img) - ĐÂY LÀ PHẦN BẠN ĐANG THIẾU
                              img: ({ node, src, alt, ...props }) => {
                                  return (
                                      <span className="block my-3 rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img 
                                              src={src} 
                                              alt={alt || "Ảnh minh họa"} 
                                              className="w-full h-auto object-cover max-h-[200px]"
                                              loading="lazy"
                                          />
                                      </span>
                                  );
                              },

                              // 3. Các thẻ khác
                              ul: ({ node, ...props }) => <ul {...props} className="list-disc ml-5 my-2 space-y-1" />,
                              ol: ({ node, ...props }) => <ol {...props} className="list-decimal ml-5 my-2 space-y-1" />,
                              li: ({ node, ...props }) => <li {...props} className="pl-1" />,
                              strong: ({ node, ...props }) => <span {...props} className="font-bold text-[#C5A059]" />,
                              p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />, // Tạo khoảng cách giữa các đoạn
                            }}
                          >
                            {part.text}
                          </ReactMarkdown>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator khi đang stream */}
              {isBusy && (
                <div className="flex justify-start">
                  <div className="bg-white border border-stone-200 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-stone-100">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isBusy}
                  placeholder={isBusy ? "Đang trả lời..." : "Hỏi gì đó về lập trình..."}
                  className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 text-sm rounded-full px-4 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all disabled:opacity-60 disabled:bg-stone-100"
                />
                <button
                  type="submit"
                  disabled={isBusy || !input.trim()}
                  className="w-10 h-10 rounded-full bg-[#C5A059] text-[#1a1a1a] flex items-center justify-center hover:bg-[#1a1a1a] hover:text-[#C5A059] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}