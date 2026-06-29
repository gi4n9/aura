import { getUserDetail } from "@/app/actions/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Calendar,
  BookOpen,
  FileText,
  GraduationCap,
  Shield,
  BadgeCheck,
  User,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ROLE_CONFIG = {
  ADMIN: { label: "Admin", icon: Shield, badge: "bg-red-100 text-red-700" },
  INSTRUCTOR: { label: "Giảng viên", icon: BadgeCheck, badge: "bg-blue-100 text-blue-700" },
  STUDENT: { label: "Học sinh", icon: User, badge: "bg-violet-100 text-violet-700" },
};

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getUserDetail(id);

  if (!result.success || !result.data) return notFound();

  const user = result.data;
  const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.STUDENT;
  const RoleIcon = roleConfig.icon;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ArrowLeft size={16} />
        Quay lại danh sách
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <div className="flex items-start gap-5">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName || "avatar"}
              className="w-20 h-20 rounded-2xl object-cover ring-2 ring-stone-100"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {(user.fullName || user.email)[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-stone-900">
                {user.fullName || "Chưa đặt tên"}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${roleConfig.badge}`}>
                <RoleIcon size={12} />
                {roleConfig.label}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Mail size={14} />
                {user.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Calendar size={14} />
                Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}
              </div>
            </div>
          </div>
          {/* Stats inline */}
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-stone-900">{user.enrollments?.length || 0}</p>
              <p className="text-xs text-stone-500">Đã đăng ký</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{user.submissions?.length || 0}</p>
              <p className="text-xs text-stone-500">Bài nộp</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{user.coursesCreated?.length || 0}</p>
              <p className="text-xs text-stone-500">Khóa học tạo</p>
            </div>
          </div>
        </div>

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wider">Sở thích học tập</p>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest: string) => (
                <span key={interest} className="px-2.5 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Enrolled Courses */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={18} className="text-violet-600" />
            <h2 className="font-semibold text-stone-800">Khóa học đang học</h2>
          </div>
          {user.enrollments && user.enrollments.length > 0 ? (
            <div className="space-y-3">
              {user.enrollments.slice(0, 8).map((enrollment: any) => (
                <div key={enrollment.id} className="flex items-center gap-3">
                  {enrollment.course.thumbnailUrl ? (
                    <img
                      src={enrollment.course.thumbnailUrl}
                      alt={enrollment.course.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                      <BookOpen size={14} className="text-stone-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{enrollment.course.title}</p>
                    <p className="text-xs text-stone-400">
                      {new Date(enrollment.joinedAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-600">{enrollment.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400 text-center py-6">Chưa đăng ký khóa học nào</p>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-blue-600" />
            <h2 className="font-semibold text-stone-800">Bài nộp gần đây</h2>
          </div>
          {user.submissions && user.submissions.length > 0 ? (
            <div className="space-y-3">
              {user.submissions.slice(0, 8).map((sub: any) => (
                <div key={sub.id} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {sub.isFinalized ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : sub.score !== null ? (
                      <Clock size={16} className="text-amber-500" />
                    ) : (
                      <XCircle size={16} className="text-stone-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 truncate">
                      {sub.question?.content?.slice(0, 60)}...
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {new Date(sub.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  {sub.score !== null && (
                    <span className={`text-xs font-bold ${sub.score >= 5 ? "text-emerald-600" : "text-red-500"}`}>
                      {sub.score}/10
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400 text-center py-6">Chưa có bài nộp nào</p>
          )}
        </div>

        {/* Courses Created (if instructor) */}
        {user.coursesCreated && user.coursesCreated.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-amber-600" />
              <h2 className="font-semibold text-stone-800">Khóa học đã tạo</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.coursesCreated.map((course: any) => (
                <div key={course.id} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                  <BookOpen size={16} className="text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{course.title}</p>
                    <p className="text-xs text-stone-500">{course._count.enrollments} học viên</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    course.status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700"
                      : course.status === "DRAFT"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-stone-100 text-stone-600"
                  }`}>
                    {course.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
