"use client";

import React from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={`group relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 focus:outline-none liquid-glass hover:scale-105 ${
        isDark
          ? "text-[#C5A059] hover:border-[#C5A059]/60 hover:shadow-[0_0_15px_rgba(197,160,89,0.3)]"
          : "text-stone-700 hover:border-stone-400 hover:shadow-md"
      }`}
      title={isDark ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
      aria-label="Toggle theme"
    >
      <motion.div
        key={theme}
        initial={{ scale: 0.6, rotate: -90, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.6, rotate: 90, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {isDark ? (
          <Sun size={18} className="text-[#C5A059]" />
        ) : (
          <Moon size={18} className="text-stone-700" />
        )}
      </motion.div>
    </button>
  );
}
