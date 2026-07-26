"use client";

import React from "react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 focus:outline-none ${
        theme === "dark"
          ? "bg-white/10 text-[#C5A059] border border-white/10 hover:bg-white/15 hover:border-[#C5A059]/40"
          : "bg-stone-200/80 text-stone-800 border border-stone-300 hover:bg-stone-300/80"
      }`}
      title={theme === "dark" ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
      aria-label="Toggle theme"
    >
      <motion.div
        key={theme}
        initial={{ scale: 0.6, rotate: -90, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.6, rotate: 90, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {theme === "dark" ? (
          <Sun size={18} className="text-[#C5A059]" />
        ) : (
          <Moon size={18} className="text-stone-800" />
        )}
      </motion.div>
    </button>
  );
}
