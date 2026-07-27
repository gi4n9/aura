import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testInsert() {
  const fakeId = "00000000-0000-0000-0000-000000000001";
  const fakeEmail = "test_insert@example.com";
  try {
    console.log("Testing SQL insert into public.\"Profile\"...");
    await prisma.$executeRawUnsafe(`
      INSERT INTO public."Profile" (id, email, "fullName", "avatarUrl", role, "createdAt", "updatedAt")
      VALUES (
        '${fakeId}',
        '${fakeEmail}',
        'Test Name',
        NULL,
        'STUDENT'::"UserRole",
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("✅ SQL Insert into public.\"Profile\" succeeded!");

    // Cleanup
    await prisma.$executeRawUnsafe(`DELETE FROM public."Profile" WHERE id = '${fakeId}'`);
    console.log("Cleaned up test row.");
  } catch (err: any) {
    console.error("❌ SQL Insert error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testInsert();
