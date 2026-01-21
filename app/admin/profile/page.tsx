import ProfileForm from "@/app/components/profile/ProfileForm";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/sign-in");

    const dbUser = await prisma.profile.findUnique({
        where: { id: user.id },
    });

    // 🔒 SECURITY CHECK: Chỉ Admin mới được vào
    if (!dbUser || dbUser.role !== "ADMIN") {
        return redirect("/");
    }

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-stone-900">Tài khoản Quản trị</h1>
                <p className="text-stone-500 text-sm">Thông tin quản trị viên hệ thống</p>
            </div>
            <ProfileForm
                initialData={{
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.fullName,
                    avatarUrl: dbUser.avatarUrl,
                    role: "ADMIN"
                }}
            />
        </div>
    );
}