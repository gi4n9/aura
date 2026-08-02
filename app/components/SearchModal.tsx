"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, PlayCircle, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { searchContent, SearchResult } from "@/app/actions/search";
import { useTheme } from "@/lib/theme/ThemeContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
      setResults(null);
      setSearched(false);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced Live Search as user types
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      setSearched(true);
      const res = await searchContent(query);
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    const res = await searchContent(query);
    if (res.success && res.data) {
      setResults(res.data);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 md:pt-24 px-4 pb-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full max-w-3xl rounded-2xl shadow-2xl border overflow-hidden z-10 flex flex-col max-h-[85vh] ${
              isDark
                ? "bg-[#0f141f] border-slate-800 text-slate-100"
                : "bg-white border-stone-200 text-stone-900"
            }`}
          >
            {/* Header / Search Form */}
            <div className={`p-4 border-b flex items-center gap-3 ${
              isDark ? "border-slate-800 bg-slate-900/50" : "border-stone-100 bg-stone-50/80"
            }`}>
              <Search size={22} className="text-[#C5A059] flex-shrink-0" />
              <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPage.placeholder", "Hỏi về nội dung bài học (VD: machine learning là gì?)...")}
                  className={`w-full bg-transparent text-base md:text-lg outline-none font-medium ${
                    isDark ? "text-slate-100 placeholder-slate-500" : "text-stone-900 placeholder-stone-400"
                  }`}
                />
                {loading && <Loader2 className="animate-spin text-[#C5A059] flex-shrink-0" size={20} />}
                <button
                  type="submit"
                  className="hidden md:inline-block px-4 py-1.5 rounded-lg bg-[#C5A059] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#d6af68] transition-colors"
                >
                  {t("hero.searchBtn", "Tìm kiếm")}
                </button>
              </form>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/60"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Results */}
            <div className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">
              {!searched && !query && (
                <div className={`text-center py-12 ${isDark ? "text-slate-400" : "text-stone-500"}`}>
                  <Search size={40} className="mx-auto mb-3 text-[#C5A059] opacity-80" />
                  <h3 className="font-serif font-bold text-lg mb-1">
                    {t("searchPage.title", "Tìm kiếm kiến thức thông minh")}
                  </h3>
                  <p className="text-xs md:text-sm text-stone-400 max-w-md mx-auto">
                    Nhập từ khóa hoặc câu hỏi kiến thức để tìm nhanh đoạn video bài giảng tương ứng.
                  </p>
                </div>
              )}

              {searched && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`font-bold text-xs uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-stone-500"
                    }`}>
                      {results?.length || 0} {t("searchPage.resultsCount", "Kết quả phù hợp")}
                    </h2>
                    {results && results.length > 0 && (
                      <span className="text-[11px] text-[#C5A059] font-medium bg-[#C5A059]/10 px-2.5 py-0.5 rounded-full">
                        {t("searchPage.highAccuracy", "Độ chính xác cao")}
                      </span>
                    )}
                  </div>

                  {results?.length === 0 && !loading && (
                    <div className={`text-center py-12 ${isDark ? "text-slate-500" : "text-stone-400"}`}>
                      <Search size={40} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm">{t("searchPage.notFound", "Không tìm thấy nội dung phù hợp.")}</p>
                    </div>
                  )}

                  <div className="grid gap-3">
                    {results?.map((item) => (
                      <Link
                        key={item.id}
                        href={`/courses/${item.lesson.chapter.course.id}/lessons/${item.lesson.id}?t=${Math.floor(item.startTime)}`}
                        onClick={onClose}
                        className="block group"
                      >
                        <div className={`rounded-xl p-4 border transition-all flex gap-4 items-start ${
                          isDark
                            ? "bg-slate-900/90 border-slate-800 hover:border-[#C5A059] hover:bg-slate-800/80"
                            : "bg-white border-stone-200/70 hover:border-[#C5A059] hover:bg-stone-50/80 shadow-sm"
                        }`}>
                          {/* Play Icon Badge */}
                          <div className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${
                            isDark ? "bg-slate-800 text-[#C5A059]" : "bg-stone-100 text-[#C5A059]"
                          }`}>
                            <PlayCircle size={26} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded">
                                {formatTime(item.startTime)}
                              </span>
                              <span className={`text-xs truncate max-w-[220px] ${
                                isDark ? "text-slate-400" : "text-stone-400"
                              }`}>
                                {item.lesson.chapter.course.title}
                              </span>
                            </div>

                            <h4 className={`font-bold text-sm md:text-base group-hover:text-[#C5A059] transition-colors mb-1 truncate ${
                              isDark ? "text-slate-100" : "text-stone-800"
                            }`}>
                              {item.lesson.title}
                            </h4>

                            <p className={`text-xs line-clamp-2 italic border-l-2 pl-2.5 ${
                              isDark ? "text-slate-300 border-slate-700" : "text-stone-600 border-stone-200"
                            }`}>
                              "...{item.content}..."
                            </p>
                          </div>

                          <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={18} className="text-[#C5A059]" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
