"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signOut } from "@/app/login/action";
import { useAuth } from "./AuthProvider";
import { Menu, X, Search, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const paddingClass = isScrolled ? "py-2" : "py-4";
  
  const bgClass = (isScrolled || isMenuOpen) 
    ? "bg-[#F9F8F4] shadow-sm border-b border-stone-200" 
    : "bg-transparent border-b border-transparent";

  const menuTopPosition = isScrolled ? "top-[50px]" : "top-[64px]"; 

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${bgClass} ${paddingClass}`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center relative z-50">
          
          {/* --- LOGO --- */}
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setIsMenuOpen(false)}>
            <div className="w-8 h-8 bg-nobel-gold rounded-full flex items-center justify-center text-white font-serif font-bold text-base shadow-sm group-hover:bg-nobel-dark transition-colors">
              α
            </div>
            <span className="font-serif font-bold text-xl tracking-wide text-nobel-dark">
              Aura<span className="font-normal text-stone-500 italic text-lg">Learning</span>
            </span>
          </Link>

          {/* --- DESKTOP NAV --- */}
          <nav className="hidden md:flex items-center gap-2">
            {[
              { label: "Khóa học", href: "/courses" },
              { label: "Danh mục", href: "/categories" },
              { label: "Về chúng tôi", href: "/about" },
              { label: "Liên hệ", href: "/contact" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-full text-[11px] lg:text-xs font-bold tracking-[0.15em] uppercase text-stone-500 transition-all duration-300 hover:bg-stone-700 hover:text-white hover:shadow-md"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* --- AUTH & SEARCH --- */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-stone-400 hover:text-nobel-dark transition-colors p-2 rounded-full hover:bg-stone-200">
              <Search size={18} />
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-stone-200 h-8">
                <div className="flex items-center gap-2">
                  <div className="text-right hidden xl:block">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Account</p>
                  </div>
                  {/* --- NEW AVATAR STYLE --- */}
                  <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-serif font-bold text-sm border border-[#C5A059] shadow-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <form action={signOut}>
                  <button className="p-1.5 text-stone-400 hover:text-red-600 transition-colors" title="Đăng xuất">
                    <LogOut size={16} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-200 transition-all">
                  Đăng nhập
                </Link>
                <Link href="/register" className="px-5 py-2 bg-stone-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-stone-600 hover:shadow-md transition-all">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* --- MOBILE TOGGLE --- */}
          <button
            className="md:hidden text-nobel-dark p-2 rounded-md hover:bg-stone-100 transition-colors relative z-50"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* --- MOBILE MENU --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className={`fixed inset-0 z-40 md:hidden ${menuTopPosition}`}>
            
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
            />

            <motion.div 
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: -20, opacity: 0 }} 
                transition={{ duration: 0.3, ease: "easeOut" }} 
                className="relative bg-[#F9F8F4] border-t border-stone-200 shadow-xl p-6 flex flex-col gap-2 h-auto max-h-[80vh] overflow-y-auto rounded-b-2xl"
            >
                {[
                    { label: "Khóa học", href: "/courses" },
                    { label: "Danh mục", href: "/categories" },
                    { label: "Về chúng tôi", href: "/about" },
                    { label: "Liên hệ", href: "/contact" },
                ].map((link) => (
                    <Link
                    key={link.href}
                    href={link.href}
                    className="text-stone-800 font-serif text-xl font-medium hover:text-nobel-gold border-b border-stone-100 py-3 block"
                    onClick={() => setIsMenuOpen(false)}
                    >
                    {link.label}
                    </Link>
                ))}
                
                <div className="mt-6 pt-6 border-t border-stone-200">
                    {user ? (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-100">
                                {/* --- NEW MOBILE AVATAR STYLE --- */}
                                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-serif font-bold text-base border border-[#C5A059]">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-nobel-dark text-sm truncate">{user.email}</span>
                            </div>
                            <form action={signOut} className="w-full">
                                <button className="w-full py-3 border border-stone-300 rounded-lg text-stone-600 font-bold uppercase text-[10px] tracking-wider hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2">
                                    <LogOut size={16}/> Đăng xuất
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <Link
                                href="/login"
                                className="w-full py-3 text-center text-stone-600 font-bold uppercase text-[10px] tracking-wider border border-stone-300 rounded-lg hover:bg-stone-50"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Đăng nhập
                            </Link>
                            <Link
                                href="/register"
                                className="w-full py-3 text-center bg-nobel-dark text-white font-bold uppercase text-[10px] tracking-wider rounded-lg shadow-md hover:bg-stone-800"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Đăng ký miễn phí
                            </Link>
                        </div>
                    )}
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}