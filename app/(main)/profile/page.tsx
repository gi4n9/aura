import ProfileForm from "@/app/components/profile/ProfileForm";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/sign-in");

    // Fetch data từ DB của bạn
    const dbUser = await prisma.profile.findUnique({
        where: { id: user.id }, // Hoặc email tùy schema
    });

    if (!dbUser) return redirect("/");

    return (
        <div className="container mx-auto px-6 py-10 pt-[80px]">
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-bold text-stone-900">Hồ sơ học tập</h1>
                <p className="text-stone-500">Quản lý thông tin cá nhân của bạn</p>
            </div>
            <ProfileForm
                initialData={{
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.fullName,
                    avatarUrl: dbUser.avatarUrl,
                    role: "USER"
                }}
            />
        </div>
    );
}