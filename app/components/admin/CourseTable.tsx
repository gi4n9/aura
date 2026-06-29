"use client";

import { useState, useTransition } from "react";
import { adminUpdateCourseStatus } from "@/app/actions/admin";
import { CourseStatus } from "@prisma/client";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Globe,
  Archive,
  EyeOff,
  BookOpen,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type CourseItem = {
  id: string;
  title: string;
  status: CourseStatus;
  price: number;
  isFree: boolean;
  thumbnailUrl: string | null;
  createdAt: Date;
  instructor: { id: string; fullName: string | null; email: string; avatarUrl: string | null };
  category: { id: string; name: string } | null;
  _count: { enrollments: number; chapters: number };
};

interface CourseTableProps {
  courses: CourseItem[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  statusFilter: string;
}

const STATUS_CONFIG = {
  PUBLISHED: {
    label: "Đã xuất bản",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  DRAFT: {
    label: "Bản nháp",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  ARCHIVED: {
    label: "Lưu trữ",
    badge: "bg-stone-100 text-stone-500 border-stone-200",
    dot: "bg-stone-400",
  },
};

function StatusBadge({ status }: { status: CourseStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function CourseTable({
  courses,
  total,
  page,
  totalPages,
  search: initialSearch,
  statusFilter: initialStatus,
}: CourseTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const applyFilter = (newSearch: string, newStatus: string, newPage = 1) => {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newStatus && newStatus !== "ALL") params.set("status", newStatus);
    if (newPage > 1) params.set("page", String(newPage));
    startTransition(() => router.push(`/admin/courses?${params.toString()}`));
  };

  const handleStatusChange = async (courseId: string, newStatus: CourseStatus) => {
    setLoadingId(courseId);
    const result = await adminUpdateCourseStatus(courseId, newStatus);
    setLoadingId(null);
    if (result.success) {
      toast.success("Đã cập nhật trạng thái khóa học");
      router.refresh();
    } else {
      toast.error(result.error || "Cập nhật thất bại");
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter(search, statusFilter)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            applyFilter(search, e.target.value);
          }}
          className="px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PUBLISHED">Đã xuất bản</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
        <button
          onClick={() => applyFilter(search, statusFilter)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Tìm kiếm
        </button>
      </div>

      <p className="text-sm text-stone-500 mb-3">
        Hiển thị <span className="font-semibold text-stone-700">{courses.length}</span> / {total} khóa học
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-stone-50 text-stone-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Khóa học</th>
                <th className="px-5 py-3.5">Giảng viên</th>
                <th className="px-5 py-3.5">Danh mục</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-center">
                  <Users size={14} className="inline mr-1" />
                  Học viên
                </th>
                <th className="px-5 py-3.5">Giá</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-stone-50/70 transition-colors">
                  {/* Course */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-12 h-9 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <BookOpen size={14} className="text-blue-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-stone-800 max-w-[200px] truncate">
                          {course.title}
                        </p>
                        <p className="text-xs text-stone-400">{course._count.chapters} chương</p>
                      </div>
                    </div>
                  </td>

                  {/* Instructor */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {course.instructor.avatarUrl ? (
                        <img
                          src={course.instructor.avatarUrl}
                          className="w-7 h-7 rounded-full object-cover"
                          alt={course.instructor.fullName || ""}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
                          {(course.instructor.fullName || course.instructor.email)[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-stone-600 max-w-[120px] truncate">
                        {course.instructor.fullName || course.instructor.email}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-4">
                    {course.category ? (
                      <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                        {course.category.name}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusBadge status={course.status} />
                  </td>

                  {/* Enrollments */}
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-semibold text-stone-700">
                      {course._count.enrollments}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-5 py-4">
                    {course.isFree ? (
                      <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-semibold">
                        Miễn phí
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-stone-700">
                        {new Intl.NumberFormat("vi-VN").format(course.price)}₫
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {loadingId === course.id ? (
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                      ) : (
                        <>
                          {course.status !== "PUBLISHED" && (
                            <button
                              onClick={() => handleStatusChange(course.id, "PUBLISHED")}
                              title="Xuất bản"
                              className="p-2 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <Globe size={15} />
                            </button>
                          )}
                          {course.status === "PUBLISHED" && (
                            <button
                              onClick={() => handleStatusChange(course.id, "DRAFT")}
                              title="Chuyển về nháp"
                              className="p-2 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <EyeOff size={15} />
                            </button>
                          )}
                          {course.status !== "ARCHIVED" && (
                            <button
                              onClick={() => handleStatusChange(course.id, "ARCHIVED")}
                              title="Lưu trữ"
                              className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                            >
                              <Archive size={15} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400 text-sm">
                    Không tìm thấy khóa học nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-100 bg-stone-50/50">
            <span className="text-sm text-stone-500">Trang {page} / {totalPages}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => applyFilter(search, statusFilter, page - 1)}
                disabled={page <= 1 || isPending}
                className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => applyFilter(search, statusFilter, page + 1)}
                disabled={page >= totalPages || isPending}
                className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-white disabled:opacity-40"
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
