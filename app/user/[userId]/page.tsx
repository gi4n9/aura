import { getUserById } from "@/lib/getUser";
import { notFound } from "next/navigation";

export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;
    const user = await getUserById(userId);

    if (!user) {
        notFound();
    }
    return (
        <div>
            name: {user.firstName}
        </div>
    )
}