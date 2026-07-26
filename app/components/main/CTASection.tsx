"use client";

import { Award } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CTASection() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`py-36 px-6 md:px-10 relative overflow-hidden transition-colors duration-500 ${
      isDark ? "bg-[#050505]" : "bg-[#F4F3EE]"
    }`}>
      {/* Atmospheric glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[120px] pointer-events-none z-0 ${
        isDark ? "bg-[#C5A059]/8" : "bg-[#C5A059]/15"
      }`} />
      <div className={`absolute top-0 left-0 right-0 h-px ${
        isDark ? "bg-gradient-to-r from-transparent via-[#C5A059]/20 to-transparent" : "bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent"
      }`} />

      {/* Radial ring decoration */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border pointer-events-none z-0 ${
          isDark ? "border-[#C5A059]/6" : "border-[#C5A059]/15"
        }`}
        style={{ animation: "spin 30s linear infinite" }}
      />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border pointer-events-none z-0 ${
          isDark ? "border-[#C5A059]/4" : "border-[#C5A059]/10"
        }`}
        style={{ animation: "spin 20s linear infinite reverse" }}
      />

      <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-8"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-full border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] bg-[#C5A059]/8 shadow-sm">
            <Award size={28} strokeWidth={1.5} />
          </div>

          {/* Headline */}
          <h2 className={`font-serif text-[38px] md:text-[60px] font-bold leading-[1] tracking-tight ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            {t("cta.title")}
          </h2>

          {/* Subtitle */}
          <p className={`text-base max-w-xl leading-relaxed font-light ${
            isDark ? "text-stone-400" : "text-stone-600"
          }`}>
            {t("cta.subtitle")}
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/courses"
              className="px-10 py-4 bg-[#C5A059] text-white rounded-full text-[11px] font-bold tracking-[0.18em] uppercase hover:bg-[#b08d47] transition-all duration-300 shadow-[0_0_40px_rgba(197,160,89,0.35)] hover:shadow-[0_0_60px_rgba(197,160,89,0.55)]"
            >
              {t("cta.enrollNow")}
            </Link>
            <Link
              href="/courses"
              className={`px-10 py-4 rounded-full border text-[11px] font-bold tracking-[0.18em] uppercase transition-all duration-300 backdrop-blur-sm ${
                isDark
                  ? "border-white/10 bg-white/4 text-white hover:bg-white/8 hover:border-white/20"
                  : "border-[#C5A059]/40 bg-white/80 text-stone-900 hover:bg-white hover:border-[#C5A059] shadow-sm"
              }`}
            >
              {t("cta.pricingTiers")}
            </Link>
          </div>

          {/* Guarantee */}
          <p className={`text-[13px] ${isDark ? "text-stone-600" : "text-stone-500"}`}>{t("cta.guarantee")}</p>
        </motion.div>
      </div>
    </section>
  );
}