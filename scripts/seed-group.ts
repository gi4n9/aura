import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const groupId = "3f68598c-6030-4f32-a01f-f6eea5876b8f";

    console.log(`🌱 Seeding community data for group ${groupId}...`);

    // 1. Check or create Conversation (Group)
    let group = await prisma.conversation.findUnique({
        where: { id: groupId }
    });

    if (!group) {
        group = await prisma.conversation.create({
            data: {
                id: groupId,
                name: "Nhóm Học Tập Chuyên Sâu Next.js & AI",
                description: "Cộng đồng trao đổi kiến thức, duy trì chuỗi Streak và hỗ trợ làm đồ án Aura.",
                isGroup: true,
                isPublic: true,
                maxMembers: 50
            }
        });
        console.log(`✅ Created group ${groupId}`);
    } else {
        console.log(`✅ Found existing group: ${group.name}`);
    }

    // 2. Target user quanquecai@gmail.com
    const targetEmail = "quanquecai@gmail.com";
    let mainUser = await prisma.profile.findUnique({
        where: { email: targetEmail }
    });
    if (!mainUser) {
        mainUser = await prisma.profile.findFirst({
            where: { email: { contains: "quanquecai" } }
        });
    }

    // List of participants to add
    const participantIds = [
        "user-mock-1",
        "user-mock-2",
        "user-mock-3",
        "user-mock-4",
        "user-mock-5"
    ];

    if (mainUser) {
        participantIds.push(mainUser.id);
    }

    for (const userId of participantIds) {
        try {
            await prisma.conversationParticipant.upsert({
                where: {
                    conversationId_userId: {
                        conversationId: groupId,
                        userId: userId
                    }
                },
                update: {
                    role: userId === mainUser?.id ? "OWNER" : "MEMBER"
                },
                create: {
                    conversationId: groupId,
                    userId: userId,
                    role: userId === mainUser?.id ? "OWNER" : "MEMBER"
                }
            });
            console.log(`👤 Added participant ${userId} to group`);
        } catch (err) {
            console.error(`Error adding participant ${userId}:`, err);
        }
    }

    // 3. Seed Direct Messages for the group chat
    const sampleMessages = [
        {
            senderId: "user-mock-1",
            content: "Chào mọi người! Tuần này nhóm mình ai đã cán mốc 7 ngày Streak liên tục chưa nhỉ? 🔥"
        },
        {
            senderId: "user-mock-2",
            content: "Mình vừa đạt 9 ngày rồi nè! Đã mở khóa Khung Bạch Kim ở Level 12 nhìn sang xịn hẳn 🎉"
        },
        {
            senderId: mainUser?.id || "user-mock-3",
            content: "Chào anh em, mình vừa hoàn thành bài học hôm nay và đạt chuỗi 5 ngày streak liên tiếp rồi nè! 💪"
        },
        {
            senderId: "user-mock-3",
            content: "Chúc mừng bạn nhé! Cố gắng giữ ngọn lửa streak để đua top Bảng Xếp Hạng tuần này nào 🏆"
        },
        {
            senderId: "user-mock-4",
            content: "Mọi người cho mình hỏi phần Server Actions trong Next.js 14 có bài test ví dụ nào thực hành không?"
        }
    ];

    for (const msg of sampleMessages) {
        await prisma.directMessage.create({
            data: {
                conversationId: groupId,
                senderId: msg.senderId,
                content: msg.content
            }
        });
    }
    console.log("💬 Seeded group chat messages!");

    // 4. Attach Q&A Questions to this group
    const groupQuestions = [
        {
            id: `grp-qa-1-${groupId.slice(0, 5)}`,
            conversationId: groupId,
            authorId: "user-mock-2",
            title: "Làm thế nào để tối ưu caching Server Actions trong nhóm học?",
            content: "Trong bài học Next.js 14, khi gọi revalidatePath thì dữ liệu nhóm có tự động cập nhật lại cho tất cả thành viên không?",
            isResolved: true,
            upvotesCount: 6
        },
        {
            id: `grp-qa-2-${groupId.slice(0, 5)}`,
            conversationId: groupId,
            authorId: mainUser?.id || "user-mock-4",
            title: "Chia sẻ kinh nghiệm duy trì chuỗi Streak 5 ngày cho người mới bắt đầu",
            content: "Mỗi ngày nên dành ít nhất bao nhiêu phút học bài để đảm bảo tiến độ công việc mà vẫn giữ được streak vậy mọi người?",
            isResolved: false,
            upvotesCount: 4
        }
    ];

    for (const gq of groupQuestions) {
        await prisma.groupQuestion.upsert({
            where: { id: gq.id },
            update: {
                title: gq.title,
                content: gq.content,
                isResolved: gq.isResolved,
                upvotesCount: gq.upvotesCount
            },
            create: {
                id: gq.id,
                conversationId: gq.conversationId,
                authorId: gq.authorId,
                title: gq.title,
                content: gq.content,
                isResolved: gq.isResolved,
                upvotesCount: gq.upvotesCount
            }
        });

        // Answer for question
        await prisma.groupQuestionAnswer.upsert({
            where: { id: `ans-${gq.id}` },
            update: {},
            create: {
                id: `ans-${gq.id}`,
                questionId: gq.id,
                authorId: "user-mock-1",
                content: "Chỉ cần dành 15-20 phút xem 1 bài giảng hoặc làm bài quiz nhỏ mỗi ngày là đủ thắp sáng ngọn lửa Streak rồi nhé!",
                isAccepted: gq.isResolved
            }
        });
    }

    console.log("❓ Seeded group Q&A topics and answers!");
    console.log("🎉 Group 3f68598c-6030-4f32-a01f-f6eea5876b8f seeding completed!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
