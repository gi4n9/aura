import { getAllUsers } from "@/lib/getUser";
import Link from "next/link";

export default async function Users() {
    const users = await getAllUsers();

    return (
        <div>
            <h1>User List</h1>
            <ul>
                {users.map((user: { id: number; firstName: string; lastName: string }) => (
                    <li key={user.id}>
                        <Link href={`/user/${user.id}`}><h3>{user.firstName} {user.lastName} </h3></Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}