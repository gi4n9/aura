"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface Props {
  usersByMonth: { month: string; count: number }[];
  roleDistribution: { role: string; count: number }[];
  courseStatusDist: { status: string; count: number }[];
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "#8b5cf6",
  INSTRUCTOR: "#3b82f6",
  ADMIN: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "#10b981",
  DRAFT: "#f59e0b",
  ARCHIVED: "#94a3b8",
};

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Học sinh",
  INSTRUCTOR: "Giảng viên",
  ADMIN: "Quản trị",
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Đã xuất bản",
  DRAFT: "Bản nháp",
  ARCHIVED: "Đã lưu trữ",
};

export default function AdminDashboardClient({ usersByMonth, roleDistribution, courseStatusDist }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Users Growth Chart */}
      <div className="xl:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-stone-800 mb-1">Người dùng mới</h3>
        <p className="text-sm text-stone-500 mb-5">6 tháng gần nhất</p>
        {usersByMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={usersByMonth} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 13 }}
                formatter={(v: any) => [`${v} người`, "Người dùng mới"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#colorUsers)"
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-stone-400 text-sm">
            Chưa có dữ liệu
          </div>
        )}
      </div>

      {/* Role Distribution Pie */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-stone-800 mb-1">Phân bố vai trò</h3>
        <p className="text-sm text-stone-500 mb-4">Tỷ lệ User theo role</p>
        {roleDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={roleDistribution.map((r) => ({ ...r, name: ROLE_LABELS[r.role] || r.role }))}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="count"
                paddingAngle={3}
              >
                {roleDistribution.map((entry) => (
                  <Cell
                    key={entry.role}
                    fill={ROLE_COLORS[entry.role] || "#94a3b8"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 13 }}
                formatter={(v: any, name: any) => [`${v} người`, name]}
              />
              <Legend
                formatter={(value) => <span style={{ fontSize: 12, color: "#64748b" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-stone-400 text-sm">
            Chưa có dữ liệu
          </div>
        )}
      </div>

      {/* Course Status Bar Chart */}
      <div className="xl:col-span-3 bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h3 className="text-base font-semibold text-stone-800 mb-1">Trạng thái khóa học</h3>
        <p className="text-sm text-stone-500 mb-5">Phân bố theo trạng thái xuất bản</p>
        {courseStatusDist.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={courseStatusDist.map((d) => ({
                name: STATUS_LABELS[d.status] || d.status,
                count: d.count,
                fill: STATUS_COLORS[d.status] || "#94a3b8",
              }))}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 13 }}
                formatter={(v: any) => [`${v} khóa học`]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {courseStatusDist.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-stone-400 text-sm">
            Chưa có dữ liệu
          </div>
        )}
      </div>
    </div>
  );
}
