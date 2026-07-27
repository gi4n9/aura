"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getMessages } from "@/app/actions/chat";
import { sendMessageEdge, sendMessageFallback } from "@/lib/edge-functions";
import { Search, Send, MoreVertical, Phone, Video, Info, ArrowLeft, Loader2, Check, CheckCheck, User, MessageSquare } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import UserAvatar from "@/app/components/common/UserAvatar";

// Types
type ConversationInfo = {
    id: string;
    isGroup?: boolean;
    name?: string | null;
    avatarUrl?: string | null;
    courseId?: string | null;
    otherUser: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
        email: string | null;
    } | undefined;
    lastMessage: {
        content: string;
        createdAt: Date;
        isMine: boolean;
    } | null;
    updatedAt: Date;
};

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

type Message = {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
    status?: MessageStatus;
    isBotResponse?: boolean;
    sources?: any[];
    sender: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
};

export default function InstructorMessagesInterface({
    initialConversations,
    currentUserId,
    className
}: {
    initialConversations: ConversationInfo[];
    currentUserId: string;
    className?: string;
}) {
    const supabase = createClient();
    const { t } = useLanguage();

    const rootClassName = className ?? "flex h-[85vh] min-h-[750px] w-full bg-white overflow-hidden rounded-2xl shadow-sm border border-stone-200 font-sans text-stone-900";

    // State
    const [conversations, setConversations] = useState<ConversationInfo[]>(initialConversations);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Derived state
    const selectedConversation = conversations.find(c => c.id === selectedConvId);
    const filteredConversations = conversations.filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const name = c.isGroup ? c.name : c.otherUser?.fullName;
        return (name || "").toLowerCase().includes(q) || (c.otherUser?.email || "").toLowerCase().includes(q);
    });

    const [summaryData, setSummaryData] = useState<any>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Scroll to bottom of internal container only
    const scrollToBottom = (smooth = true) => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: smooth ? "smooth" : "auto"
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const selectedConvIdRef = useRef(selectedConvId);
    const selectedConversationRef = useRef(selectedConversation);
    const currentUserIdRef = useRef(currentUserId);

    useEffect(() => {
        selectedConvIdRef.current = selectedConvId;
        selectedConversationRef.current = selectedConversation;
        currentUserIdRef.current = currentUserId;
    }, [selectedConvId, selectedConversation, currentUserId]);

    // Realtime messages subscription
    useEffect(() => {
        const handleNewMessage = (payload: any) => {
            const newMsg = payload.new as any;

            if (selectedConvIdRef.current && newMsg.conversationId === selectedConvIdRef.current) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;

                    const isMe = newMsg.senderId === currentUserIdRef.current;
                    const senderInfo = isMe
                        ? { id: currentUserIdRef.current, fullName: t("messages.you", "Giảng viên"), avatarUrl: null }
                        : {
                            id: selectedConversationRef.current?.otherUser?.id || "",
                            fullName: selectedConversationRef.current?.otherUser?.fullName || t("common.user", "Học viên"),
                            avatarUrl: selectedConversationRef.current?.otherUser?.avatarUrl || null
                        };

                    return [...prev, {
                        id: newMsg.id,
                        content: newMsg.content,
                        senderId: newMsg.senderId,
                        createdAt: new Date(newMsg.createdAt),
                        isBotResponse: newMsg.isBotResponse,
                        sources: newMsg.sources,
                        sender: senderInfo
                    }];
                });
            }

            setConversations(prev => {
                const convIndex = prev.findIndex(c => c.id === newMsg.conversationId);
                if (convIndex === -1) return prev;

                const updatedConv = { ...prev[convIndex] };
                updatedConv.lastMessage = {
                    content: newMsg.content,
                    createdAt: new Date(newMsg.createdAt),
                    isMine: newMsg.senderId === currentUserIdRef.current
                };
                updatedConv.updatedAt = new Date(newMsg.createdAt);

                const newList = [...prev];
                newList.splice(convIndex, 1);
                return [updatedConv, ...newList];
            });
        };

        const channel = supabase
            .channel('instructor-chat-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'DirectMessage' }, handleNewMessage)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_message' }, handleNewMessage)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, t]);

    // Typing broadcast listener
    useEffect(() => {
        if (!selectedConvId) return;

        const typingChannel = supabase
            .channel(`typing-${selectedConvId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.userId !== currentUserId) {
                    setIsTyping(true);
                    setTimeout(() => setIsTyping(false), 3000);
                }
            })
            .on('broadcast', { event: 'stop-typing' }, (payload) => {
                if (payload.payload.userId !== currentUserId) {
                    setIsTyping(false);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(typingChannel);
        };
    }, [selectedConvId, currentUserId, supabase]);

    const broadcastTyping = useCallback(() => {
        if (!selectedConvId) return;

        supabase.channel(`typing-${selectedConvId}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: currentUserId }
        });

        if (typingTimeout) clearTimeout(typingTimeout);

        const timeout = setTimeout(() => {
            supabase.channel(`typing-${selectedConvId}`).send({
                type: 'broadcast',
                event: 'stop-typing',
                payload: { userId: currentUserId }
            });
        }, 2000);

        setTypingTimeout(timeout);
    }, [selectedConvId, currentUserId, typingTimeout, supabase]);

    // Cursor pagination
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (!selectedConvId) return;

        const loadMessages = async () => {
            setLoadingMessages(true);
            const result = await getMessages(selectedConvId, { limit: 20 });
            const msgs = Array.isArray(result.messages) ? result.messages : [];
            setMessages(msgs as Message[]);
            setNextCursor(result.nextCursor ?? null);
            setHasMoreMessages(result.hasMore || false);
            setLoadingMessages(false);
            setIsMobileListVisible(false);

            setTimeout(() => scrollToBottom(false), 100);
        };

        loadMessages();

        const pollInterval = setInterval(async () => {
            if (document.hidden) return;
            const result = await getMessages(selectedConvId);
            const serverMsgs = Array.isArray(result.messages) ? result.messages : [];

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newMsgs = serverMsgs.filter((m: any) => !existingIds.has(m.id));
                if (newMsgs.length === 0) return prev;
                return [...prev, ...newMsgs as Message[]];
            });
        }, 5000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [selectedConvId]);

    const handleLoadMore = async () => {
        if (!selectedConvId || !nextCursor || loadingMore) return;

        setLoadingMore(true);
        const container = messagesContainerRef.current;
        const oldScrollHeight = container?.scrollHeight || 0;

        const result = await getMessages(selectedConvId, { limit: 20, cursor: nextCursor });
        const oldMsgs = Array.isArray(result.messages) ? result.messages : [];

        setMessages(prev => [...(oldMsgs as Message[]), ...prev]);
        setNextCursor(result.nextCursor ?? null);
        setHasMoreMessages(result.hasMore || false);
        setLoadingMore(false);

        setTimeout(() => {
            if (container) {
                container.scrollTop = container.scrollHeight - oldScrollHeight;
            }
        }, 50);
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop === 0 && hasMoreMessages && !loadingMore) {
            handleLoadMore();
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvId) return;

        const content = newMessage.trim();
        setNewMessage("");

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            content,
            senderId: currentUserId,
            createdAt: new Date(),
            status: 'sending',
            sender: {
                id: currentUserId,
                fullName: t("messages.you", "Giảng viên"),
                avatarUrl: null
            }
        };

        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        setConversations(prev => {
            const convIndex = prev.findIndex(c => c.id === selectedConvId);
            if (convIndex === -1) return prev;

            const updatedConv = { ...prev[convIndex] };
            updatedConv.lastMessage = {
                content,
                createdAt: new Date(),
                isMine: true
            };
            updatedConv.updatedAt = new Date();

            const newList = [...prev];
            newList.splice(convIndex, 1);
            return [updatedConv, ...newList];
        });

        const sendWithRetry = async (retries = 3): Promise<void> => {
            try {
                let sentMsg: any;
                try {
                    const res = await sendMessageEdge({ conversationId: selectedConvId, content, senderId: currentUserId });
                    sentMsg = res.message || res;
                } catch {
                    sentMsg = await sendMessageFallback(selectedConvId, content, currentUserId);
                }

                setMessages(prev => prev.map(m =>
                    m.id === tempId
                        ? {
                            id: sentMsg.id,
                            content: sentMsg.content,
                            senderId: sentMsg.senderId,
                            createdAt: new Date(sentMsg.createdAt),
                            status: 'delivered',
                            sender: m.sender
                        }
                        : m
                ));
            } catch (error) {
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 1000));
                    return sendWithRetry(retries - 1);
                }

                setMessages(prev => prev.map(m =>
                    m.id === tempId ? { ...m, status: 'sending' as MessageStatus } : m
                ));
            }
        };

        sendWithRetry();
    };

    return (
        <div className={rootClassName}>
            {/* --- LEFT: CONVERSATION LIST --- */}
            <div className={`w-full md:w-80 border-r border-stone-200 flex flex-col bg-[#F9F8F4] text-stone-900 ${
                !isMobileListVisible ? 'hidden md:flex' : 'flex'
            }`}>
                {/* Header */}
                <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                    <h2 className="font-serif font-bold text-lg text-stone-800 flex items-center gap-2">
                        <MessageSquare size={18} className="text-[#C5A059]" />
                        {t("messages.title", "Tin nhắn & Hỗ trợ")}
                    </h2>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t("messages.search", "Tìm học viên hoặc nhóm...")}
                            className="w-full pl-9 p-2 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C5A059] shadow-sm"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredConversations.length === 0 ? (
                        <div className="p-6 text-center text-stone-400 text-xs italic">
                            {t("messages.noConversations", "Chưa có cuộc trò chuyện nào.")}
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const isSelected = selectedConvId === conv.id;
                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConvId(conv.id)}
                                    className={`p-3.5 cursor-pointer transition-colors border-b border-stone-100 flex gap-3 ${
                                        isSelected
                                            ? 'bg-white border-l-4 border-l-[#C5A059] shadow-sm'
                                            : 'hover:bg-white/60 border-l-4 border-l-transparent'
                                    }`}
                                >
                                    <div className="relative w-11 h-11 flex-shrink-0">
                                        <UserAvatar
                                            src={conv.isGroup ? conv.avatarUrl : conv.otherUser?.avatarUrl}
                                            name={conv.isGroup ? conv.name : conv.otherUser?.fullName}
                                            size={44}
                                        />
                                        {!conv.isGroup && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className="font-bold truncate text-xs text-stone-900">
                                                {conv.isGroup ? conv.name : (conv.otherUser?.fullName || t("common.user", "Học viên"))}
                                            </h4>
                                            <span className="text-[10px] text-stone-400 flex-shrink-0 font-mono">
                                                {conv.updatedAt ? format(new Date(conv.updatedAt), 'HH:mm') : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs truncate text-stone-500">
                                            {conv.lastMessage?.isMine ? `${t("messages.you", "Bạn")}: ` : ''}{conv.lastMessage?.content || t("messages.startConversation", "Bắt đầu cuộc trò chuyện")}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- RIGHT: CHAT WINDOW --- */}
            <div className={`flex-1 flex-col bg-white text-stone-900 ${isMobileListVisible ? 'hidden md:flex' : 'flex'}`}>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-stone-200 flex items-center justify-between px-5 bg-white flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsMobileListVisible(true)}
                                    className="md:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-full"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className="relative w-10 h-10">
                                    <UserAvatar
                                        src={selectedConversation.isGroup ? selectedConversation.avatarUrl : selectedConversation.otherUser?.avatarUrl}
                                        name={selectedConversation.isGroup ? selectedConversation.name : selectedConversation.otherUser?.fullName}
                                        size={40}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold leading-tight text-sm text-stone-900">
                                        {selectedConversation.isGroup ? selectedConversation.name : (selectedConversation.otherUser?.fullName || t("common.user", "Học viên"))}
                                    </h3>
                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        {selectedConversation.isGroup ? t("messages.groupChat", "Nhóm học tập") : t("messages.studentRole", "Học viên")}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[#C5A059]">
                                {selectedConversation.isGroup && (
                                    <button
                                        onClick={async () => {
                                            setLoadingSummary(true);
                                            try {
                                                const res = await fetch('/api/chat/group-summary', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ conversationId: selectedConvId, userId: currentUserId })
                                                });
                                                const data = await res.json();
                                                setSummaryData(data);
                                            } catch (e) {
                                                console.error(e);
                                            } finally {
                                                setLoadingSummary(false);
                                            }
                                        }}
                                        className="text-xs font-bold px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-[#C5A059] rounded-full flex items-center gap-1 transition-colors"
                                    >
                                        {loadingSummary ? <Loader2 size={14} className="animate-spin" /> : t("messages.summaryMissed", "Tóm tắt từ lần cuối online")}
                                    </button>
                                )}
                                <button className="p-2 hover:bg-stone-50 rounded-full transition-colors"><Phone size={18} /></button>
                                <button className="p-2 hover:bg-stone-50 rounded-full transition-colors"><Video size={18} /></button>
                                <button className="p-2 hover:bg-stone-50 rounded-full text-stone-400 transition-colors"><Info size={18} /></button>
                            </div>
                        </div>

                        {/* Summary Alert */}
                        {summaryData && (
                            <div className="mx-4 mt-4 p-4 rounded-xl relative border bg-amber-50 border-amber-200 text-amber-900">
                                <button onClick={() => setSummaryData(null)} className="absolute top-2 right-2 text-stone-400 hover:text-stone-600">✕</button>
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <CheckCheck size={16} /> Tóm tắt tin nhắn bị lỡ
                                </h4>
                                <p className="text-sm whitespace-pre-wrap">{summaryData.summary}</p>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/40"
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                        >
                            {loadingMore && (
                                <div className="flex items-center justify-center py-2 text-stone-400 text-xs gap-2">
                                    <Loader2 className="animate-spin" size={14} /> {t("messages.loadingMore", "Đang tải tin nhắn cũ...")}
                                </div>
                            )}
                            {hasMoreMessages && !loadingMore && (
                                <button
                                    onClick={handleLoadMore}
                                    className="w-full py-2 text-xs text-[#C5A059] font-bold hover:underline"
                                >
                                    {t("messages.loadMore", "Xem tin nhắn cũ hơn")}
                                </button>
                            )}

                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full text-stone-400 text-xs gap-2">
                                    <Loader2 className="animate-spin" /> {t("messages.loading", "Đang tải tin nhắn...")}
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUserId;
                                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
                                            {!isMe && (
                                                <div className="mr-2 flex-shrink-0 flex items-start mt-1">
                                                    <UserAvatar
                                                        src={msg.sender?.avatarUrl || selectedConversation?.otherUser?.avatarUrl}
                                                        name={msg.sender?.fullName || selectedConversation?.otherUser?.fullName}
                                                        size={32}
                                                    />
                                                </div>
                                            )}

                                            <div className={`max-w-[70%] break-words px-4 py-2.5 rounded-2xl text-sm shadow-sm
                                                ${isMe
                                                    ? 'bg-[#1a1a1a] text-[#C5A059] font-medium rounded-br-none'
                                                    : msg.isBotResponse
                                                        ? 'bg-blue-50 border border-blue-200 text-blue-900 rounded-bl-none'
                                                        : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'}
                                            `}>
                                                {!isMe && !msg.isBotResponse && (
                                                    <div className="font-bold text-[11px] text-[#C5A059] mb-1 flex items-center gap-1">
                                                        <span>{msg.sender?.fullName || selectedConversation?.otherUser?.fullName || t("common.user", "Học viên")}</span>
                                                    </div>
                                                )}
                                                {msg.isBotResponse && <div className="font-bold text-xs text-blue-600 mb-1 flex items-center gap-1"><Info size={12} /> AuraBot</div>}
                                                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-blue-200 text-xs">
                                                        <span className="font-semibold">Nguồn: </span>
                                                        {msg.sources.map((s: any, i: number) => (
                                                            <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-200 inline-block mr-1 mb-1">
                                                                {s.type === 'video' ? `🎥 ${s.title} [${Math.floor(s.startTime)}s]` : `💬 Q&A`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {isMe && (
                                                <div className="flex items-center ml-1.5 text-xs text-stone-400">
                                                    {msg.status === 'sending' && <Loader2 size={12} className="animate-spin" />}
                                                    {msg.status === 'sent' && <Check size={14} />}
                                                    {msg.status === 'delivered' && <CheckCheck size={14} />}
                                                    {msg.status === 'read' && <CheckCheck size={14} className="text-blue-500" />}
                                                    {!msg.status && !msg.id.startsWith('temp-') && <CheckCheck size={14} />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="px-4 py-2 flex items-center gap-2 bg-stone-50/50">
                                <UserAvatar
                                    src={selectedConversation?.otherUser?.avatarUrl}
                                    name={selectedConversation?.otherUser?.fullName}
                                    size={24}
                                />
                                <div className="bg-stone-100 rounded-full px-4 py-1.5 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <span className="text-xs text-stone-400">{t("messages.typing", "đang nhập...")}</span>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-stone-200">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <button type="button" className="p-2 text-[#C5A059] hover:bg-stone-50 rounded-full transition-colors">
                                    <MoreVertical size={20} />
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        if (e.target.value.trim()) {
                                            broadcastTyping();
                                        }
                                    }}
                                    placeholder={t("messages.typeMessage", "Trả lời học viên...")}
                                    className="flex-1 p-3 bg-stone-100 rounded-full border border-transparent focus:border-[#C5A059] focus:bg-white transition-all text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-[#1a1a1a] text-[#C5A059] font-bold rounded-full hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-transform active:scale-95 cursor-pointer"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-400 bg-white">
                        <div className="w-20 h-20 bg-stone-100 text-[#C5A059] rounded-full flex items-center justify-center mb-4 border border-stone-200 shadow-sm">
                            <MessageSquare size={36} />
                        </div>
                        <p className="font-serif text-xl font-bold text-stone-700">
                            {t("messages.selectConversation", "Chọn một cuộc trò chuyện")}
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                            {t("messages.startMessagingInstructor", "để trao đổi và hỗ trợ học viên trong các khóa học")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
