"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, Send, Sparkles, Bot, Link as LinkIcon, Lock, LogIn } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { createClient } from "@/utils/supabase/client";
import LoginModal from "@/app/components/auth/LoginModal";
import RegisterModal from "@/app/components/auth/RegisterModal";

const chatTransport = new DefaultChatTransport({
  api: '/api/chat',
});

// Component hiển thị text theo hiệu ứng gõ chữ (Typewriter effect) từng ký tự mịn màng
function TypewriterMarkdown({
  text,
  isStreaming,
  components,
}: {
  text: string;
  isStreaming?: boolean;
  components?: any;
}) {
  const [displayedLength, setDisplayedLength] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(text.length);
      return;
    }

    if (displayedLength < text.length) {
      const timer = setInterval(() => {
        setDisplayedLength((prev) => {
          if (prev >= text.length) {
            clearInterval(timer);
            return text.length;
          }
          // Tăng 2 ký tự mỗi 15ms để tạo hiệu ứng gõ mượt như đang nói chuyện thực tế
          return Math.min(prev + 2, text.length);
        });
      }, 15);

      return () => clearInterval(timer);
    }
  }, [text, isStreaming, displayedLength]);

  const currentText = isStreaming ? text.slice(0, displayedLength) : text;

  return (
    <ReactMarkdown components={components}>
      {currentText}
    </ReactMarkdown>
  );
}

export default function ChatBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState(""); // Quản lý input thủ công
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Đóng/Ẩn ChatBot hoàn toàn trên các trang Admin và Instructor
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/instructor")) {
    return null;
  }

  // 2. Sử dụng hook useChat với cấu hình Transport cố định & experimental_throttle 30ms cho real-time update
  const { messages, sendMessage, status } = useChat({
    transport: chatTransport,
    experimental_throttle: 30,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // 3. Hàm xử lý gửi tin nhắn - Kiểm duyệt Đăng nhập
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (input.trim()) {
      sendMessage({ text: input }); // Gửi object { text }
      setInput("");
    }
  };

  // Kiểm tra trạng thái để disable nút
  const isBusy = status !== 'ready';

  const markdownComponents = {
    a: ({ node, href, children, ...props }: any) => {
      if (!href) return null;
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

    img: ({ node, src, alt, ...props }: any) => (
      <span className="block my-3 rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Ảnh minh họa"}
          className="w-full h-auto object-cover max-h-[200px]"
          loading="lazy"
        />
      </span>
    ),

    ul: ({ node, ...props }: any) => <ul {...props} className="list-disc ml-5 my-2 space-y-1" />,
    ol: ({ node, ...props }: any) => <ol {...props} className="list-decimal ml-5 my-2 space-y-1" />,
    li: ({ node, ...props }: any) => <li {...props} className="pl-1" />,
    strong: ({ node, ...props }: any) => <span {...props} className="font-bold text-[#C5A059]" />,
    p: ({ node, ...props }: any) => <p {...props} className="mb-2 last:mb-0" />,
  };

  return isMounted ? (
    <>
      <motion.div
        className="fixed z-50 flex flex-col items-end gap-4"
        style={{ bottom: "1.5rem", right: "1.5rem", touchAction: "none" }}
        drag
        dragMomentum={false}
      >
        {/* Cửa sổ Chat */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, originX: 1, originY: 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[90vw] md:w-[400px] h-[500px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col font-sans mb-2"
              onPointerDown={(e) => e.stopPropagation()} // Chặn sự kiện drag khi click vào bảng chat
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
                {!currentUser && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center text-xs shadow-sm mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center mx-auto mb-2">
                      <Lock size={20} />
                    </div>
                    <p className="font-bold text-stone-800 text-sm mb-1">Yêu cầu đăng nhập</p>
                    <p className="text-stone-600 mb-3 leading-relaxed">
                      Bạn cần đăng nhập để trò chuyện với Aura AI. Lịch sử cuộc trò chuyện sẽ được bảo mật và mã hóa AES-256-GCM.
                    </p>
                    <button
                      onClick={() => setIsLoginModalOpen(true)}
                      className="px-5 py-2 bg-[#C5A059] text-white font-bold rounded-full hover:bg-[#1a1a1a] transition-all shadow-md inline-flex items-center gap-1.5"
                    >
                      <LogIn size={14} /> Đăng nhập ngay
                    </button>
                  </div>
                )}

                {messages.length === 0 && currentUser && (
                  <div className="text-center text-stone-400 text-sm mt-10">
                    Hãy bắt đầu trò chuyện với Aura AI...
                  </div>
                )}

                {messages.map((msg, msgIdx) => {
                  const isLastAssistantMessage = msg.role === "assistant" && msgIdx === messages.length - 1;
                  const isStreamingThisMessage = isLastAssistantMessage && isBusy;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === "user"
                          ? "bg-[#1a1a1a] text-white rounded-tr-none"
                          : "bg-white text-stone-700 border border-stone-200 rounded-tl-none"
                          }`}
                      >
                        {/* Render Message Parts or Fallback Content với hiệu ứng Typewriter khi streaming */}
                        {(() => {
                          const renderableParts = msg.parts?.filter(
                            (p) => (p.type === "text" || p.type === "reasoning") && (p as any).text
                          ) || [];

                          if (renderableParts.length > 0) {
                            return renderableParts.map((part, index) => (
                              <TypewriterMarkdown
                                key={index}
                                text={(part as any).text}
                                isStreaming={isStreamingThisMessage}
                                components={markdownComponents}
                              />
                            ));
                          }

                          const fallbackText = (msg as any).content || (msg as any).text || "";
                          if (fallbackText) {
                            return (
                              <TypewriterMarkdown
                                text={fallbackText}
                                isStreaming={isStreamingThisMessage}
                                components={markdownComponents}
                              />
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })}

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
                    onClick={() => {
                      if (!currentUser) setIsLoginModalOpen(true);
                    }}
                    disabled={isBusy}
                    placeholder={
                      !currentUser
                        ? "Đăng nhập để trò chuyện với Aura AI..."
                        : isBusy
                        ? "Đang trả lời..."
                        : "Hỏi gì đó về lập trình..."
                    }
                    className="flex-1 bg-stone-50 border border-stone-200 text-stone-700 text-sm rounded-full px-4 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all disabled:opacity-60 disabled:bg-stone-100 cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={isBusy || (!currentUser ? false : !input.trim())}
                    className="w-10 h-10 rounded-full bg-[#C5A059] text-[#1a1a1a] flex items-center justify-center hover:bg-[#1a1a1a] hover:text-[#C5A059] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {!currentUser ? <LogIn size={18} /> : <Send size={18} />}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nút mở Chat (Floating Button) */}
        <motion.button
          className="w-14 h-14 bg-[#1a1a1a] text-[#C5A059] rounded-full shadow-2xl border border-[#C5A059]/50 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
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
      </motion.div>

      {/* Modals Login / Register */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
      />
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />
    </>
  ) : null;
}