"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
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
                            Aura Learning
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

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center gap-4">
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
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}
