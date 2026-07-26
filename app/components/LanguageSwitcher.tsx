"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Globe, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
    { code: "en", label: "English", flag: "🇬🇧" },
  ] as const;

  const currentOption = options.find((opt) => opt.code === language) || options[0];

  const handleSelectLanguage = (code: "vi" | "en") => {
    setLanguage(code);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="relative z-[90]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider focus:outline-none transition-all duration-300 liquid-glass hover:scale-105 ${
          isDark
            ? "text-stone-300 hover:border-[#C5A059]/60 hover:shadow-[0_0_15px_rgba(197,160,89,0.2)]"
            : "text-stone-700 hover:border-stone-400 hover:shadow-md"
        }`}
        title="Đổi ngôn ngữ / Change language"
        aria-label="Select language"
      >
        <Globe size={14} className={isDark ? "text-[#C5A059]" : "text-stone-700"} />
        <span>{currentOption.flag} {currentOption.code.toUpperCase()}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 mt-2 w-40 rounded-xl border overflow-hidden z-[100] py-1 shadow-xl ${
              isDark
                ? "bg-[#0e0e0e] border-white/10 text-white"
                : "bg-white border-stone-200 text-stone-900"
            }`}
          >
            {options.map((option) => (
              <button
                key={option.code}
                onClick={() => handleSelectLanguage(option.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-colors ${
                  language === option.code
                    ? isDark
                      ? "bg-[#C5A059]/20 text-[#C5A059] font-semibold"
                      : "bg-stone-100 text-stone-900 font-semibold"
                    : isDark
                      ? "text-stone-300 hover:bg-white/5"
                      : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{option.flag}</span>
                  <span>{option.label}</span>
                </div>
                {language === option.code && (
                  <Check size={14} className={isDark ? "text-[#C5A059]" : "text-stone-900"} />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
