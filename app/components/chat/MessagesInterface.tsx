"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getMessages, sendMessage } from "@/app/actions/chat";
import { Search, Send, MoreVertical, Phone, Video, Info, ArrowLeft, Loader2, Check, CheckCheck } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Types
type ConversationInfo = {
    id: string;
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

    // Default styling if no className provided
    const rootClassName = className ?? "flex h-[calc(100vh-80px)] bg-white overflow-hidden rounded-2xl shadow-sm border border-stone-200 mt-4 mx-4 mb-4";

    // State
    const [conversations, setConversations] = useState<ConversationInfo[]>(initialConversations);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
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

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        const handleNewMessage = (payload: any) => {
            console.log("🔔 Realtime message received:", payload);
            const newMsg = payload.new as any;

            // 1. UPDATE MESSAGES WINDOW (nếu đang mở hội thoại này)
            if (selectedConvIdRef.current && newMsg.conversationId === selectedConvIdRef.current) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;

                    const isMe = newMsg.senderId === currentUserIdRef.current;
                    const senderInfo = isMe
                        ? { id: currentUserIdRef.current, fullName: "Bạn", avatarUrl: null }
                        : {
                            id: selectedConversationRef.current?.otherUser?.id || "",
                            fullName: selectedConversationRef.current?.otherUser?.fullName || "Người dùng",
                            avatarUrl: selectedConversationRef.current?.otherUser?.avatarUrl || null
                        };

                    return [...prev, {
                        id: newMsg.id,
                        content: newMsg.content,
                        senderId: newMsg.senderId,
                        createdAt: new Date(newMsg.createdAt),
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
            const result = await getMessages(selectedConvId);
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
                // Also filter out temp IDs
                const localIds = new Set(prev.filter(m => !m.id.startsWith('temp-')).map(m => m.id));

                const newMsgs = (serverMsgs as Message[]).filter(m => !existingIds.has(m.id) && !localIds.has(m.id));

                if (newMsgs.length > 0) {
                    console.log("🔄 Polling found new messages:", newMsgs.length);
                    return [...prev, ...newMsgs];
                }
                return prev;
            });
        }, 500); // Poll every 500ms for near-realtime experience

        return () => clearInterval(pollInterval);
    }, [selectedConvId]);

    // Load older messages when scrolling to top
    const handleLoadMore = async () => {
        if (!selectedConvId || !nextCursor || loadingMore) return;

        setLoadingMore(true);
        const result = await getMessages(selectedConvId, {
            cursor: nextCursor,
            direction: 'older'
        });

        const olderMsgs = Array.isArray(result.messages) ? result.messages : [];
        setMessages(prev => [...(olderMsgs as Message[]), ...prev]);
        setNextCursor(result.nextCursor ?? null);
        setHasMoreMessages(result.hasMore || false);
        setLoadingMore(false);
    };

    // Detect scroll to top to load more
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop < 100 && hasMoreMessages && !loadingMore) {
            handleLoadMore();
        }
    };


    // Handlers
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !selectedConvId) return;

        const content = newMessage;
        setNewMessage(""); // Clear input immediately

        // Stop typing indicator when sending
        if (typingTimeout) clearTimeout(typingTimeout);
        supabase.channel(`typing-${selectedConvId}`).send({
            type: 'broadcast',
            event: 'stop-typing',
            payload: { userId: currentUserId }
        });

        // Generate temporary ID for optimistic UI
        const tempId = `temp-${Date.now()}`;

        // OPTIMISTIC: Add message to UI immediately with 'sending' status
        const optimisticMessage: Message = {
            id: tempId,
            content: content,
            senderId: currentUserId,
            createdAt: new Date(),
            status: 'sending', // Show as sending
            sender: {
                id: currentUserId,
                fullName: "Bạn",
                avatarUrl: null
            }
        };

        setMessages(prev => [...prev, optimisticMessage]);

        // Update conversation list immediately
        setConversations(prev => {
            const idx = prev.findIndex(c => c.id === selectedConvId);
            if (idx === -1) return prev;

            const updated = { ...prev[idx] };
            updated.lastMessage = {
                content: content,
                createdAt: new Date(),
                isMine: true
            };
            updated.updatedAt = new Date();

            const newList = [...prev];
            newList.splice(idx, 1);
            return [updated, ...newList];
        });

        // Send to server in background
        const res = await sendMessage(selectedConvId, content) as any;

        if (res.error) {
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(content); // Restore input
            alert("Gửi tin nhắn thất bại: " + res.error);
        } else if (res.success && res.message) {
            // Update: Replace temp ID with real ID and change status to 'sent'
            setMessages(prev => prev.map(m =>
                m.id === tempId
                    ? {
                        ...m,
                        id: res.message.id,
                        createdAt: new Date(res.message.createdAt),
                        status: 'sent' as MessageStatus
                    }
                    : m
            ));
        }
    };

    return (
        <div className={rootClassName}>

            {/* --- LEFT: CONVERSATION LIST --- */}
            <div className={`w-full md:w-80 border-r border-stone-200 flex flex-col bg-[#F9F8F4] 
                ${!isMobileListVisible ? 'hidden md:flex' : 'flex'}`}>

                {/* Header */}
                <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                    <h2 className="font-serif font-bold text-xl text-stone-800">Tin nhắn</h2>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-full pl-9 p-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#C5A059]"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-stone-400 text-sm italic">
                            Chưa có cuộc trò chuyện nào.
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedConvId(conv.id)}
                                className={`p-4 hover:bg-white cursor-pointer transition-colors border-b border-stone-100 flex gap-3
                                    ${selectedConvId === conv.id ? 'bg-white border-l-4 border-l-[#C5A059]' : 'border-l-4 border-l-transparent'}
                                `}
                            >
                                {/* Avatar */}
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    <Image
                                        src={conv.otherUser?.avatarUrl || "https://placehold.co/100x100?text=U"}
                                        alt="Avatar"
                                        fill
                                        className="rounded-full object-cover border border-stone-200"
                                    />
                                    {/* Online indicator (Future) */}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="font-bold text-stone-800 truncate text-sm">{conv.otherUser?.fullName || "Người dùng"}</h4>
                                        <span className="text-[10px] text-stone-400 flex-shrink-0">
                                            {conv.updatedAt ? format(new Date(conv.updatedAt), 'HH:mm') : ''}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${!conv.lastMessage?.isMine && false ? 'font-bold text-stone-800' : 'text-stone-500'}`}>
                                        {conv.lastMessage?.isMine ? 'Bạn: ' : ''}{conv.lastMessage?.content || "Bắt đầu cuộc trò chuyện"}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- RIGHT: CHAT WINDOW --- */}
            <div className={`flex-1 flex-col bg-white ${isMobileListVisible ? 'hidden md:flex' : 'flex'}`}>

                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 border-b border-stone-200 flex items-center justify-between px-4 bg-white flex-shrink-0">
                            <div className="flex items-center gap-3">
                                {/* Back Button (Mobile) */}
                                <button
                                    onClick={() => setIsMobileListVisible(true)}
                                    className="md:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-full"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className="relative w-10 h-10">
                                    <Image
                                        src={selectedConversation.otherUser?.avatarUrl || "https://placehold.co/100x100?text=U"}
                                        alt="Avatar"
                                        fill
                                        className="rounded-full object-cover"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800 leading-tight">
                                        {selectedConversation.otherUser?.fullName || "Người dùng"}
                                    </h3>
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                        Active now
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[#C5A059]">
                                <button className="p-2 hover:bg-stone-50 rounded-full"><Phone size={20} /></button>
                                <button className="p-2 hover:bg-stone-50 rounded-full"><Video size={20} /></button>
                                <button className="p-2 hover:bg-stone-50 rounded-full text-stone-400"><Info size={20} /></button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/30"
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                        >
                            {/* Load More Indicator */}
                            {loadingMore && (
                                <div className="flex items-center justify-center py-2 text-stone-400 text-sm gap-2">
                                    <Loader2 className="animate-spin" size={16} /> Đang tải tin nhắn cũ...
                                </div>
                            )}
                            {hasMoreMessages && !loadingMore && (
                                <button
                                    onClick={handleLoadMore}
                                    className="w-full py-2 text-sm text-[#C5A059] hover:underline"
                                >
                                    Xem tin nhắn cũ hơn
                                </button>
                            )}

                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full text-stone-400 gap-2">
                                    <Loader2 className="animate-spin" /> Đang tải tin nhắn...
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUserId;
                                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
                                            {/* Avatar Left */}
                                            {!isMe && (
                                                <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-end">
                                                    {showAvatar ? (
                                                        <div className="relative w-8 h-8">
                                                            <Image
                                                                src={msg.sender.avatarUrl || "https://placehold.co/100x100?text=U"}
                                                                alt="avt"
                                                                fill
                                                                className="rounded-full object-cover"
                                                            />
                                                        </div>
                                                    ) : <div className="w-8" />}
                                                </div>
                                            )}

                                            {/* Bubble */}
                                            <div className={`max-w-[70%] break-words px-4 py-2 rounded-2xl text-sm shadow-sm
                                                ${isMe
                                                    ? 'bg-[#1a1a1a] text-white rounded-br-none'
                                                    : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'}
                                            `}>
                                                {msg.content}
                                            </div>

                                            {/* Message Status (only for my messages) */}
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
                                                    {/* Default: no status = delivered */}
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
                                <div className="relative w-6 h-6">
                                    <Image
                                        src={selectedConversation?.otherUser?.avatarUrl || "https://placehold.co/100x100?text=U"}
                                        alt="typing"
                                        fill
                                        className="rounded-full object-cover"
                                    />
                                </div>
                                <div className="bg-stone-100 rounded-full px-4 py-2 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <span className="text-xs text-stone-400">đang nhập...</span>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-stone-200">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <button type="button" className="p-2 text-[#C5A059] hover:bg-stone-50 rounded-full">
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
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 p-3 bg-stone-100 rounded-full border-none focus:ring-2 focus:ring-[#C5A059] focus:bg-white transition-all text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-[#C5A059] text-white rounded-full hover:bg-[#b08d4b] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-transform active:scale-95"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    // Empty State
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-300">
                        <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                            <Send size={40} className="ml-1" />
                        </div>
                        <p className="font-serif text-xl font-bold text-stone-400">Chọn một cuộc trò chuyện</p>
                        <p className="text-sm">để bắt đầu nhắn tin với giảng viên hoặc bạn học</p>
                    </div>
                )}

            </div>

        </div>
    );
}
