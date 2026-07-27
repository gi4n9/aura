'use server';

import { db } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// ==================== JOIN / LEAVE ====================

export async function joinGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const group = await db.conversation.findUnique({
            where: { id: groupId, isGroup: true },
            include: { participants: { select: { userId: true } } }
        });

        if (!group) {
            return { success: false, error: "Nhóm không tồn tại" };
        }

        const existingParticipant = group.participants.find(p => p.userId === user.id);
        if (existingParticipant) {
            return { success: false, error: "Bạn đã tham gia nhóm này" };
        }

        if (group.participants.length >= group.maxMembers) {
            return { success: false, error: "Nhóm đã đầy" };
        }

        await db.conversationParticipant.create({
            data: {
                conversationId: groupId,
                userId: user.id,
                role: "MEMBER"
            }
        });

        revalidatePath("/community");

        return { success: true };
    } catch (error) {
        console.error("Lỗi tham gia nhóm:", error);
        return { success: false, error: "Có lỗi xảy ra, vui lòng thử lại sau" };
    }
}

export async function leaveGroup(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        await db.conversationParticipant.deleteMany({
            where: {
                conversationId: groupId,
                userId: user.id
            }
        });

        revalidatePath("/community");

        return { success: true };
    } catch (error) {
        console.error("Lỗi rời nhóm:", error);
        return { success: false, error: "Có lỗi xảy ra, vui lòng thử lại sau" };
    }
}

// ==================== CREATE GROUP ====================

interface CreateGroupParams {
    name: string;
    description: string;
    courseIds: string[];       // Bắt buộc ít nhất 1 khóa học
    isPublic: boolean;
    inviteInstructors: boolean; // Tự động gửi lời mời tới giảng viên của các khóa học đã chọn
}

export async function createGroup(params: CreateGroupParams) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { name, description, courseIds, isPublic, inviteInstructors } = params;

    if (!name.trim()) return { success: false, error: "Tên nhóm không được để trống" };
    if (courseIds.length === 0) return { success: false, error: "Phải chọn ít nhất 1 khóa học để liên kết" };

    try {
        // Xác nhận các khóa học tồn tại
        const courses = await db.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, title: true, thumbnailUrl: true, instructorId: true }
        });

        if (courses.length === 0) return { success: false, error: "Không tìm thấy khóa học nào" };

        // Tạo nhóm chat
        const group = await db.conversation.create({
            data: {
                isGroup: true,
                name: name.trim(),
                description: description.trim() || null,
                avatarUrl: courses[0]?.thumbnailUrl || null,
                isPublic,
                courseId: courses[0]?.id || null, // backward compat: primary course
                participants: {
                    create: {
                        userId: user.id,
                        role: "OWNER"
                    }
                },
                // Liên kết nhiều khóa học
                courseLinks: {
                    create: courses.map(c => ({
                        courseId: c.id
                    }))
                }
            }
        });

        // Nếu chọn mời giảng viên, gửi lời mời tới tất cả giảng viên của các khóa học liên kết
        if (inviteInstructors && (db as any).groupInvitation) {
            const instructorIds = [...new Set(courses.map(c => c.instructorId))];

            // Không tự mời chính mình
            const idsToInvite = instructorIds.filter(id => id !== user.id);

            if (idsToInvite.length > 0) {
                await (db as any).groupInvitation.createMany({
                    data: idsToInvite.map(inviteeId => ({
                        conversationId: group.id,
                        inviterId: user.id,
                        inviteeId,
                        status: "PENDING"
                    })),
                    skipDuplicates: true
                });
            }
        }

        revalidatePath("/community");

        return { success: true, groupId: group.id };
    } catch (error) {
        console.error("Lỗi tạo nhóm:", error);
        return { success: false, error: "Có lỗi xảy ra khi tạo nhóm" };
    }
}

// ==================== INVITATIONS ====================

