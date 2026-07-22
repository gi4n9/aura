"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Globe, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors border border-stone-200 focus:outline-none"
        title="Đổi ngôn ngữ / Change language"
        aria-label="Select language"
      >
        <Globe size={14} className="text-teal-600" />
        <span>{currentOption.flag} {currentOption.code.toUpperCase()}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden z-50 py-1"
          >
            {options.map((option) => (
              <button
                key={option.code}
                onClick={() => handleSelectLanguage(option.code)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-colors ${
                  language === option.code
                    ? "bg-teal-50 text-teal-800 font-semibold"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{option.flag}</span>
                  <span>{option.label}</span>
                </div>
                {language === option.code && <Check size={14} className="text-teal-600" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
