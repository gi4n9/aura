"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const categories = [
  {
    slug: "ai",
    titleKey: "categories.aiTitle",
    descKey: "categories.aiDesc",
    span: "lg:col-span-2 lg:row-span-2",
    accent: true,
    icon: "✦",
  },
  {
    slug: "kinh-doanh",
    titleKey: "categories.econTitle",
    descKey: "categories.econDesc",
    span: "lg:col-span-1",
    accent: false,
    icon: "◈",
  },
  {
    slug: "lap-trinh",
    titleKey: "categories.bioTitle",
    descKey: "categories.bioDesc",
    span: "lg:col-span-1",
    accent: false,
    icon: "⬡",
  },
  {
    slug: "fullstack",
    titleKey: "categories.sysTitle",
    descKey: "categories.sysDesc",
    span: "lg:col-span-2",
    accent: false,
    icon: "◎",
  },
];

export default function Categories() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`py-28 px-6 md:px-10 relative overflow-hidden transition-colors duration-500 ${
      isDark ? "bg-[#080808]" : "bg-[#F9F8F4]"
    }`}>
      {/* Ambient */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-[150px] pointer-events-none ${
        isDark ? "bg-[#C5A059]/4" : "bg-[#C5A059]/10"
      }`} />

      <div className="max-w-[1280px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <span className="inline-block px-3 py-1 border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-bold tracking-[0.25em] uppercase rounded-full mb-6">
            {t("categories.exploreTitle")}
          </span>
          <h2 className={`font-serif text-[40px] md:text-[56px] leading-[1] mb-4 ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            {t("categories.title")}
          </h2>
          <p className={`leading-relaxed text-base font-light ${
            isDark ? "text-stone-400" : "text-stone-600"
          }`}>
            {t("categories.subtitle")}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 auto-rows-[200px]">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`${cat.span} relative rounded-2xl p-6 overflow-hidden group cursor-pointer border transition-all duration-500 ${
                isDark
                  ? cat.accent
                    ? "border-[#C5A059]/20 hover:border-[#C5A059]/50"
                    : "bg-white/2 border-white/6 hover:border-white/15"
                  : cat.accent
                    ? "border-[#C5A059]/40 hover:border-[#C5A059] bg-white shadow-md hover:shadow-xl"
                    : "bg-white border-stone-200/90 hover:border-[#C5A059]/40 shadow-sm hover:shadow-md"
              }`}
              style={
                isDark && cat.accent
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(255,255,255,0.02) 100%)",
                      backdropFilter: "blur(8px)",
                    }
                  : { backdropFilter: "blur(8px)" }
              }
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 bg-gradient-to-br from-[#C5A059]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <Link
                href={`/categories/${cat.slug}`}
                className="relative z-10 flex flex-col h-full justify-between"
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <span
                    className="text-2xl"
                    style={{ color: "#C5A059", fontFamily: "serif" }}
                  >
                    {cat.icon}
                  </span>
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                    isDark
                      ? "border-stone-700 text-stone-600 group-hover:border-[#C5A059] group-hover:text-[#C5A059]"
                      : "border-stone-300 text-stone-400 group-hover:border-[#C5A059] group-hover:text-[#C5A059]"
                  }`}>
                    <ArrowRight size={12} />
                  </div>
                </div>

                {/* Bottom */}
                <div>
                  <h4
                    className={`font-serif text-xl md:text-2xl font-bold mb-2 leading-snug transition-colors ${
                      isDark ? "text-white" : "text-stone-900"
                    } group-hover:text-[#C5A059]`}
                  >
                    {t(cat.titleKey as any)}
                  </h4>
                  <p
                    className={`text-sm leading-relaxed ${
                      isDark ? "text-stone-400" : "text-stone-600"
                    }`}
                  >
                    {t(cat.descKey as any)}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View all link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link
            href="/categories"
            className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase transition-colors group ${
              isDark ? "text-stone-500 hover:text-[#C5A059]" : "text-stone-600 hover:text-[#C5A059]"
            }`}
          >
            {t("categories.viewAll")}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}