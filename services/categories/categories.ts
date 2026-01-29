import { db } from "@/lib/prisma";

export async function getCategoriesForInstructorToSelect() {
    try {
        const categories = await db.category.findMany({
            orderBy: {
                name: "asc"
            }
        })

        return categories;
    } catch (error) {
        console.log("Error in getCategoriesForInstructorToSelect:", error);
        return [];
    }
}