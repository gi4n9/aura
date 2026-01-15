"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Video,
  Settings,
  LogOut,
  UploadCloud
} from "lucide-react";
import { signOut } from "@/app/actions/auth";

type Role = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export default function DashboardSidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  // Menu cho Admin
  const adminLinks = [
    { name: "Tổng quan", href: "/admin", icon: LayoutDashboard },
    { name: "Quản lý Users", href: "/admin/users", icon: Users },
    { name: "Cài đặt", href: "/admin/settings", icon: Settings },
  ];

  // Menu cho Instructor
  const instructorLinks = [
    { name: "Thống kê", href: "/instructor", icon: LayoutDashboard },
    { name: "Kho bài giảng", href: "/instructor/courses", icon: Video },
    { name: "Upload Video", href: "/instructor/upload", icon: UploadCloud },
  ];

  const links = role === "ADMIN" ? adminLinks : instructorLinks;

  return (
    <div className="w-64 h-screen bg-[#1a1a1a] text-[#F9F8F4] flex flex-col fixed left-0 top-0 border-r border-stone-800">
      <div className="p-6 border-b border-stone-800">
        <h1 className="text-xl font-bold text-[#C5A059] flex items-center gap-2">
          Aura {role === "ADMIN" ? "Admin" : "Instructor"}
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                ? "bg-[#C5A059] text-[#1a1a1a] font-bold"
                : "hover:bg-stone-800 text-stone-400 hover:text-white"
                }`}
            >
              <Icon size={20} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-stone-800">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-900/20 text-stone-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}