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

export async function getCategories(){
    try {
        const categories = await db.category.findMany({
            where: {
                parentId: null
            },
            orderBy:{
                name: "asc"
            },
            include: {
                children: {
                    orderBy: {
                        name: "asc"
                    },
                    include: {
                        _count: {
                            select: {
                                courses: true
                            }
                        }
                    }
                }
            }
        })

        return categories;
    } catch (error){
        console.log("Error in getCategories:", error);
        return []
    }
}

export async function getCategoryBySlug(slug: string) {
    try {
        const category = await db.category.findUnique({
            where: {
                slug
            },
            include: {
                children: {
                    include: {
                        _count: {
                            select: {
                                courses: true
                            }
                        }
                    }
                }
            }
        })

        return category;
    } catch (error) {
        console.log("Error in getCategoryBySlug:", error);
        return null;
    }
}

export async function getCategoryWithCourses(slug: string) {
    try {
        const category = await db.category.findUnique({
            where: {
                slug
            },
            include: {
                courses: {
                    where: {
                        status: "PUBLISHED"
                    },
                    include: {
                        chapters: {
                            where: {
                                status: "PUBLISHED"
                            },
                            select: {
                                id: true
                            }
                        }
                    }
                }
            }
        })
        return category;
    } catch (error) {
        console.log("Error in getCategoryWithCourses:", error);
        return null;
    }
}