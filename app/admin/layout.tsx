import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import DashboardSidebar from "../components/DashboardSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // Check quyền trong DB
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  
  if (!dbUser || dbUser.role !== "ADMIN") {
    return redirect("/"); // Đá về trang chủ nếu không phải Admin
  }

  return (
    <div className="flex min-h-screen bg-[#F9F8F4]">
      <DashboardSidebar role="ADMIN" />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}