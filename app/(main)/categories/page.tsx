
import { getCategoriesToDisplay } from "@/app/actions/categories";
import CategoriesClient from "../../components/client/CategoriesClient";

export default async function CategoriesPage() {
    const categories = await getCategoriesToDisplay();

    const serializedCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        children: cat.children.map(child => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            _count: {
                courses: child._count.courses
            }
        }))
    }));

    return (
        <CategoriesClient categories={serializedCategories} />
    );
}