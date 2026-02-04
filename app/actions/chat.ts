"use server";

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách hội thoại của User hiện tại
export async function getConversations() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const conversations = await db.conversation.findMany({
        where: {
            participants: {
                some: {
                    userId: user.id
                }
            }
        },
        include: {
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            avatarUrl: true,
                            email: true
                        }
                    }
                }
            },
            messages: {
                orderBy: {
                    createdAt: 'desc'
                },
                take: 1
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });

    // Format lại dữ liệu cho dễ dùng ở Client
    return conversations.map(conv => {
        const otherParticipant = conv.participants.find(p => p.userId !== user.id)?.user;
        const lastMessage = conv.messages[0];
        
        return {
            id: conv.id,
            otherUser: otherParticipant, // Người mình đang chat cùng
            lastMessage: lastMessage ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                isMine: lastMessage.senderId === user.id
            } : null,
            updatedAt: conv.updatedAt
        };
    });
}

// 2. Lấy chi tiết tin nhắn của một hội thoại (Cursor-based Pagination)
export async function getMessages(
    conversationId: string, 
    options?: { 
        cursor?: string;  // ID của tin nhắn cuối cùng đã load (để load cũ hơn)
        limit?: number;
        direction?: 'older' | 'newer';  // Load tin cũ hơn hoặc mới hơn cursor
    }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { messages: [], nextCursor: null };

    // Kiểm tra xem user có trong hội thoại này không (bảo mật)
    const isParticipant = await db.conversationParticipant.findUnique({
        where: {
            conversationId_userId: {
                conversationId: conversationId,
                userId: user.id
            }
        }
    });

    if (!isParticipant) return { messages: [], nextCursor: null };

    const limit = options?.limit || 30;
    const cursor = options?.cursor;
    const direction = options?.direction || 'older';

    // Build query conditions
    let whereCondition: any = { conversationId };
    
    if (cursor) {
        // Get the cursor message to find its createdAt
        const cursorMessage = await db.directMessage.findUnique({
            where: { id: cursor },
            select: { createdAt: true }
        });
        
        if (cursorMessage) {
            whereCondition.createdAt = direction === 'older' 
                ? { lt: cursorMessage.createdAt }
                : { gt: cursorMessage.createdAt };
        }
    }

    const messages = await db.directMessage.findMany({
        where: whereCondition,
        include: {
            sender: {
                select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                }
            }
        },
        orderBy: {
            createdAt: direction === 'older' ? 'desc' : 'asc'
        },
        take: limit + 1  // Take 1 extra to check if there are more
    });

    // Check if there are more messages
    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;
    
    // Reverse if we loaded older messages (so newest is last)
    if (direction === 'older') {
        resultMessages.reverse();
    }

    // Next cursor is the ID of the first message (oldest) for loading more old messages
    const nextCursor = hasMore ? resultMessages[0]?.id : null;

    return { 
        messages: resultMessages, 
        nextCursor,
        hasMore
    };
}

// 3. Gửi tin nhắn - Optimized (userId passed from client to skip auth)
export async function sendMessage(conversationId: string, content: string, userId?: string) {
    let senderId = userId;
    
    // Only check auth if userId not provided
    if (!senderId) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };
        senderId = user.id;
    }

    try {
        const message = await db.directMessage.create({
            data: {
                content: content,
                conversationId: conversationId,
                senderId: senderId,
            }
        });

        // Update conversation in background (non-blocking)
        db.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        }).catch(() => {});
        
        return { success: true, message: message };
    } catch (error) {
        console.error("Send Message Error:", error);
        return { error: "Failed to send message" };
    }
}

// 4. Tạo hoặc lấy hội thoại với một User ID (dùng khi click "Nhắn tin" từ profile người khác)
export async function getOrCreateConversation(targetUserId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    if (user.id === targetUserId) return { error: "Cannot chat with yourself" };

    // Tìm xem đã có hội thoại chung chưa
    // Logic query: Tìm conversation mà có cả user.id và targetUserId trong participants
    // Prisma query hơi phức tạp chút:
    const existingConv = await db.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { userId: user.id } } },
                { participants: { some: { userId: targetUserId } } }
            ]
        }
    });

    if (existingConv) {
        return { success: true, conversationId: existingConv.id };
    }

    // Nếu chưa có, tạo mới
    const newConv = await db.conversation.create({
        data: {
            participants: {
                create: [
                    { userId: user.id },
                    { userId: targetUserId }
                ]
            }
        }
    });

    return { success: true, conversationId: newConv.id };
}
