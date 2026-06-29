import { getAllCoursesAdmin } from "@/app/actions/admin";
import CourseTable from "@/app/components/admin/CourseTable";
import { BookOpen } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

export default async function AdminCoursesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "ALL";
  const page = parseInt(params.page || "1", 10);

  const result = await getAllCoursesAdmin({ search, status, page, limit: 15 });

  const courses = result.success ? result.data || [] : [];
  const total = result.success ? result.total || 0 : 0;
  const totalPages = result.success ? result.totalPages || 1 : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <BookOpen size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Quản lý Khóa học</h1>
          <p className="text-sm text-stone-500">Xem và kiểm duyệt tất cả khóa học trên nền tảng</p>
        </div>
      </div>

      <CourseTable
        courses={courses as any}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        statusFilter={status}
      />
    </div>
  );
}
