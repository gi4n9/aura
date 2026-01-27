import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

// Export as 'db' for VIBE CODING PROTOCOL compatibility
export const db = prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
