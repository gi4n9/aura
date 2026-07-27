"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== "ADMIN") {
    throw new Error("Forbidden: Admin only");
  }

  return user;
}

const DEFAULT_SETTINGS: Record<string, any> = {
  siteName: "Aura Learning Platform",
  siteDescription: "Nền tảng đào tạo trực tuyến thông minh tích hợp trí tuệ nhân tạo AI",
  contactEmail: "support@aura.edu.vn",
  defaultLanguage: "vi",
  allowRegistration: "true",
  requireEmailVerification: "false",

  defaultAiModel: "groq:llama-3.3-70b-versatile",
  aiTemperature: "0.3",
  enableGroupSummary: "true",
  enableGroupBot: "true",
  ragMatchThreshold: "0.35",

  maxUploadSizeMb: "50",
  allowedFileTypes: ".pdf,.mp4,.png,.jpg,.jpeg,.xlsx,.docx",
  maxVideoDurationMinutes: "120",

  maintenanceMode: "false",
  maintenanceMessage: "Hệ thống Aura đang được bảo trì nâng cấp định kỳ. Vui lòng quay lại sau ít phút.",
  sessionTimeoutHours: "24",
  rateLimitRequestsPerMin: "120",
};

export async function getSystemSettings() {
  try {
    await requireAdmin();

    const dbSettings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };

    dbSettings.forEach((setting) => {
      settingsMap[setting.key] = setting.value;
    });

    return { success: true, data: settingsMap };
  } catch (error: any) {
    console.error("getSystemSettings error:", error);
    return { success: true, data: DEFAULT_SETTINGS };
  }
}

export async function updateSystemSettings(settings: Record<string, string>) {
  try {
    await requireAdmin();

    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

    await prisma.$transaction(updates);

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/");

    return { success: true, message: "Đã lưu cài đặt hệ thống thành công!" };
  } catch (error: any) {
    console.error("updateSystemSettings error:", error);
    return { success: false, error: error?.message || "Không thể lưu cài đặt hệ thống" };
  }
}

export async function revalidateSystemCache() {
  try {
    await requireAdmin();

    revalidatePath("/", "layout");
    revalidatePath("/courses", "page");
    revalidatePath("/admin", "layout");

    return { success: true, message: "Đã làm mới bộ nhớ đệm (Cache) toàn hệ thống!" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Lỗi làm mới bộ nhớ đệm" };
  }
}

export async function checkSystemHealth() {
  try {
    await requireAdmin();

    // 1. Check DB
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStartTime;

    // 2. Check Groq AI API
    let groqStatus = "OK";
    let groqLatency = 0;
    try {
      const groqStartTime = Date.now();
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      await groq.models.list();
      groqLatency = Date.now() - groqStartTime;
    } catch (e: any) {
      groqStatus = `ERROR: ${e?.message || "API Error"}`;
    }

    return {
      success: true,
      data: {
        database: { status: "OK", latency: `${dbLatency}ms` },
        groqAi: { status: groqStatus, latency: `${groqLatency}ms` },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Lỗi kiểm tra sức khỏe hệ thống" };
  }
}