// Mời giảng viên cụ thể vào nhóm (dùng khi muốn mời sau khi đã tạo nhóm)
export async function inviteInstructorToGroup(groupId: string, instructorId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // Kiểm tra nhóm tồn tại và user là thành viên
        const group = await db.conversation.findUnique({
            where: { id: groupId, isGroup: true },
            include: {
                courseLinks: { select: { courseId: true } },
                participants: { select: { userId: true } }
            }
        });

        if (!group) return { success: false, error: "Nhóm không tồn tại" };
        if (!group.participants.some(p => p.userId === user.id)) {
            return { success: false, error: "Bạn không phải thành viên nhóm này" };
        }

        // Kiểm tra giảng viên có phải là instructor của khóa học liên kết không
        const linkedCourseIds = group.courseLinks.map(l => l.courseId);
        if (group.courseId && !linkedCourseIds.includes(group.courseId)) {
            linkedCourseIds.push(group.courseId);
        }

        const isValidInstructor = await db.course.findFirst({
            where: {
                id: { in: linkedCourseIds },
                instructorId: instructorId
            }
        });

        if (!isValidInstructor) {
            return { success: false, error: "Giảng viên này không thuộc các khóa học mà nhóm liên kết" };
        }

        // Kiểm tra đã là thành viên chưa
        const alreadyMember = group.participants.some(p => p.userId === instructorId);
        if (alreadyMember) {
            return { success: false, error: "Giảng viên đã là thành viên nhóm" };
        }

        // Tạo lời mời (upsert để tránh trùng)
        await db.groupInvitation.upsert({
            where: {
                conversationId_inviteeId: {
                    conversationId: groupId,
                    inviteeId: instructorId
                }
            },
            create: {
                conversationId: groupId,
                inviterId: user.id,
                inviteeId: instructorId,
                status: "PENDING"
            },
            update: {
                status: "PENDING",
                inviterId: user.id,
                updatedAt: new Date()
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Lỗi mời giảng viên:", error);
        return { success: false, error: "Có lỗi xảy ra" };
    }
}

// Giảng viên xem danh sách lời mời đang chờ
export async function getMyInvitations() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    if (!(db as any).groupInvitation) {
        console.warn("db.groupInvitation model not available on Prisma Client yet.");
        return [];
    }

    try {
        const invitations = await (db as any).groupInvitation.findMany({
            where: {
                inviteeId: user.id,
                status: "PENDING"
            },
            include: {
                conversation: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        description: true,
                        _count: { select: { participants: true } },
                        courseLinks: {
                            include: {
                                course: {
                                    select: { id: true, title: true }
                                }
                            }
                        }
                    }
                },
                inviter: {
                    select: { id: true, fullName: true, avatarUrl: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return invitations.map((inv: any) => ({
            id: inv.id,
            groupId: inv.conversation.id,
            groupName: inv.conversation.name || "Nhóm không tên",
            groupAvatar: inv.conversation.avatarUrl,
            groupDescription: inv.conversation.description,
            membersCount: inv.conversation._count.participants,
            courses: (inv.conversation.courseLinks || []).map((l: any) => l.course.title),
            inviter: {
                id: inv.inviter.id,
                name: inv.inviter.fullName || "Người dùng",
                avatar: inv.inviter.avatarUrl
            },
            createdAt: inv.createdAt
        }));
    } catch (err) {
        console.error("Error fetching invitations:", err);
        return [];
    }
}

// Giảng viên chấp nhận hoặc từ chối lời mời
export async function respondToInvitation(invitationId: string, accept: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        if (!(db as any).groupInvitation) return { success: false, error: "TÍnh năng lời mời đang khởi động" };

        const invitation = await (db as any).groupInvitation.findUnique({
            where: { id: invitationId },
            include: { conversation: true }
        });

        if (!invitation || invitation.inviteeId !== user.id) {
            return { success: false, error: "Lời mời không tồn tại" };
        }

        if (invitation.status !== "PENDING") {
            return { success: false, error: "Lời mời đã được xử lý" };
        }

        if (accept) {
            // Thêm giảng viên vào nhóm + cập nhật status
            await db.$transaction([
                db.conversationParticipant.create({
                    data: {
                        conversationId: invitation.conversationId,
                        userId: user.id,
                        role: "ADMIN" // Giảng viên được quyền ADMIN
                    }
                }),
                (db as any).groupInvitation.update({
                    where: { id: invitationId },
                    data: { status: "ACCEPTED" }
                })
            ]);
        } else {
            await (db as any).groupInvitation.update({
                where: { id: invitationId },
                data: { status: "DECLINED" }
            });
        }

        revalidatePath("/instructor/messages");
        revalidatePath("/community");

        return { success: true };
    } catch (error) {
        console.error("Lỗi xử lý lời mời:", error);
        return { success: false, error: "Có lỗi xảy ra" };
    }
}

// ==================== SEARCH ====================

export async function searchGroups(query: string) {
    if (!query.trim()) return [];

    const groups = await db.conversation.findMany({
        where: {
            isGroup: true,
            isPublic: true,
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { courseLinks: { some: { course: { title: { contains: query, mode: 'insensitive' } } } } }
            ]
        },
        include: {
            participants: { select: { userId: true } },
            courseLinks: { include: { course: { select: { title: true } } } }
        },
        take: 20,
        orderBy: { updatedAt: 'desc' }
    });

    return groups.map(g => ({
        id: g.id,
        name: g.name || "Nhóm không tên",
        description: g.description,
        avatar: g.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${g.id}`,
        membersCount: g.participants.length,
        maxMembers: g.maxMembers,
        isPublic: g.isPublic,
        courses: g.courseLinks.map(l => l.course.title)
    }));
}

// ==================== HELPER: Lấy danh sách giảng viên có thể mời cho nhóm ====================

export async function getInvitableInstructors(groupId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const group = await db.conversation.findUnique({
        where: { id: groupId, isGroup: true },
        include: {
            courseLinks: { select: { courseId: true } },
            participants: { select: { userId: true } },
            invitations: {
                where: { status: "PENDING" },
                select: { inviteeId: true }
            }
        }
    });

    if (!group) return [];

    // Lấy courseIds liên kết
    const linkedCourseIds = group.courseLinks.map(l => l.courseId);
    if (group.courseId && !linkedCourseIds.includes(group.courseId)) {
        linkedCourseIds.push(group.courseId);
    }

    // Lấy tất cả giảng viên của các khóa học liên kết
    const courses = await db.course.findMany({
        where: { id: { in: linkedCourseIds } },
        select: {
            instructorId: true,
            title: true,
            instructor: {
                select: { id: true, fullName: true, avatarUrl: true, email: true }
            }
        }
    });

    const existingMemberIds = new Set(group.participants.map(p => p.userId));
    const pendingInviteeIds = new Set(group.invitations.map(i => i.inviteeId));

    // Deduplicate và loại bỏ đã là thành viên hoặc đã mời
    const instructorMap = new Map<string, any>();
    for (const course of courses) {
        const inst = course.instructor;
        if (!existingMemberIds.has(inst.id) && !pendingInviteeIds.has(inst.id) && !instructorMap.has(inst.id)) {
            instructorMap.set(inst.id, {
                id: inst.id,
                name: inst.fullName || inst.email || "Giảng viên",
                avatar: inst.avatarUrl,
                courseName: course.title
            });
        }
    }

    return Array.from(instructorMap.values());
}
