import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting seed for Leaderboard, Streaks & Q&A Forum...");

    // 1. Seed sample users for Leaderboard
    const mockUsers = [
        {
            id: "user-mock-1",
            email: "user1@aura.edu.vn",
            fullName: "Nguyễn Hoàng Anh",
            avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            totalXp: 3850,
            level: 15,
            currentStreak: 14,
            longestStreak: 21,
            equippedFrame: "frame_royal",
            equippedBanner: "banner_royal",
            equippedTitle: "Huyền thoại Aura",
            unlockedItems: ["frame_default", "frame_bronze", "frame_silver", "frame_gold", "frame_platinum", "frame_royal", "banner_default", "banner_emerald", "banner_onyx", "banner_royal", "title_newbie", "title_hardworking", "title_knowledge_master", "title_master", "title_legend"]
        },
        {
            id: "user-mock-2",
            email: "user2@aura.edu.vn",
            fullName: "Trần Thị Mai",
            avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
            totalXp: 2600,
            level: 12,
            currentStreak: 9,
            longestStreak: 12,
            equippedFrame: "frame_platinum",
            equippedBanner: "banner_onyx",
            equippedTitle: "Cao thủ Tri thức",
            unlockedItems: ["frame_default", "frame_bronze", "frame_silver", "frame_gold", "frame_platinum", "banner_default", "banner_onyx", "title_newbie", "title_hardworking", "title_master"]
        },
        {
            id: "user-mock-3",
            email: "user3@aura.edu.vn",
            fullName: "Lê Quốc Bảo",
            avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            totalXp: 1850,
            level: 9,
            currentStreak: 7,
            longestStreak: 10,
            equippedFrame: "frame_gold",
            equippedBanner: "banner_emerald",
            equippedTitle: "Thấu học sinh",
            unlockedItems: ["frame_default", "frame_bronze", "frame_silver", "frame_gold", "banner_default", "banner_emerald", "title_newbie", "title_hardworking"]
        },
        {
            id: "user-mock-4",
            email: "user4@aura.edu.vn",
            fullName: "Phạm Minh Đức",
            avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            totalXp: 1100,
            level: 6,
            currentStreak: 4,
            longestStreak: 6,
            equippedFrame: "frame_silver",
            equippedBanner: "banner_default",
            equippedTitle: "Học viên Chăm chỉ",
            unlockedItems: ["frame_default", "frame_bronze", "frame_silver", "title_newbie", "title_hardworking"]
        },
        {
            id: "user-mock-5",
            email: "user5@aura.edu.vn",
            fullName: "Vũ Thùy Linh",
            avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            totalXp: 650,
            level: 4,
            currentStreak: 3,
            longestStreak: 3,
            equippedFrame: "frame_bronze",
            equippedBanner: "banner_default",
            equippedTitle: "Tân binh Aura",
            unlockedItems: ["frame_default", "frame_bronze", "title_newbie"]
        }
    ];

    for (const mock of mockUsers) {
        const profile = await prisma.profile.upsert({
            where: { id: mock.id },
            update: {
                fullName: mock.fullName,
                avatarUrl: mock.avatarUrl,
                email: mock.email
            },
            create: {
                id: mock.id,
                email: mock.email,
                fullName: mock.fullName,
                avatarUrl: mock.avatarUrl,
                role: "STUDENT"
            }
        });

        await prisma.userStats.upsert({
            where: { userId: profile.id },
            update: {
                totalXp: mock.totalXp,
                level: mock.level,
                currentStreak: mock.currentStreak,
                longestStreak: mock.longestStreak,
                lastStudyDate: new Date(),
                equippedFrame: mock.equippedFrame,
                equippedBanner: mock.equippedBanner,
                equippedTitle: mock.equippedTitle,
                unlockedItems: mock.unlockedItems
            },
            create: {
                userId: profile.id,
                totalXp: mock.totalXp,
                level: mock.level,
                currentStreak: mock.currentStreak,
                longestStreak: mock.longestStreak,
                lastStudyDate: new Date(),
                equippedFrame: mock.equippedFrame,
                equippedBanner: mock.equippedBanner,
                equippedTitle: mock.equippedTitle,
                unlockedItems: mock.unlockedItems
            }
        });

        console.log(`✅ Upserted sample user: ${mock.fullName} (Level ${mock.level}, ${mock.totalXp} XP)`);
    }

    // 2. Update user with email quanquecai@gmail.com
    const targetEmail = "quanquecai@gmail.com";
    let targetUser = await prisma.profile.findUnique({
        where: { email: targetEmail }
    });

    if (!targetUser) {
        targetUser = await prisma.profile.findFirst({
            where: { email: { contains: "quanquecai" } }
        });
    }

    if (targetUser) {
        const now = new Date();
        await prisma.userStats.upsert({
            where: { userId: targetUser.id },
            update: {
                currentStreak: 5,
                longestStreak: 5,
                lastStudyDate: now,
                totalXp: 1450,
                level: 8,
                equippedFrame: "frame_gold",
                equippedBanner: "banner_royal",
                equippedTitle: "Thấu học sinh",
                unlockedItems: ["frame_default", "frame_bronze", "frame_silver", "frame_gold", "banner_default", "banner_royal", "title_newbie", "title_hardworking"]
            },
            create: {
                userId: targetUser.id,
                currentStreak: 5,
                longestStreak: 5,
                lastStudyDate: now,
                totalXp: 1450,
                level: 8,
                equippedFrame: "frame_gold",
                equippedBanner: "banner_royal",
                equippedTitle: "Thấu học sinh",
                unlockedItems: ["frame_default", "frame_bronze", "frame_silver", "frame_gold", "banner_default", "banner_royal", "title_newbie", "title_hardworking"]
            }
        });
        console.log(`🔥 Updated ${targetEmail} (${targetUser.fullName || 'User'}): 5-day streak set! Level 8 (1450 XP)!`);
    }

    // 3. Seed Sample Q&A Questions
    const sampleQuestions = [
        {
            id: "qa-mock-1",
            authorId: "user-mock-1",
            title: "Làm sao để duy trì chuỗi ngày học Streak liên tục hiệu quả?",
            content: "Mình hay bị quên học vào cuối tuần, mọi người có mẹo gì để nhắc nhở và duy trì streak đều đặn không ạ?",
            isResolved: true,
            upvotesCount: 8
        },
        {
            id: "qa-mock-2",
            authorId: "user-mock-2",
            title: "Sự khác biệt giữa Server Components và Client Components trong Next.js 14?",
            content: "Nên sử dụng 'use client' ở cấp độ nào trong dự án để đảm bảo hiệu năng và SEO tốt nhất?",
            isResolved: false,
            upvotesCount: 5
        }
    ];

    for (const q of sampleQuestions) {
        await prisma.groupQuestion.upsert({
            where: { id: q.id },
            update: {
                title: q.title,
                content: q.content,
                isResolved: q.isResolved,
                upvotesCount: q.upvotesCount
            },
            create: {
                id: q.id,
                authorId: q.authorId,
                title: q.title,
                content: q.content,
                isResolved: q.isResolved,
                upvotesCount: q.upvotesCount
            }
        });

        // Sample answer
        await prisma.groupQuestionAnswer.upsert({
            where: { id: `ans-${q.id}` },
            update: {},
            create: {
                id: `ans-${q.id}`,
                questionId: q.id,
                authorId: "user-mock-3",
                content: "Bạn có thể thiết lập lịch học định kỳ trong phần Study Schedule của Aura để nhận thông báo hàng ngày nhé!",
                isAccepted: q.isResolved
            }
        });
    }

    console.log("💬 Seeded sample Q&A questions and answers!");
    console.log("🎉 All seeding completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
