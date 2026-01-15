import { prisma } from "@/lib/prisma";
import { BadgeCheck, User, Shield } from "lucide-react";

export default async function AdminDashboard() {
  const users = await prisma.profile.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h2 className="text-3xl font-serif font-bold text-stone-800 mb-6">Quản lý người dùng</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-stone-50 text-stone-500 font-medium text-sm uppercase">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Ngày tham gia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-stone-50 transition">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold">
                    {u.fullName ? u.fullName[0].toUpperCase() : "U"}
                  </div>
                  <span className="font-semibold">{u.fullName || "Chưa đặt tên"}</span>
                </td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.role === "ADMIN" ? "bg-red-50 text-red-700 border-red-200" :
                    u.role === "INSTRUCTOR" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-gray-50 text-gray-600 border-gray-200"
                    }`}>
                    {u.role === "ADMIN" && <Shield size={12} />}
                    {u.role === "INSTRUCTOR" && <BadgeCheck size={12} />}
                    {u.role === "STUDENT" && <User size={12} />}
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-stone-400">
                  {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}