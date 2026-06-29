import { getAdminStats } from "@/app/actions/admin";
import AdminDashboardClient from "@/app/components/admin/AdminDashboardClient";
import { Users, BookOpen, TrendingUp, GraduationCap, ArrowUp } from "lucide-react";

export default async function AdminDashboard() {
  const result = await getAdminStats();

  const stats = result.success ? result.data : null;

  const statCards = [
    {
      label: "Tổng Người Dùng",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
      text: "text-violet-700",
      change: "+12%",
    },
    {
      label: "Khóa Học",
      value: stats?.totalCourses ?? 0,
      icon: BookOpen,
      color: "from-blue-500 to-cyan-600",
      bg: "bg-blue-50",
      text: "text-blue-700",
      change: "+5%",
    },
    {
      label: "Đăng Ký Học",
      value: stats?.totalEnrollments ?? 0,
      icon: GraduationCap,
      color: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      change: "+18%",
    },
    {
      label: "Doanh Thu (VND)",
      value: stats?.totalRevenue ?? 0,
      icon: TrendingUp,
      color: "from-amber-500 to-orange-600",
      bg: "bg-amber-50",
      text: "text-amber-700",
      change: "+8%",
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Dashboard Quản trị</h1>
        <p className="text-stone-500 mt-1">Tổng quan hệ thống Aura Learning Platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={22} className={card.text} />
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <ArrowUp size={12} />
                  {card.change}
                </span>
              </div>
              <div>
                <p className="text-sm text-stone-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-stone-900">
                  {card.isCurrency
                    ? new Intl.NumberFormat("vi-VN").format(card.value)
                    : card.value.toLocaleString()}
                  {card.isCurrency && <span className="text-base font-medium text-stone-400 ml-1">₫</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {stats && (
        <AdminDashboardClient
          usersByMonth={stats.usersByMonth}
          roleDistribution={stats.roleDistribution}
          courseStatusDist={stats.courseStatusDist}
        />
      )}
    </div>
  );
}