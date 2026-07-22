import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching Conversations with participants...');
    // Lấy 5 nhóm đầu tiên có chứa members để seed tin nhắn
    const groups = await prisma.conversation.findMany({
        where: {
            isGroup: true,
            participants: {
                some: {} // Chỉ lấy nhóm có member
            }
        },
        include: {
            participants: {
                include: {
                    user: true
                }
            }
        },
        take: 5
    });

    if (groups.length === 0) {
        console.log('No groups found with participants. Please run seed-community.ts first.');
        return;
    }

    const sampleMessages = [
        "Xin chào mọi người!",
        "Cho mình hỏi bài tập phần này với ạ?",
        "Bài này mình nghĩ dùng vòng lặp sẽ tối ưu hơn.",
        "Mọi người có tài liệu nào hay không cho mình xin với.",
        "Cảm ơn bạn nhé!",
        "Đoạn code này bị lỗi Runtime Exception, ai giúp mình fix với.",
        "Mình vừa nộp bài tập xong, khá là khoai.",
        "Chào buổi sáng cả nhà, chúc mọi người học tốt!",
        "Có ai đang online không ạ?",
        "Phần này giảng viên giải thích hơi nhanh, mình chưa hiểu rõ lắm.",
        "Để mình xem lại video rồi rep bạn nhé.",
        "Wow, cách giải của bạn hay quá!",
        "Ai có link discord của lớp không?",
        "Tối nay nhóm mình có học nhóm không mọi người?",
        "Mình thấy dùng thư viện này sẽ nhanh hơn viết chay.",
    ];

    console.log('Seeding Messages...');

    for (const group of groups) {
        console.log(`\nProcessing Group: ${group.name}`);
        const participants = group.participants;
        
        if (participants.length === 0) continue;

        let createdCount = 0;
        
        // Tạo 100 tin nhắn cho nhóm này, cách nhau 1-5 phút
        const now = new Date();
        const startTime = new Date(now.getTime() - 100 * 5 * 60000); // Khoảng vài ngày trước

        for (let i = 0; i < 100; i++) {
            // Random người gửi từ danh sách participant thực tế của nhóm
            const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
            const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
            
            // Random thời gian tăng dần
            const msgTime = new Date(startTime.getTime() + (i * Math.floor(Math.random() * 5 + 1) * 60000));

            try {
                await prisma.directMessage.create({
                    data: {
                        content: randomMsg,
                        conversationId: group.id,
                        senderId: randomParticipant.userId,
                        createdAt: msgTime,
                        updatedAt: msgTime,
                    }
                });
                createdCount++;
            } catch (error) {
                console.error('Lỗi tạo tin nhắn:', error);
            }
        }
        
        console.log(`  -> Created ${createdCount} messages for group ${group.name}.`);
    }

    console.log('\nMessage Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
