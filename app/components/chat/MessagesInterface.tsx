"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getMessages, getMessageById } from "@/app/actions/chat";
import { sendMessageEdge, sendMessageFallback } from "@/lib/edge-functions";
import { Search, Send, MoreVertical, Phone, Video, Info, ArrowLeft, Loader2, Check, CheckCheck } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { useTheme } from "@/lib/theme/ThemeContext";
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
    status?: MessageStatus; // For outgoing messages
    isBotResponse?: boolean;
    sources?: any[];
    sender: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
};

export default function MessagesInterface({
    initialConversations,
    currentUserId,
    className
}: {
    initialConversations: ConversationInfo[];
    currentUserId: string;
    className?: string;
}) {
    const supabase = createClient();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    // Default styling if no className provided
    const defaultClass = `flex h-[calc(100vh-140px)] min-h-[600px] overflow-hidden rounded-2xl shadow-sm border transition-colors ${
        isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
    } mt-4 mx-4 mb-4`;
    const rootClassName = className ?? defaultClass;

    // State
    const [conversations, setConversations] = useState<ConversationInfo[]>(initialConversations);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [isMobileListVisible, setIsMobileListVisible] = useState(true);
    const [isTyping, setIsTyping] = useState(false); // Other user is typing
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

    // Scroll to bottom of the messages container (without scrolling the main page window)
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

    // Use refs to store current values for realtime callback (to prevent re-subscribe)
    const selectedConvIdRef = useRef(selectedConvId);
    const selectedConversationRef = useRef(selectedConversation);
    const currentUserIdRef = useRef(currentUserId);

    useEffect(() => {
        selectedConvIdRef.current = selectedConvId;
        selectedConversationRef.current = selectedConversation;
        currentUserIdRef.current = currentUserId;
    }, [selectedConvId, selectedConversation, currentUserId]);

    // REALTIME: Listen for new messages - Subscribe ONCE on mount
    useEffect(() => {
        const handleNewMessage = async (payload: any) => {
            console.log("🔔 Realtime message received:", payload);
            const newMsg = payload.new as any;

            // Fetch decrypted message from server
            const fullMsg = await getMessageById(newMsg.id);
            const displayContent = fullMsg ? fullMsg.content : newMsg.content;

            // 1. UPDATE MESSAGES WINDOW (nếu đang mở hội thoại này)
            if (selectedConvIdRef.current && newMsg.conversationId === selectedConvIdRef.current) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;

                    const isMe = newMsg.senderId === currentUserIdRef.current;
                    const senderInfo = fullMsg?.sender || (isMe
                        ? { id: currentUserIdRef.current, fullName: t("messages.you", "Bạn"), avatarUrl: null }
                        : {
                            id: selectedConversationRef.current?.otherUser?.id || "",
                            fullName: selectedConversationRef.current?.otherUser?.fullName || t("common.user", "Người dùng"),
                            avatarUrl: selectedConversationRef.current?.otherUser?.avatarUrl || null
                        });

                    return [...prev, {
                        id: newMsg.id,
                        content: displayContent,
                        senderId: newMsg.senderId,
                        createdAt: new Date(newMsg.createdAt),
                        isBotResponse: newMsg.isBotResponse,
                        sources: newMsg.sources,
                        sender: senderInfo
                    }];
                });
            }

            // 2. UPDATE CONVERSATION LIST (Reorder & Update Last Message)
            setConversations(prev => {
                const convIndex = prev.findIndex(c => c.id === newMsg.conversationId);
                if (convIndex === -1) return prev;

                const updatedConv = { ...prev[convIndex] };
                updatedConv.lastMessage = {
                    content: displayContent,
                    createdAt: new Date(newMsg.createdAt),
                    isMine: newMsg.senderId === currentUserIdRef.current
                };
                updatedConv.updatedAt = new Date(newMsg.createdAt);

                const newList = [...prev];
                newList.splice(convIndex, 1);
                return [updatedConv, ...newList];
            });
        };

        // Subscribe to both possible table names - ONLY ONCE
        const channel = supabase
            .channel('realtime-chat-v3')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'DirectMessage' }, handleNewMessage)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_message' }, handleNewMessage)
            .subscribe((status) => {
                console.log("📡 Realtime subscription status:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps = subscribe only once on mount

    // TYPING INDICATOR: Listen for typing events via Broadcast
    useEffect(() => {
        if (!selectedConvId) return;

        const typingChannel = supabase
            .channel(`typing-${selectedConvId}`)
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.userId !== currentUserId) {
                    setIsTyping(true);
                    // Auto-hide after 3 seconds
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConvId, currentUserId]); // supabase is now singleton, no need in deps

    // Broadcast typing status
    const broadcastTyping = useCallback(() => {
        if (!selectedConvId) return;

        supabase.channel(`typing-${selectedConvId}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: currentUserId }
        });

        // Clear previous timeout
        if (typingTimeout) clearTimeout(typingTimeout);

        // Set timeout to broadcast stop-typing
        const timeout = setTimeout(() => {
            supabase.channel(`typing-${selectedConvId}`).send({
                type: 'broadcast',
                event: 'stop-typing',
                payload: { userId: currentUserId }
            });
        }, 2000);

        setTypingTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedConvId, currentUserId, typingTimeout]); // supabase is singleton

    // State for cursor-based pagination
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Fetch messages when selecting conversation
    useEffect(() => {
        if (!selectedConvId) return;

        const loadMessages = async () => {
            setLoadingMessages(true);
            const result = await getMessages(selectedConvId, { limit: 20 });
            // Ensure messages is always an array
            const msgs = Array.isArray(result.messages) ? result.messages : [];
            setMessages(msgs as Message[]);
            setNextCursor(result.nextCursor ?? null);
            setHasMoreMessages(result.hasMore || false);
            setLoadingMessages(false);
            setIsMobileListVisible(false);

            // Scroll to bottom after initial load
            setTimeout(() => scrollToBottom(), 100);
        };

        loadMessages();

        // Polling fallback: In case Realtime doesn't work
        const pollInterval = setInterval(async () => {
            if (document.hidden) return; // Skip when tab is not visible

            const result = await getMessages(selectedConvId);
            const serverMsgs = Array.isArray(result.messages) ? result.messages : [];

            setMessages(prev => {
                // Only add messages that don't exist locally
                const existingIds = new Set(prev.map(m => m.id));
                const newMsgs = serverMsgs.filter((m: any) => !existingIds.has(m.id));

                if (newMsgs.length === 0) return prev;
                return [...prev, ...newMsgs as Message[]];
            });
        }, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(pollInterval);
        };
    }, [selectedConvId]);

    // Handle Infinite Scroll / Load More
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

        // Maintain scroll position after prepending messages
        setTimeout(() => {
            if (container) {
                container.scrollTop = container.scrollHeight - oldScrollHeight;
            }
        }, 50);
    };

    // Scroll listener for auto-trigger load more
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop } = e.currentTarget;
        if (scrollTop === 0 && hasMoreMessages && !loadingMore) {
            handleLoadMore();
        }
    };

    // Send message with optimistic update & retry logic
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvId) return;

        const content = newMessage.trim();
        setNewMessage("");

        // Optimistic message
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            content,
            senderId: currentUserId,
            createdAt: new Date(),
            status: 'sending',
            sender: {
                id: currentUserId,
                fullName: t("messages.you", "Bạn"),
                avatarUrl: null
            }
        };

        // 1. Instantly add to UI
        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        // 2. Optimistic update conversation list
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

        // Retry helper
        const sendWithRetry = async (retries = 3): Promise<void> => {
            try {
                let sentMsg: any;

                try {
                    const res = await sendMessageEdge({ conversationId: selectedConvId, content, senderId: currentUserId });
                    sentMsg = res.message || res;
                } catch {
                    sentMsg = await sendMessageFallback(selectedConvId, content, currentUserId);
                }

                // Replace optimistic message with confirmed message
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
                    await new Promise(r => setTimeout(r, 1000)); // Wait 1s
                    return sendWithRetry(retries - 1);
                }

                setMessages(prev => prev.map(m =>
                    m.id === tempId
                        ? { ...m, status: 'sending' as MessageStatus }
                        : m
                ));
                console.error('[Chat] Message send failed after retries:', error);
            }
        };

        sendWithRetry();
    };

    return (
        <div className={rootClassName}>

            {/* --- LEFT: CONVERSATION LIST --- */}
            <div className={`w-full md:w-80 border-r flex flex-col transition-colors ${
                isDark ? "bg-white/5 border-white/10 text-white" : "bg-[#F9F8F4] border-stone-200 text-stone-900"
            } ${!isMobileListVisible ? 'hidden md:flex' : 'flex'}`}>

                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between transition-colors ${
                    isDark ? "border-white/10" : "border-stone-200"
                }`}>
                    <h2 className={`font-serif font-bold text-xl ${isDark ? "text-white" : "text-stone-800"}`}>
                        {t("messages.title", "Tin nhắn")}
                    </h2>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-stone-500" : "text-stone-400"}`} size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t("messages.search", "Tìm kiếm cuộc trò chuyện...")}
                            className={`w-full pl-9 p-2 rounded-lg border text-sm focus:outline-none focus:border-[#C5A059] transition-colors ${
                                isDark
                                    ? "bg-white/5 border-white/10 text-white placeholder-stone-500"
                                    : "bg-white border-stone-200 text-stone-900 placeholder-stone-400"
                            }`}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredConversations.length === 0 ? (
                        <div className={`p-4 text-center text-sm italic ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                            {t("messages.noConversations", "Chưa có cuộc trò chuyện nào.")}
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedConvId(conv.id)}
                                className={`p-4 cursor-pointer transition-colors border-b flex gap-3 ${
                                    isDark ? 'border-white/5' : 'border-stone-100'
                                } ${
                                    selectedConvId === conv.id
                                        ? isDark
                                            ? 'bg-white/10 border-l-4 border-l-[#C5A059]'
                                            : 'bg-white border-l-4 border-l-[#C5A059]'
                                        : isDark
                                            ? 'hover:bg-white/5 border-l-4 border-l-transparent'
                                            : 'hover:bg-white border-l-4 border-l-transparent'
                                }`}
                            >
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    <UserAvatar
                                        src={conv.isGroup ? conv.avatarUrl : conv.otherUser?.avatarUrl}
                                        name={conv.isGroup ? conv.name : conv.otherUser?.fullName}
                                        size={48}
                                    />
                                    {!conv.isGroup && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className={`font-bold truncate text-sm ${isDark ? "text-white" : "text-stone-800"}`}>
                                            {conv.isGroup ? conv.name : (conv.otherUser?.fullName || t("common.user", "Người dùng"))}
                                        </h4>
                                        <span className={`text-[10px] flex-shrink-0 ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                                            {conv.updatedAt ? format(new Date(conv.updatedAt), 'HH:mm') : ''}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                                        {conv.lastMessage?.isMine ? `${t("messages.you", "Bạn")}: ` : ''}{conv.lastMessage?.content || t("messages.startConversation", "Bắt đầu cuộc trò chuyện")}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- RIGHT: CHAT WINDOW --- */}
            <div className={`flex-1 flex-col transition-colors ${
                isDark ? "bg-[#0e0e0e] text-white" : "bg-white text-stone-900"
            } ${isMobileListVisible ? 'hidden md:flex' : 'flex'}`}>

                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className={`h-16 border-b flex items-center justify-between px-4 flex-shrink-0 transition-colors ${
                            isDark ? "bg-[#0e0e0e] border-white/10" : "bg-white border-stone-200"
                        }`}>
                            <div className="flex items-center gap-3">
                                {/* Back Button (Mobile) */}
                                <button
                                    onClick={() => setIsMobileListVisible(true)}
                                    className={`md:hidden p-2 rounded-full transition-colors ${
                                        isDark ? "text-stone-300 hover:bg-white/10" : "text-stone-500 hover:bg-stone-100"
                                    }`}
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
                                    <h3 className={`font-bold leading-tight ${isDark ? "text-white" : "text-stone-800"}`}>
                                        {selectedConversation.isGroup ? selectedConversation.name : (selectedConversation.otherUser?.fullName || t("common.user", "Người dùng"))}
                                    </h3>
                                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                                        {selectedConversation.isGroup ? t("messages.groupChat", "Chat nhóm") : t("messages.activeNow", "Đang hoạt động")}
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
                                        className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors ${
                                            isDark ? "bg-white/10 hover:bg-white/20 text-[#C5A059]" : "bg-stone-100 hover:bg-stone-200 text-[#C5A059]"
                                        }`}
                                    >
                                        {loadingSummary ? <Loader2 size={14} className="animate-spin" /> : t("messages.summaryMissed", "Tóm tắt tin nhắn vắng mặt")}
                                    </button>
                                )}
                                <button className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-stone-100"}`}><Phone size={20} /></button>
                                <button className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-stone-100"}`}><Video size={20} /></button>
                                <button className={`p-2 rounded-full transition-colors ${isDark ? "text-stone-500 hover:bg-white/10" : "text-stone-400 hover:bg-stone-100"}`}><Info size={20} /></button>
                            </div>
                        </div>

                        {/* Summary Alert */}
                        {summaryData && (
                            <div className={`mx-4 mt-4 p-4 rounded-xl relative border transition-colors ${
                                isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-200" : "bg-yellow-50 border-yellow-200 text-yellow-900"
                            }`}>
                                <button onClick={() => setSummaryData(null)} className="absolute top-2 right-2 text-stone-400 hover:text-stone-600">✕</button>
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <CheckCheck size={16} /> Tóm tắt tin nhắn bị lỡ
                                </h4>
                                <p className="text-sm whitespace-pre-wrap">{summaryData.summary}</p>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div
                            className={`flex-1 overflow-y-auto p-4 space-y-4 transition-colors ${
                                isDark ? "bg-black/30" : "bg-stone-50/30"
                            }`}
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                        >
                            {/* Load More Indicator */}
                            {loadingMore && (
                                <div className={`flex items-center justify-center py-2 text-sm gap-2 ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                                    <Loader2 className="animate-spin" size={16} /> {t("messages.loadingMore", "Đang tải tin nhắn cũ...")}
                                </div>
                            )}
                            {hasMoreMessages && !loadingMore && (
                                <button
                                    onClick={handleLoadMore}
                                    className="w-full py-2 text-sm text-[#C5A059] hover:underline"
                                >
                                    {t("messages.loadMore", "Xem tin nhắn cũ hơn")}
                                </button>
                            )}

                            {loadingMessages ? (
                                <div className={`flex items-center justify-center h-full gap-2 ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                                    <Loader2 className="animate-spin" /> {t("messages.loading", "Đang tải tin nhắn...")}
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUserId;
                                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
                                            {/* Avatar Left */}
                                            {!isMe && (
                                                <div className="mr-2 flex-shrink-0 flex items-start mt-1">
                                                    <UserAvatar
                                                        src={msg.sender?.avatarUrl || selectedConversation?.otherUser?.avatarUrl}
                                                        name={msg.sender?.fullName || selectedConversation?.otherUser?.fullName}
                                                        size={32}
                                                    />
                                                </div>
                                            )}

                                            {/* Bubble */}
                                            <div className={`max-w-[70%] break-words px-4 py-2.5 rounded-2xl text-sm shadow-sm
                                                ${isMe
                                                    ? 'bg-[#C5A059] text-[#080808] font-medium rounded-br-none'
                                                    : msg.isBotResponse
                                                        ? isDark
                                                            ? 'bg-blue-500/15 border border-blue-500/30 text-blue-200 rounded-bl-none'
                                                            : 'bg-blue-50 border border-blue-200 text-blue-900 rounded-bl-none'
                                                        : isDark
                                                            ? 'bg-white/10 border border-white/10 text-stone-100 rounded-bl-none'
                                                            : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'}
                                            `}>
                                                {msg.isBotResponse && <div className="font-bold text-xs text-blue-400 mb-1 flex items-center gap-1"><Info size={12} /> AuraBot</div>}
                                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                                {msg.sources && msg.sources.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-blue-400/30 text-xs">
                                                        <span className="font-semibold">Nguồn: </span>
                                                        {msg.sources.map((s: any, i: number) => (
                                                            <span key={i} className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-500/30 inline-block mr-1 mb-1">
                                                                {s.type === 'video' ? `🎥 ${s.title} [${Math.floor(s.startTime)}s]` : `💬 Q&A`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Message Status */}
                                            {isMe && (
                                                <div className="flex items-center ml-1 text-xs text-stone-400">
                                                    {msg.status === 'sending' && (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    )}
                                                    {msg.status === 'sent' && (
                                                        <Check size={14} />
                                                    )}
                                                    {msg.status === 'delivered' && (
                                                        <CheckCheck size={14} />
                                                    )}
                                                    {msg.status === 'read' && (
                                                        <CheckCheck size={14} className="text-blue-500" />
                                                    )}
                                                    {!msg.status && !msg.id.startsWith('temp-') && (
                                                        <CheckCheck size={14} />
                                                    )}
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
                            <div className="px-4 py-2 flex items-center gap-2">
                                <UserAvatar
                                    src={selectedConversation?.otherUser?.avatarUrl}
                                    name={selectedConversation?.otherUser?.fullName}
                                    size={24}
                                />
                                <div className={`rounded-full px-4 py-2 flex items-center gap-1 ${isDark ? "bg-white/10" : "bg-stone-100"}`}>
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <span className={`text-xs ${isDark ? "text-stone-400" : "text-stone-500"}`}>{t("messages.typing", "đang nhập...")}</span>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className={`p-4 border-t transition-colors ${
                            isDark ? "bg-[#0e0e0e] border-white/10" : "bg-white border-stone-200"
                        }`}>
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <button type="button" className={`p-2 text-[#C5A059] rounded-full transition-colors ${isDark ? "hover:bg-white/10" : "hover:bg-stone-50"}`}>
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
                                    placeholder={t("messages.typeMessage", "Nhập tin nhắn...")}
                                    className={`flex-1 p-3 rounded-full transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C5A059] text-black ${
                                        isDark
                                            ? "bg-white/90 border border-white/20 text-black placeholder-stone-500 focus:bg-white"
                                            : "bg-stone-100 border-none text-black placeholder-stone-400 focus:bg-white"
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-[#C5A059] text-[#080808] font-bold rounded-full hover:bg-[#e9c176] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-transform active:scale-95 cursor-pointer"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    // Empty State
                    <div className={`flex-1 flex flex-col items-center justify-center ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                            isDark ? "bg-white/5 text-[#C5A059]" : "bg-stone-100 text-[#C5A059]"
                        }`}>
                            <Send size={40} className="ml-1" />
                        </div>
                        <p className={`font-serif text-xl font-bold ${isDark ? "text-stone-300" : "text-stone-600"}`}>
                            {t("messages.selectConversation", "Chọn một cuộc trò chuyện")}
                        </p>
                        <p className="text-sm mt-1">
                            {t("messages.startMessaging", "để bắt đầu nhắn tin với giảng viên hoặc bạn học")}
                        </p>
                    </div>
                )}

            </div>

        </div>
    );
}
