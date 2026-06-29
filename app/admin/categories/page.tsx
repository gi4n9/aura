import { getCategoriesAdmin } from "@/app/actions/admin";
import CategoryManager from "@/app/components/admin/CategoryManager";
import { Tag } from "lucide-react";

export default async function AdminCategoriesPage() {
  const result = await getCategoriesAdmin();
  const categories = result.success ? result.data || [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Tag size={20} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Quản lý Danh mục</h1>
          <p className="text-sm text-stone-500">Tạo và quản lý danh mục khóa học</p>
        </div>
      </div>

      <CategoryManager categories={categories as any} />
    </div>
  );
}
