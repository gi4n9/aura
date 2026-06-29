"use client";

import { useState, useTransition } from "react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/actions/admin";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Tag,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  createdAt: Date;
  _count: { courses: number };
};

interface CategoryManagerProps {
  categories: CategoryItem[];
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string;
}

const EMPTY_FORM: FormData = { name: "", slug: "", description: "", icon: "", parentId: "" };

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface ModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  loading: boolean;
  initialData?: FormData;
  categories: CategoryItem[];
  editingId?: string | null;
}

function CategoryModal({
  title,
  onClose,
  onSubmit,
  loading,
  initialData = EMPTY_FORM,
  categories,
  editingId,
}: ModalProps) {
  const [form, setForm] = useState<FormData>(initialData);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === slugify(prev.name) || prev.slug === "" ? slugify(name) : prev.slug,
    }));
  };

  const parentOptions = categories.filter((c) => c.id !== editingId && !c.parentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Tag size={18} className="text-amber-600" />
            </div>
            <h2 className="font-semibold text-stone-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tên danh mục <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="VD: Lập trình Web"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Slug <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2.5">/</span>
              <input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="lap-trinh-web"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả ngắn về danh mục..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Icon (emoji)</label>
              <input
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                placeholder="💻"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Danh mục cha</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">Không có</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-stone-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.name.trim() || !form.slug.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({
  category,
  onConfirm,
  onCancel,
  loading,
}: {
  category: CategoryItem;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h3 className="font-semibold text-stone-900">Xóa danh mục?</h3>
        </div>
        <p className="text-sm text-stone-600 mb-1">
          Bạn chắc chắn muốn xóa danh mục{" "}
          <span className="font-semibold text-stone-800">"{category.name}"</span>?
        </p>
        {category._count.courses > 0 && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">
            ⚠️ Danh mục này có {category._count.courses} khóa học. Cần di chuyển khóa học trước.
          </p>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || category._count.courses > 0}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [deletingCat, setDeletingCat] = useState<CategoryItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleCreate = async (data: FormData) => {
    setFormLoading(true);
    const result = await createCategory({
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
      icon: data.icon || undefined,
      parentId: data.parentId || undefined,
    });
    setFormLoading(false);
    if (result.success) {
      toast.success("Đã tạo danh mục thành công!");
      setShowCreate(false);
      router.refresh();
    } else {
      toast.error(result.error || "Tạo danh mục thất bại");
    }
  };

  const handleUpdate = async (data: FormData) => {
    if (!editingCat) return;
    setFormLoading(true);
    const result = await updateCategory(editingCat.id, {
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
      icon: data.icon || undefined,
      parentId: data.parentId || null,
    });
    setFormLoading(false);
    if (result.success) {
      toast.success("Đã cập nhật danh mục!");
      setEditingCat(null);
      router.refresh();
    } else {
      toast.error(result.error || "Cập nhật thất bại");
    }
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    setDeleteLoading(true);
    const result = await deleteCategory(deletingCat.id);
    setDeleteLoading(false);
    if (result.success) {
      toast.success("Đã xóa danh mục");
      setDeletingCat(null);
      router.refresh();
    } else {
      toast.error(result.error || "Xóa thất bại");
    }
  };

  // Group: parent categories first, then children
  const parentCats = categories.filter((c) => !c.parentId);
  const childrenMap = categories.reduce((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {} as Record<string, CategoryItem[]>);

  return (
    <>
      {showCreate && (
        <CategoryModal
          title="Tạo danh mục mới"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          loading={formLoading}
          categories={categories}
        />
      )}
      {editingCat && (
        <CategoryModal
          title="Chỉnh sửa danh mục"
          onClose={() => setEditingCat(null)}
          onSubmit={handleUpdate}
          loading={formLoading}
          editingId={editingCat.id}
          initialData={{
            name: editingCat.name,
            slug: editingCat.slug,
            description: editingCat.description || "",
            icon: editingCat.icon || "",
            parentId: editingCat.parentId || "",
          }}
          categories={categories}
        />
      )}
      {deletingCat && (
        <DeleteConfirm
          category={deletingCat}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCat(null)}
          loading={deleteLoading}
        />
      )}

      {/* Header with Add button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-stone-500">
          <span className="font-semibold text-stone-700">{categories.length}</span> danh mục
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Thêm danh mục
        </button>
      </div>

      {/* Category Grid */}
      <div className="space-y-3">
        {parentCats.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            {/* Parent Category Row */}
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">
                {cat.icon || "📂"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-800">{cat.name}</h3>
                  <span className="text-xs text-stone-400 font-mono">/{cat.slug}</span>
                </div>
                {cat.description && (
                  <p className="text-xs text-stone-500 truncate mt-0.5">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <BookOpen size={13} />
                  <span className="font-semibold text-stone-700">{cat._count.courses}</span> khóa học
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingCat(cat)}
                    className="p-2 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeletingCat(cat)}
                    className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Child Categories */}
            {childrenMap[cat.id]?.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-4 px-4 py-3 border-t border-stone-50 bg-stone-50/50 pl-14"
              >
                <ChevronRight size={14} className="text-stone-300 -ml-5 mr-1" />
                <div className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-base">
                  {child.icon || "📁"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-700">{child.name}</span>
                    <span className="text-xs text-stone-400 font-mono">/{child.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <BookOpen size={12} />
                    <span className="font-semibold text-stone-600">{child._count.courses}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingCat(child)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingCat(child)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <Tag size={32} className="text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">Chưa có danh mục nào</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Tạo danh mục đầu tiên
            </button>
          </div>
        )}
      </div>
    </>
  );
}
