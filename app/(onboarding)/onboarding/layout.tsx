"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Map,
    BookOpen,
    FileText,
    User,
    ArrowLeft,
    Bell,
    Search,
    ChevronDown
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import Image from "next/image";

// Sidebar Component
const Sidebar = () => {
    const pathname = usePathname();

    const menuItems = [
        { name: "Tổng quan", href: "/onboarding", icon: LayoutDashboard },
        { name: "Study plan", href: "/onboarding/study-plan", icon: Map },
        { name: "My courses", href: "/onboarding/courses", icon: BookOpen },
        { name: "Test Practice", href: "/onboarding/practice", icon: FileText },
        { name: "Learning Profile", href: "/onboarding/profile", icon: User },
    ];

    return (
        <div className="w-64 h-screen bg-[#1a1a1a] text-[#F9F8F4] border-r border-stone-800 flex flex-col fixed left-0 top-0 z-50">
            {/* Logo */}
            <div className="p-6 border-b border-stone-800">
                <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-[#C5A059]">
                    <div className="w-8 h-8 bg-[#C5A059] text-[#1a1a1a] flex items-center justify-center rounded-lg text-lg">
                        A
                    </div>
                    Aura
                </Link>
            </div>

            {/* Program Selector (Mock) */}
            <div className="px-4 mb-6 mt-6">
                <div className="text-xs text-stone-500 mb-2 font-medium uppercase tracking-wider">Chương trình</div>
                <button className="w-full flex items-center justify-between px-3 py-2 bg-stone-900 rounded-lg border border-stone-800 text-sm font-medium text-stone-300 hover:bg-stone-800 transition-colors">
                    <span>Software Engineer</span>
                    <ChevronDown size={16} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                ? "bg-[#C5A059] text-[#1a1a1a] font-bold"
                                : "hover:bg-stone-800 text-stone-400 hover:text-white"
                                }`}
                        >
                            <Icon size={20} className={isActive ? "text-[#1a1a1a]" : "text-stone-400 group-hover:text-white"} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 mt-auto border-t border-stone-800">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-medium text-stone-400 hover:text-[#C5A059] transition-colors px-4 py-2"
                >
                    <ArrowLeft size={18} />
                    Trở về trang chủ
                </Link>
            </div>
        </div>
    );
};

// Top Header Component
const Header = () => {
    const { profile } = useAuth();

    return (
        <header className="fixed top-0 right-0 left-64 h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-8 z-40">
            {/* Left: Search or Title */}
            <div className="flex items-center gap-4">
                {/* Breadcrumbs could go here */}
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-6">
                <button className="relative p-2 text-stone-400 hover:text-[#C5A059] transition-colors rounded-full hover:bg-stone-100">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-stone-200">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-stone-900 leading-tight">
                            {profile?.fullName || "Người dùng"}
                        </div>
                        <div className="text-xs text-[#C5A059] font-medium">
                            Sẵn sàng học tập!
                        </div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-stone-100 border-2 border-[#C5A059]/20 shadow-sm overflow-hidden relative">
                        {profile?.avatarUrl ? (
                            <Image src={profile.avatarUrl} alt="Avatar" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#C5A059] font-bold text-lg bg-[#1a1a1a]">
                                {(profile?.fullName?.[0] || "U").toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

// Main Layout
export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F9F8F4]">
            <Sidebar />
            <Header />

            {/* Main Content Area */}
            <main className="pl-64 pt-16 min-h-screen transition-all duration-300">
                <div className="container mx-auto p-8 max-w-7xl animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    );
}
