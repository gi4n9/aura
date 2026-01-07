"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/login/action"; // 1. Import hàm signOut từ server action
import { useAuth } from "./AuthProvider";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user, isLoading } = useAuth();
  console.log("Header Client received user:", user);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20">
      <nav className=" mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-around h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center animate-pulse-glow">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text group-hover:opacity-80 transition-opacity">
              Aura
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/courses"
              className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
            >
              Khóa học
            </Link>
            <Link
              href="/categories"
              className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
            >
              Danh mục
            </Link>
            <Link
              href="/about"
              className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
            >
              Về chúng tôi
            </Link>
            <Link
              href="/contact"
              className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
            >
              Liên hệ
            </Link>
          </div>

          {/* Auth Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              // --- GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP ---
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {/* Lấy chữ cái đầu của email làm avatar */}
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[var(--neutral-700)]">
                    {user.email}
                  </span>
                </div>
                
                {/* Nút Đăng xuất gọi Server Action */}
                <form action={signOut}>
                  <button 
                    className="px-4 py-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors border border-red-100 hover:bg-red-50 rounded-full"
                  >
                    Đăng xuất
                  </button>
                </form>
              </div>
            ) : (
              // --- GIAO DIỆN KHI CHƯA ĐĂNG NHẬP ---
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-[var(--primary-500)] hover:text-[var(--primary-600)] font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2 rounded-full gradient-bg text-white font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
                >
                  Đăng ký miễn phí
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[var(--neutral-100)] transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--neutral-200)] animate-slide-up">
            <div className="flex flex-col gap-4">
              <Link
                href="/courses"
                className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
              >
                Khóa học
              </Link>
              <Link
                href="/categories"
                className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
              >
                Danh mục
              </Link>
              <Link
                href="/about"
                className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
              >
                Về chúng tôi
              </Link>
              <Link
                href="/contact"
                className="text-[var(--neutral-600)] hover:text-[var(--primary-500)] transition-colors font-medium"
              >
                Liên hệ
              </Link>
              
              <hr className="border-[var(--neutral-200)]" />
              
              {/* Mobile Auth Logic */}
              {user ? (
                 <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold">
                             {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--neutral-700)]">{user.email}</span>
                    </div>
                    <form action={signOut} className="w-full">
                        <button className="w-full text-left px-2 text-red-500 font-medium">
                            Đăng xuất
                        </button>
                    </form>
                 </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-[var(--primary-500)] font-medium"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-2 rounded-full gradient-bg text-white font-medium text-center"
                  >
                    Đăng ký miễn phí
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}