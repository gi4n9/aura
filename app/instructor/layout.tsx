import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import DashboardSidebar from "../components/DashboardSidebar";


export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const dbUser = await prisma.profile.findUnique({ where: { id: user.id } });

  if (!dbUser || (dbUser.role !== "INSTRUCTOR" && dbUser.role !== "ADMIN")) {
    return redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-[#F9F8F4]">
      <DashboardSidebar role="INSTRUCTOR" />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}