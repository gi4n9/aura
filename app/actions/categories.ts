"use server";

import { getCategories, getCategoriesForInstructorToSelect, getCategoryBySlug, getCategoryWithCourses } from "@/services/categories/categories";

export async function getCategoryBySlugAction(slug: string) {
    try {
        const category = await getCategoryBySlug(slug);
        return category;
    } catch (error) {
        console.log("Error in getCategoryBySlugAction:", error);
        return null;
    }
}

export async function getCategoryWithCoursesAction(slug: string) {
    try {
        const category = await getCategoryWithCourses(slug);
        return category;
    } catch (error) {
        console.log("Error in getCategoryWithCoursesAction:", error);
        return null;
    }
}

export async function getCategoriesForSelect(){
    try {
        const categories = await getCategoriesForInstructorToSelect();
        console.log("Categories for select:", categories);
        return categories;
    } catch (error) {
        console.log("Error in getCategoriesForSelect:", error);
        return [];
    }
}

export async function getCategoriesToDisplay(){
    try {
        const categories = await getCategories();
        console.log("Categories to display:", categories);
        return categories;
    } catch (error) {
        console.log("Error in getCategoriesToDisplay:", error);
        return [];
    }
}
