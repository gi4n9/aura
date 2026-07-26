"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { motion } from "framer-motion";

export default function WhyChooseUs() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const features = [
    {
      id: 1,
      title: t("whyUs.aiTitle"),
      description: t("whyUs.aiDesc"),
      number: "01",
    },
    {
      id: 2,
      title: t("whyUs.roadmapTitle"),
      description: t("whyUs.roadmapDesc"),
      number: "02",
    },
    {
      id: 3,
      title: t("whyUs.certTitle"),
      description: t("whyUs.certDesc"),
      number: "03",
    },
  ];

  return (
    <section className={`py-28 relative overflow-hidden transition-colors duration-500 ${
      isDark ? "bg-[#050505]" : "bg-[#F4F3EE]"
    }`}>
      {/* Decorative lines */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className={`absolute top-0 left-0 right-0 h-px ${
          isDark ? "bg-gradient-to-r from-transparent via-[#C5A059]/15 to-transparent" : "bg-gradient-to-r from-transparent via-[#C5A059]/25 to-transparent"
        }`} />
        <div className={`absolute bottom-0 left-0 right-0 h-px ${
          isDark ? "bg-gradient-to-r from-transparent via-white/5 to-transparent" : "bg-gradient-to-r from-transparent via-stone-300/40 to-transparent"
        }`} />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <span className="inline-block px-3 py-1 border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-bold tracking-[0.25em] uppercase rounded-full mb-6">
            Aura Advantage
          </span>
          <h2 className={`font-serif text-[40px] md:text-[56px] leading-[1] mb-6 ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            {t("whyUs.title")}
          </h2>
          <p className={`font-light max-w-2xl mx-auto text-base leading-relaxed ${
            isDark ? "text-stone-400" : "text-stone-600"
          }`}>
            {t("whyUs.subtitle")}
          </p>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: index * 0.12,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`group relative p-8 rounded-2xl border transition-all duration-500 overflow-hidden ${
                isDark
                  ? "border-white/6 bg-white/2 hover:border-[#C5A059]/25 hover:bg-white/4"
                  : "border-stone-200 bg-white hover:border-[#C5A059]/40 shadow-sm hover:shadow-md"
              }`}
              style={{ backdropFilter: "blur(8px)" }}
            >
              {/* Hover ambient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C5A059]/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Large number */}
              <div
                className="absolute top-4 right-6 font-serif text-[80px] leading-none font-bold select-none pointer-events-none"
                style={{
                  color: isDark ? "rgba(197,160,89,0.06)" : "rgba(197,160,89,0.12)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {feature.number}
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-full border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] font-serif font-bold text-sm mb-6 group-hover:bg-[#C5A059]/10 transition-colors">
                  {index + 1}
                </div>
                <h3 className={`font-serif text-xl mb-4 leading-snug ${
                  isDark ? "text-white" : "text-stone-900"
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-sm leading-relaxed font-light ${
                  isDark ? "text-stone-400" : "text-stone-600"
                }`}>
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}