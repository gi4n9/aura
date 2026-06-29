"use client";

import { useState, useTransition } from "react";
import { updateUserRole, deleteUser } from "@/app/actions/admin";
import { UserRole } from "@prisma/client";
import {
  Shield,
  BadgeCheck,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Loader2,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type UserItem = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  _count: { enrollments: number; submissions: number; coursesCreated: number };
};

interface UserTableProps {
  users: UserItem[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  roleFilter: string;
}

const ROLE_CONFIG = {
  ADMIN: {
    label: "Admin",
    icon: Shield,
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  INSTRUCTOR: {
    label: "Giảng viên",
    icon: BadgeCheck,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  STUDENT: {
    label: "Học sinh",
    icon: User,
    badge: "bg-gray-50 text-gray-600 border-gray-200",
  },
};

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h3 className="font-semibold text-stone-900">Xác nhận xóa</h3>
        </div>
        <p className="text-stone-600 text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserTable({
  users,
  total,
  page,
  totalPages,
  search: initialSearch,
  roleFilter: initialRole,
}: UserTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserItem | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const applyFilter = (newSearch: string, newRole: string, newPage = 1) => {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newRole && newRole !== "ALL") params.set("role", newRole);
    if (newPage > 1) params.set("page", String(newPage));
    startTransition(() => router.push(`/admin/users?${params.toString()}`));
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setChangingRoleId(userId);
    const result = await updateUserRole(userId, newRole);
    setChangingRoleId(null);
    if (result.success) {
      toast.success("Đã cập nhật role thành công");
      router.refresh();
    } else {
      toast.error(result.error || "Cập nhật thất bại");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setLoadingDelete(true);
    const result = await deleteUser(confirmDelete.id);
    setLoadingDelete(false);
    setConfirmDelete(null);
    if (result.success) {
      toast.success("Đã xóa người dùng");
      router.refresh();
    } else {
      toast.error(result.error || "Xóa thất bại");
    }
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message={`Bạn chắc chắn muốn xóa "${confirmDelete.fullName || confirmDelete.email}"? Hành động này không thể hoàn tác.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={loadingDelete}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter(search, roleFilter)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            applyFilter(search, e.target.value);
          }}
          className="px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        >
          <option value="ALL">Tất cả roles</option>
          <option value="STUDENT">Học sinh</option>
          <option value="INSTRUCTOR">Giảng viên</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button
          onClick={() => applyFilter(search, roleFilter)}
          className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Tìm kiếm
        </button>
      </div>

      {/* Stats */}
      <p className="text-sm text-stone-500 mb-3">
        Hiển thị <span className="font-semibold text-stone-700">{users.length}</span> / {total} người dùng
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Người dùng</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5 text-center">Đăng ký</th>
                <th className="px-5 py-3.5 text-center">Bài nộp</th>
                <th className="px-5 py-3.5">Ngày tham gia</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50/70 transition-colors group">
                  {/* Avatar + Name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.fullName || "avatar"}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-stone-100"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {(u.fullName || u.email)[0].toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-stone-800 text-sm">
                        {u.fullName || "Chưa đặt tên"}
                      </span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-5 py-4 text-sm text-stone-600">{u.email}</td>

                  {/* Role Editor */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={u.role} />
                      {changingRoleId === u.id && (
                        <Loader2 size={14} className="animate-spin text-violet-500" />
                      )}
                    </div>
                    <select
                      value={u.role}
                      disabled={changingRoleId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="mt-1.5 text-xs border border-stone-200 rounded-lg px-2 py-1 text-stone-600 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white disabled:opacity-50"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="INSTRUCTOR">INSTRUCTOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>

                  {/* Enrollments */}
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-semibold text-stone-700">
                      {u._count.enrollments}
                    </span>
                  </td>

                  {/* Submissions */}
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-semibold text-stone-700">
                      {u._count.submissions}
                    </span>
                  </td>

                  {/* Join Date */}
                  <td className="px-5 py-4 text-sm text-stone-500">
                    {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="p-2 rounded-lg text-stone-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Xóa người dùng"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400 text-sm">
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-100 bg-stone-50/50">
            <span className="text-sm text-stone-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => applyFilter(search, roleFilter, page - 1)}
                disabled={page <= 1 || isPending}
                className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => applyFilter(search, roleFilter, page + 1)}
                disabled={page >= totalPages || isPending}
                className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
