import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching Categories...');
    const categories = await prisma.category.findMany();
    
    if (categories.length === 0) {
        console.log('No categories found in Supabase. Please ensure there are categories to seed against.');
        return;
    }

    console.log('Fetching Users...');
    const users = await prisma.profile.findMany();
    if (users.length === 0) {
        console.log('No users found in Supabase.');
        return;
    }

    console.log('Fetching Courses...');
    const courses = await prisma.course.findMany();
    if (courses.length === 0) {
        console.log('No courses found in Supabase.');
        return;
    }

    const groupTypes = ['Sáng', 'Tối', 'Cuối tuần', 'Cơ bản', 'Nâng cao', 'Dành cho Sinh viên', 'Dành cho Người đi làm', 'Luyện thi', 'Tự do', 'Q&A'];

    console.log('Seeding Conversations...');
    for (const category of categories) {
        console.log(`\nProcessing Category: ${category.name}`);
        
        // Find courses for this category
        const categoryCourses = courses.filter(c => c.categoryId === category.id);
        
        if (categoryCourses.length === 0) {
            console.log(`  -> Skipping: No courses found for this category.`);
            continue;
        }

        let createdGroupsCount = 0;
        let attemptCount = 0;

        // Try to create exactly 10 groups
        while (createdGroupsCount < 10 && attemptCount < 20) {
            // Pick a random course in this category
            const randomCourse = categoryCourses[Math.floor(Math.random() * categoryCourses.length)];
            const randomType = groupTypes[Math.floor(Math.random() * groupTypes.length)];
            
            // Randomize participants
            const numParticipants = Math.floor(Math.random() * 5) + 3; // 3 to 7 participants
            const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
            const selectedUsers = shuffledUsers.slice(0, numParticipants);
            
            const groupName = `Nhóm ${category.name} - ${randomType} (${createdGroupsCount + 1})`;
            
            try {
                const newConversation = await prisma.conversation.create({
                    data: {
                        isGroup: true,
                        name: groupName,
                        description: `Nhóm học tập tập trung vào khóa học: ${randomCourse.title}. Dành cho những ai muốn trao đổi, chia sẻ và cùng nhau tiến bộ.`,
                        courseId: randomCourse.id,
                        isPublic: true,
                        maxMembers: 50,
                        avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(groupName)}`,
                        participants: {
                            create: selectedUsers.map(user => ({
                                userId: user.id,
                                role: 'MEMBER'
                            }))
                        }
                    }
                });
                console.log(`  -> Created Group: ${newConversation.name} (Course: ${randomCourse.title})`);
                createdGroupsCount++;
            } catch (error) {
                console.error(`  -> Failed to create group:`, error);
            }
            
            attemptCount++;
        }
        
        console.log(`  -> Finished Category: ${category.name} with ${createdGroupsCount} groups.`);
    }

    console.log('\nSeed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
