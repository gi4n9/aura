"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useTransition } from "react";
import { useAuth } from "../AuthProvider";
import { Menu, X, Search, LogOut, LayoutDashboard, Map, Settings, BookOpen, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "@/app/actions/auth";
import LoginModal from "../auth/LoginModal";
import RegisterModal from "../auth/RegisterModal";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import LanguageSwitcher from "../LanguageSwitcher";
import ThemeSwitcher from "../ThemeSwitcher";
import { toast } from "sonner";

export default function Header() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isPendingLogout, startTransitionLogout] = useTransition();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();

  const isDark = theme === "dark";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleSignOut = () => {
    startTransitionLogout(async () => {
      const res = await signOut();
      if (res?.success) {
        toast.success(t("auth.signedOutSuccess", "Đã đăng xuất thành công"));
        setIsDropdownOpen(false);
        router.refresh();
        if (res.redirectTo) {
          router.push(res.redirectTo);
        }
      }
    });
  };

  const paddingClass = isScrolled ? "py-2" : "py-4";
  const bgClass = (isScrolled || isMenuOpen)
    ? isDark
      ? "bg-[#0a0a0a]/95 shadow-[0_1px_0_rgba(197,160,89,0.15)] backdrop-blur-xl border-b border-white/5"
      : "bg-[#F9F8F4]/95 shadow-md backdrop-blur-xl border-b border-stone-200/80"
    : "bg-transparent border-b border-transparent";

  const menuTopPosition = isScrolled ? "top-[50px]" : "top-[64px]";
  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const avatarUrl = profile?.avatarUrl || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${bgClass} ${paddingClass}`}>
        <div className="container mx-auto px-6 flex justify-between items-center relative z-50">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setIsMenuOpen(false)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-base shadow-sm group-hover:opacity-80 transition-opacity ${
              isDark ? "bg-[#C5A059] text-[#080808]" : "bg-[#C5A059] text-white"
            }`}>
              α
            </div>
            <span className={`font-serif font-bold text-xl tracking-wide ${isDark ? "text-white" : "text-stone-900"}`}>
              Aura<span className={`font-normal italic text-lg ${isDark ? "text-stone-400" : "text-stone-500"}`}>Learning</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-2">
            {[
              { label: t("nav.courses"), href: "/courses" },
              { label: t("nav.categories"), href: "/categories" },
              { label: t("nav.community"), href: "/community" },
              { label: t("nav.about"), href: "/about" },
              { label: t("nav.contact"), href: "/contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-[11px] lg:text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300 ${
                  isDark
                    ? "text-stone-400 hover:bg-white/10 hover:text-white"
                    : "text-stone-600 hover:bg-stone-200/70 hover:text-stone-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* AUTH, THEME, LANGUAGE & SEARCH */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSwitcher />

            <button className={`transition-colors p-2 rounded-full ${
              isDark ? "text-stone-500 hover:text-white hover:bg-white/10" : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/70"
            }`}>
              <Search size={18} />
            </button>

            {user && (
              <Link
                href="/messages"
                className={`transition-colors p-2 rounded-full relative ${
                  isDark ? "text-stone-500 hover:text-white hover:bg-white/10" : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/70"
                }`}
                title={t("nav.messages")}
              >
                <MessageCircle size={20} />
              </Link>
            )}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                {/* AVATAR BUTTON */}
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`flex items-center gap-2 pl-3 border-l focus:outline-none ${
                  isDark ? "border-white/10" : "border-stone-300"
                }`}>
                  <div className="text-right hidden xl:block">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>{t("nav.account")}</p>
                  </div>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.fullName || user.email || "Avatar"}
                      className="w-9 h-9 rounded-full object-cover border border-[#C5A059] shadow-sm"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-serif font-bold text-sm border shadow-sm transition-all ${
                      isDark ? "bg-[#1a1a1a] border-[#C5A059]" : "bg-stone-800 border-[#C5A059]"
                    }`}>
                      {userInitial}
                    </div>
                  )}
                </button>

                {/* DROPDOWN MENU */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute right-0 mt-3 w-60 rounded-xl shadow-xl border overflow-hidden ${
                        isDark ? "bg-[#0e0e0e] border-white/10 text-white" : "bg-white border-stone-200 text-stone-900"
                      }`}
                    >
                      <div className={`p-4 border-b ${isDark ? "bg-white/5 border-white/5" : "bg-[#F9F8F4] border-stone-100"}`}>
                        <p className="font-bold truncate text-sm">{user.email}</p>
                        <p className="text-xs text-stone-500 font-serif italic">
                          {profile?.role === "INSTRUCTOR" ? t("nav.instructor") : profile?.role === "ADMIN" ? t("nav.admin") : "Learner"}
                        </p>
                      </div>

                      <div className="p-2 flex flex-col gap-1">
                        <Link href="/roadmap" onClick={() => setIsDropdownOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isDark ? "text-stone-300 hover:bg-white/5 hover:text-[#C5A059]" : "text-stone-600 hover:bg-stone-50 hover:text-[#C5A059]"
                        }`}>
                          <Map size={16} /> {t("nav.roadmap")}
                        </Link>
                        <Link href="/setting" onClick={() => setIsDropdownOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isDark ? "text-stone-300 hover:bg-white/5 hover:text-[#C5A059]" : "text-stone-600 hover:bg-stone-50 hover:text-[#C5A059]"
                        }`}>
                          <Settings size={16} /> {t("nav.settings")}
                        </Link>
                        {(profile?.role === "INSTRUCTOR" || profile?.role === "ADMIN") && (
                          <Link href="/instructor" onClick={() => setIsDropdownOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isDark ? "text-stone-300 hover:bg-white/5 hover:text-[#C5A059]" : "text-stone-600 hover:bg-stone-50 hover:text-[#C5A059]"
                          }`}>
                            <LayoutDashboard size={16} /> {t("nav.instructor")}
                          </Link>
                        )}
                      </div>

                      <div className={`p-2 border-t ${isDark ? "border-white/5" : "border-stone-100"}`}>
                        <button
                          onClick={handleSignOut}
                          disabled={isPendingLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LogOut size={16} />
                          {isPendingLogout ? t("common.loading") : t("nav.logout")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all focus:outline-none ${
                    isDark ? "text-stone-300 hover:text-white hover:bg-white/10" : "text-stone-700 hover:text-stone-900 hover:bg-stone-200/70"
                  }`}
                >
                  {t("nav.login")}
                </button>
                <button
                  onClick={() => setIsRegisterModalOpen(true)}
                  className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all focus:outline-none ${
                    isDark
                      ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176] shadow-[0_0_20px_rgba(197,160,89,0.35)]"
                      : "bg-stone-900 text-white hover:bg-stone-800 shadow-md"
                  }`}
                >
                  {t("nav.register")}
                </button>
              </div>
            )}
          </div>

          {/* MOBILE TOGGLE, THEME & LANG */}
          <div className="md:hidden flex items-center gap-2 relative z-50">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <button className={`p-2 rounded-md transition-colors ${
              isDark ? "text-white hover:bg-white/10" : "text-stone-900 hover:bg-stone-200/70"
            }`} onClick={toggleMenu}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className={`fixed inset-0 z-40 md:hidden ${menuTopPosition}`}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className={`relative border-t shadow-2xl p-6 flex flex-col gap-2 h-auto max-h-[80vh] overflow-y-auto rounded-b-2xl ${
              isDark ? "bg-[#0a0a0a] border-white/5" : "bg-[#F9F8F4] border-stone-200"
            }`}>
              {[
                { label: t("nav.courses"), href: "/courses" },
                { label: t("nav.categories"), href: "/categories" },
                { label: t("nav.community"), href: "/community" },
                { label: t("nav.about"), href: "/about" },
                { label: t("nav.contact"), href: "/contact" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className={`font-serif text-xl font-medium border-b py-3 block ${
                  isDark ? "text-stone-200 hover:text-[#C5A059] border-white/5" : "text-stone-800 hover:text-[#C5A059] border-stone-200/60"
                }`} onClick={() => setIsMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}

              <div className={`mt-6 pt-6 border-t ${isDark ? "border-white/10" : "border-stone-200"}`}>
                {user ? (
                  <div className="flex flex-col gap-4">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200"
                    }`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-[#C5A059]" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-serif font-bold text-base border border-[#C5A059]">
                          {userInitial}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className={`font-medium text-sm truncate ${isDark ? "text-white" : "text-stone-900"}`}>{user.email}</p>
                        <Link href="/profile" className="text-xs text-[#C5A059] hover:underline block">{t("nav.profile")}</Link>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      disabled={isPendingLogout}
                      className="w-full py-3 border border-red-500/30 rounded-lg text-red-500 font-bold uppercase text-[10px] tracking-wider hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut size={16} />
                      {isPendingLogout ? t("common.loading") : t("nav.logout")}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button onClick={() => { setIsLoginModalOpen(true); setIsMenuOpen(false); }} className={`w-full py-3 border rounded-lg font-bold uppercase text-[10px] tracking-wider transition-colors flex items-center justify-center ${
                      isDark ? "border-white/15 text-stone-300 hover:bg-white/5" : "border-stone-300 text-stone-700 hover:bg-stone-200/50"
                    }`}>
                      {t("nav.login")}
                    </button>
                    <button onClick={() => { setIsRegisterModalOpen(true); setIsMenuOpen(false); }} className={`w-full py-3 rounded-lg font-bold uppercase text-[10px] tracking-wider transition-colors flex items-center justify-center ${
                      isDark ? "bg-[#C5A059] text-[#080808] hover:bg-[#e9c176]" : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}>
                      {t("nav.register")}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
      />
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />
    </>
  );
}