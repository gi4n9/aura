"use server";

import { getCategoriesForInstructorToSelect } from "@/services/categories/categories";

export async function getCategoriesForSelect(){
    try {
        const categories = await getCategoriesForInstructorToSelect();
        console.log("Categories:", categories);
        return categories;
    } catch (error) {
        console.log("Error in getCategoriesForSelect:", error);
        return [];
    }
}