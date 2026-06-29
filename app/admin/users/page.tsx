import { getAllUsers } from "@/app/actions/admin";
import UserTable from "@/app/components/admin/UserTable";
import { Users } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const role = params.role || "ALL";
  const page = parseInt(params.page || "1", 10);

  const result = await getAllUsers({ search, role, page, limit: 15 });

  const users = result.success ? result.data || [] : [];
  const total = result.success ? result.total || 0 : 0;
  const totalPages = result.success ? result.totalPages || 1 : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
          <Users size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Quản lý Người dùng</h1>
          <p className="text-sm text-stone-500">Quản lý tài khoản, role và quyền hạn</p>
        </div>
      </div>

      {/* Table Component (Client) */}
      <UserTable
        users={users as any}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        roleFilter={role}
      />
    </div>
  );
}