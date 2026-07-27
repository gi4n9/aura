'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { Send, Smile, Users, Loader2, ArrowDown } from 'lucide-react';
import Image from 'next/image';
import { getMessages, sendMessage, getMessageById } from '@/app/actions/chat';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';

export default function GroupChatBox({ groupId }: { groupId: string }) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [hasMoreOld, setHasMoreOld] = useState(true);
    const [oldCursor, setOldCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showNewMessageToast, setShowNewMessageToast] = useState(false);
    const [initialScrollDone, setInitialScrollDone] = useState(false);

    // Intersection Observer for scrolling UP to load older messages
    const { ref: topRef, inView: topInView } = useInView({
        threshold: 0,
        rootMargin: '100px 0px 0px 0px',
    });

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const lastLoadTimeRef = useRef<number>(0);

    // Initial Load & Realtime Subscription
    useEffect(() => {
        let channel: any;
        const supabase = createClient();

        const loadInitial = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            const result = await getMessages(groupId, { limit: 30, direction: 'older' });
            if (result.messages) {
                setMessages(result.messages);
                setOldCursor(result.nextCursor);
                setHasMoreOld(result.hasMore ?? false);
            }
            setLoading(false);
            scrollToBottom();
            setTimeout(() => setInitialScrollDone(true), 150);

            // Realtime subscription
            channel = supabase.channel(`room_${groupId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'DirectMessage',
                    filter: `conversationId=eq.${groupId}`
                }, async (payload) => {
                    const newMsgId = payload.new.id;
                    const senderId = payload.new.senderId;

                    if (user && senderId === user.id) return;

                    const fullMsg = await getMessageById(newMsgId);
                    if (fullMsg) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === fullMsg.id)) return prev;
                            return [...prev, fullMsg];
                        });

                        const container = messagesContainerRef.current;
                        if (container) {
                            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
                            if (isAtBottom) {
                                setTimeout(() => {
                                    container.scrollTop = container.scrollHeight;
                                }, 50);
                            } else {
                                setShowNewMessageToast(true);
                            }
                        }
                    }
                })
                .subscribe();
        };
        loadInitial();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [groupId]);

    // Load Older Messages
    const loadOlderMessages = useCallback(async () => {
        if (loadingMore || !hasMoreOld || !oldCursor) return;
        setLoadingMore(true);

        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadTimeRef.current;
        let dynamicLimit = 5;

        if (lastLoadTimeRef.current !== 0) {
            if (timeSinceLastLoad < 1000) {
                dynamicLimit = 30;
            } else if (timeSinceLastLoad < 2500) {
                dynamicLimit = 15;
            }
        }
        lastLoadTimeRef.current = now;

        const container = messagesContainerRef.current;
        const scrollHeightBefore = container?.scrollHeight || 0;

        const result = await getMessages(groupId, { cursor: oldCursor, limit: dynamicLimit, direction: 'older' });

        if (result.messages && result.messages.length > 0) {
            setMessages(prev => [...result.messages, ...prev]);
            setOldCursor(result.nextCursor);
            setHasMoreOld(result.hasMore ?? false);

            setTimeout(() => {
                if (container) {
                    const scrollHeightAfter = container.scrollHeight;
                    container.scrollTop = scrollHeightAfter - scrollHeightBefore;
                }
            }, 0);
        } else {
            setHasMoreOld(false);
        }

        setLoadingMore(false);
    }, [groupId, oldCursor, loadingMore, hasMoreOld]);

    useEffect(() => {
        if (topInView && !loading && initialScrollDone) {
            loadOlderMessages();
        }
    }, [topInView, loading, initialScrollDone, loadOlderMessages]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        const content = newMessage.trim();
        setNewMessage('');

        const tempId = `temp-${Date.now()}`;
        const tempMsg = {
            id: tempId,
            content: content,
            senderId: currentUserId,
            sender: { fullName: t("messages.you", "Tôi"), avatarUrl: '' },
            createdAt: new Date(),
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        const result = await sendMessage(groupId, content);
        if (result.success && result.message) {
            setMessages(prev => prev.map(m => m.id === tempId ? {
                ...result.message,
                sender: { fullName: t("messages.you", "Tôi"), avatarUrl: '' }
            } : m));
        } else {
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }

        setSending(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            if (isAtBottom && showNewMessageToast) {
                setShowNewMessageToast(false);
            }
        }
    };

    const scrollToBottomUI = () => {
        scrollToBottom();
        setShowNewMessageToast(false);
    };

    return (
        <div
            className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col relative transition-colors ${
                isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
            }`}
            style={{ height: '600px' }}
        >
            <div className={`p-4 border-b font-bold flex items-center justify-between ${
                isDark ? "border-white/10 text-white bg-white/[0.02]" : "border-stone-100 text-stone-800 bg-white"
            }`}>
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#C5A059]" /> {t("community.groupChatTitle", "Trò chuyện nhóm")}
                </div>
            </div>

            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto p-4 space-y-6 overscroll-y-contain ${
                    isDark ? "bg-black/30" : "bg-stone-50/50"
                }`}
            >
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                    </div>
                ) : (
                    <>
                        {hasMoreOld && (
                            <div ref={topRef} className="h-4 flex items-center justify-center shrink-0">
                                {loadingMore && <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />}
                            </div>
                        )}

                        {messages.length === 0 && !hasMoreOld && (
                            <div className="text-center text-stone-400 py-10 text-sm italic">
                                {t("community.noMessagesGroup", "Chưa có tin nhắn nào. Hãy là người đầu tiên bắt đầu cuộc trò chuyện!")}
                            </div>
                        )}

                        {messages.map((msg, index) => {
                            const isMine = msg.senderId === currentUserId;
                            const messageDate = new Date(msg.createdAt);
                            const timeStr = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            let showDateDivider = false;
                            let dateDividerStr = '';

                            if (index === 0) {
                                showDateDivider = true;
                            } else {
                                const prevMsgDate = new Date(messages[index - 1].createdAt);
                                if (prevMsgDate.toDateString() !== messageDate.toDateString()) {
                                    showDateDivider = true;
                                }
                            }

                            if (showDateDivider) {
                                const today = new Date();
                                const yesterday = new Date(today);
                                yesterday.setDate(yesterday.getDate() - 1);

                                if (messageDate.toDateString() === today.toDateString()) {
                                    dateDividerStr = t("messages.today", "Hôm nay");
                                } else if (messageDate.toDateString() === yesterday.toDateString()) {
                                    dateDividerStr = t("messages.yesterday", "Hôm qua");
                                } else {
                                    dateDividerStr = messageDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                                }
                            }

                            return (
                                <React.Fragment key={msg.id}>
                                    {showDateDivider && (
                                        <div className="flex justify-center my-6">
                                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                                isDark ? "bg-white/10 text-stone-400" : "bg-stone-200/50 text-stone-500"
                                            }`}>
                                                {dateDividerStr}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group ${!hasMoreOld && index === 0 ? 'mt-auto' : ''}`}>
                                        {!isMine && (
                                            <div className="w-8 h-8 mr-3 flex-shrink-0">
                                                <Image
                                                    src={msg.sender?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender?.fullName || 'User'}`}
                                                    alt={msg.sender?.fullName || 'User'}
                                                    width={32} height={32}
                                                    className={`rounded-full object-cover w-full h-full border ${
                                                        isDark ? "bg-stone-800 border-white/10" : "bg-white border-stone-200"
                                                    }`}
                                                />
                                            </div>
                                        )}
                                        <div className={`max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                            {!isMine && (
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className={`text-xs font-bold ${isDark ? "text-stone-300" : "text-stone-700"}`}>
                                                        {msg.sender?.fullName || t("common.user", "Người dùng ẩn danh")}
                                                    </span>
                                                    <span className="text-[10px] text-stone-400">{timeStr}</span>
                                                </div>
                                            )}
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words ${
                                                isMine
                                                    ? 'bg-[#1a1a1a] text-[#C5A059] font-medium rounded-tr-none border border-[#C5A059]/20'
                                                    : isDark
                                                        ? 'bg-white/10 border border-white/10 text-white rounded-tl-none'
                                                        : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            {isMine && (
                                                <span className="text-[10px] text-stone-400 mt-1">{timeStr}</span>
                                            )}
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </>
                )}
            </div>

            {showNewMessageToast && (
                <button
                    onClick={scrollToBottomUI}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#C5A059] text-white px-4 py-1.5 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 hover:bg-[#b08d4b] transition-all animate-bounce z-10"
                >
                    <ArrowDown size={14} /> {t("messages.newMessagesAlert", "Có tin nhắn mới")}
                </button>
            )}

            <div className={`p-4 border-t ${isDark ? "bg-[#0e0e0e] border-white/10" : "bg-white border-stone-100"}`}>
                <div className={`flex items-center gap-2 rounded-xl p-1 border transition-all focus-within:ring-2 focus-within:ring-[#C5A059] ${
                    isDark ? "bg-white/5 border-white/10" : "bg-stone-100 border-stone-200"
                }`}>
                    <input
                        type="text"
                        placeholder={t("messages.typeMessage", "Nhập tin nhắn...")}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={loading}
                        className={`flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 py-2 outline-none disabled:opacity-50 font-medium ${
                            isDark ? "text-white placeholder-stone-400" : "text-black placeholder-stone-400"
                        }`}
                    />
                    <button className="p-2 text-stone-400 hover:text-stone-300 transition-colors">
                        <Smile size={20} />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending || loading}
                        className={`p-2 rounded-lg transition-colors ${
                            newMessage.trim() && !sending
                                ? 'bg-[#C5A059] text-white hover:bg-[#b08d4b]'
                                : isDark ? 'bg-white/10 text-stone-500' : 'bg-stone-200 text-stone-400'
                        }`}
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
