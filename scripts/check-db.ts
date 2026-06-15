import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const vp = await prisma.videoProgress.findMany();
    console.log("VideoProgress:");
    console.log(vp);
    
    const qr = await prisma.quizResult.findMany();
    console.log("QuizResult:");
    console.log(qr);
}

main().finally(() => prisma.$disconnect());
