"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Video,
  Settings,
  LogOut,
  UploadCloud,
  MessageSquare,
  BookOpen,
  Tag,
  UserCog,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Role = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export default function DashboardSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Menu cho Admin
  const adminLinks = [
    { name: t("adminPortal.dashboard", "Tổng quan"), href: "/admin", icon: LayoutDashboard },
    { name: t("adminPortal.users", "Quản lý Users"), href: "/admin/users", icon: Users },
    { name: t("adminPortal.courses", "Quản lý Khóa học"), href: "/admin/courses", icon: BookOpen },
    { name: t("categories.title", "Quản lý Danh mục"), href: "/admin/categories", icon: Tag },
    { name: t("adminPortal.settings", "Cài đặt"), href: "/admin/settings", icon: Settings },
    { name: t("nav.profile", "Thông tin quản trị"), href: "/admin/profile", icon: UserCog },
  ];

  // Menu cho Instructor
  const instructorLinks = [
    { name: t("adminPortal.analytics", "Thống kê"), href: "/instructor", icon: LayoutDashboard },
    { name: t("nav.myCourses", "Kho bài giảng"), href: "/instructor/courses", icon: Video },
    { name: "Upload Video", href: "/instructor/upload", icon: UploadCloud },
    { name: t("nav.messages", "Tin nhắn & Hỗ trợ"), href: "/instructor/messages", icon: MessageSquare },
    { name: t("nav.profile", "Thông tin cá nhân"), href: "/instructor/profile", icon: Users }
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
          onClick={async () => {
            const res = await signOut();
            if (res?.success) {
              toast.success(t("nav.logout", "Đã đăng xuất thành công"));
            }
          }}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-900/20 text-stone-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={20} />
          {t("nav.logout", "Đăng xuất")}
        </button>
      </div>
    </div>
  );
}