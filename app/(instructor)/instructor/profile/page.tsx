import ProfileForm from "@/app/components/profile/ProfileForm";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function InstructorProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/sign-in");

    const dbUser = await prisma.profile.findUnique({
        where: { id: user.id },
    });

    if (!dbUser || dbUser.role !== "INSTRUCTOR") {
        return redirect("/");
    }

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-stone-900">Hồ sơ Giảng viên</h1>
                <p className="text-stone-500 text-sm">Thông tin này sẽ hiển thị trên các khóa học của bạn</p>
            </div>
            <ProfileForm
                initialData={{
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.fullName,
                    avatarUrl: dbUser.avatarUrl,
                    role: "INSTRUCTOR"
                }}
            />
        </div>
    );
}