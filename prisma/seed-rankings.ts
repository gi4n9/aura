import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_STUDENTS = [
    {
        email: "truonggiang@aura.edu.vn",
        fullName: "Lii D",
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=TruongGiang",
        xp: 25584,
        level: 34,
        streak: 28,
        equippedFrame: "frame_cosmic",
        equippedBanner: "banner-[#121212]",
        equippedTitle: "Huyền thoại Aura",
        bio: "Sinh viên ĐH Sài Gòn (SGU) • Đam mê Lập trình & AI",
        learningGoal: "Có việc làm Software Engineer trước khi tốt nghiệp",
        viewsCount: 128
    },
    {
        email: "minhanh@aura.edu.vn",
        fullName: "Thảo Luân",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=MinhAnh",
        xp: 23492,
        level: 31,
        streak: 19,
        equippedFrame: "frame_platinum",
        equippedBanner: "banner_nebula",
        equippedTitle: "Cao thủ Tri thức",
        bio: "Front-end Developer | UI/UX Designer",
        learningGoal: "Chinh phục React & Next.js nâng cao",
        viewsCount: 95
    },
    {
        email: "quanghuy@aura.edu.vn",
        fullName: "Lê Quang Huy",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=QuangHuy",
        xp: 20278,
        level: 28,
        streak: 12,
        equippedFrame: "frame_gold",
        equippedBanner: "banner_royal",
        equippedTitle: "Cao thủ Tri thức",
        bio: "Backend Dev | Python & Go Enthusiast",
        learningGoal: "Xây dựng hệ thống Microservices quy mô lớn",
        viewsCount: 76
    },
    {
        email: "baochau@aura.edu.vn",
        fullName: "Trần Bảo Châu",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=BaoChau",
        xp: 18500,
        level: 24,
        streak: 15,
        equippedFrame: "frame_gold",
        equippedBanner: "banner_emerald",
        equippedTitle: "Thấu học sinh",
        bio: "Data Science Student | Machine Learning",
        learningGoal: "Trở thành Data Scientist chuyên nghiệp",
        viewsCount: 64
    },
    {
        email: "dinhkhoa@aura.edu.vn",
        fullName: "Phạm Đăng Khoa",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DangKhoa",
        xp: 15200,
        level: 20,
        streak: 8,
        equippedFrame: "frame_silver",
        equippedBanner: "banner_onyx",
        equippedTitle: "Thấu học sinh",
        bio: "Mobile App Developer | Flutter & Swift",
        learningGoal: "Publish 3 ứng dụng lên App Store & Google Play",
        viewsCount: 52
    },
    {
        email: "khanhvy@aura.edu.vn",
        fullName: "Vũ Khánh Vy",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed-[#C5A059]",
        xp: 12300,
        level: 16,
        streak: 7,
        equippedFrame: "frame_silver",
        equippedBanner: "banner_cyber",
        equippedTitle: "Học viên Chăm chỉ",
        bio: "Tiếng Anh & Ngoại ngữ",
        learningGoal: "Đạt 8.0 IELTS trong 6 tháng tới",
        viewsCount: 43
    }
];

const SAMPLE_CHEERS = [
    "🎉 Chúc mừng bạn nhé!",
    "🔥 Tiến bộ tuyệt vời!",
    "💪 Anh nỗ lực lên nhé!",
    "🌟 Làm tốt lắm!",
    "🚀 Bạn đang chạy hết tốc lực đấy!"
];

async function main() {
    console.log("🌱 Seeding real student profiles, cheers, reactions & ranking data...");

    const createdProfiles = [];

    for (const student of DEMO_STUDENTS) {
        const profile = await prisma.profile.upsert({
            where: { email: student.email },
            update: {
                fullName: student.fullName,
                avatarUrl: student.avatarUrl,
                role: UserRole.STUDENT,
                bio: student.bio,
                learningGoal: student.learningGoal,
                viewsCount: student.viewsCount
            },
            create: {
                email: student.email,
                fullName: student.fullName,
                avatarUrl: student.avatarUrl,
                role: UserRole.STUDENT,
                bio: student.bio,
                learningGoal: student.learningGoal,
                viewsCount: student.viewsCount,
                interests: ["backend", "frontend", "lap-trinh"]
            }
        });

        createdProfiles.push(profile);

        await prisma.userStats.upsert({
            where: { userId: profile.id },
            update: {
                totalXp: student.xp,
                level: student.level,
                currentStreak: student.streak,
                longestStreak: Math.max(student.streak, 10),
                equippedFrame: student.equippedFrame,
                equippedBanner: student.equippedBanner,
                equippedTitle: student.equippedTitle,
                unlockedItems: [
                    "frame_default",
                    "banner_default",
                    "title_newbie",
                    student.equippedFrame,
                    student.equippedBanner
                ]
            },
            create: {
                userId: profile.id,
                totalXp: student.xp,
                level: student.level,
                currentStreak: student.streak,
                longestStreak: Math.max(student.streak, 10),
                equippedFrame: student.equippedFrame,
                equippedBanner: student.equippedBanner,
                equippedTitle: student.equippedTitle,
                unlockedItems: [
                    "frame_default",
                    "banner_default",
                    "title_newbie",
                    student.equippedFrame,
                    student.equippedBanner
                ]
            }
        });

        console.log(`  ✅ Student Profile & Stats synced: ${student.fullName}`);
    }

    // Create sample cheers and reactions between demo students
    console.log("💬 Seeding sample Cheers & Reactions...");
    for (let i = 0; i < createdProfiles.length; i++) {
        const target = createdProfiles[i];
        const sender = createdProfiles[(i + 1) % createdProfiles.length];

        // Seed Cheer
        await prisma.profileCheer.create({
            data: {
                senderId: sender.id,
                targetUserId: target.id,
                message: SAMPLE_CHEERS[i % SAMPLE_CHEERS.length]
            }
        });

        // Seed Reaction
        await prisma.profileReaction.upsert({
            where: {
                senderId_targetUserId_type: {
                    senderId: sender.id,
                    targetUserId: target.id,
                    type: 'heart'
                }
            },
            update: {},
            create: {
                senderId: sender.id,
                targetUserId: target.id,
                type: 'heart'
            }
        });
    }

    console.log("🎉 Seeding ranking profiles, cheers & reactions completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
