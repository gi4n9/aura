export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
}

export async function getAllUsers() {
    const res = await fetch("https://dummyjson.com/users")

    if (!res) {
        throw new Error("failed to fetch users");
    }

    const data = await res.json();
    return data.users as User[];

}

export async function getUserById(id: string) {
    const res = await fetch(`https://dummyjson.com/users/${id}`);

    if (!res) {
        throw new Error(`failed to fetch user by id ${id}`)
    }

    return res.json();
}