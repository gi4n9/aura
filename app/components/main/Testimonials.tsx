"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { motion } from "framer-motion";

const testimonials = [
  {
    id: 1,
    name: "Nguyễn Thị Hương",
    role: "Frontend Dev @ FPT",
    contentKey: "testimonials.story1",
    course: "React.js Masterclass",
    initials: "NH",
  },
  {
    id: 2,
    name: "Trần Văn Minh",
    role: "Fullstack Dev @ Shopee",
    contentKey: "testimonials.story2",
    course: "Node.js & Express",
    initials: "TM",
  },
  {
    id: 3,
    name: "Lê Thị Mai",
    role: "UI/UX Designer @ Tiki",
    contentKey: "testimonials.story3",
    course: "UI/UX Design",
    initials: "LM",
  },
];

const brands = ["Google", "Microsoft", "Amazon", "Spotify", "Tiki", "FPT"];

export default function Testimonials() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`py-28 relative overflow-hidden transition-colors duration-500 ${
      isDark ? "bg-[#080808]" : "bg-[#F9F8F4]"
    }`}>
      {/* Ambient */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[120px] pointer-events-none ${
        isDark ? "bg-[#C5A059]/4" : "bg-[#C5A059]/10"
      }`} />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className={`font-serif text-[40px] md:text-[52px] mb-3 leading-[1] ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            {t("testimonials.title")}
          </h2>
          <p className={`text-[10px] font-bold tracking-[0.25em] uppercase ${
            isDark ? "text-stone-500" : "text-stone-400"
          }`}>
            {t("testimonials.subtitle")}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`relative rounded-2xl p-6 transition-all duration-400 overflow-hidden group liquid-glass hover:-translate-y-1 ${
                isDark
                  ? "text-white hover:shadow-[0_20px_50px_rgba(197,160,89,0.1)]"
                  : "text-stone-900 shadow-md hover:shadow-xl"
              }`}
            >
              {/* Quote mark */}
              <div
                className="absolute top-4 right-5 font-serif text-[64px] leading-none select-none pointer-events-none"
                style={{ color: isDark ? "rgba(197,160,89,0.08)" : "rgba(197,160,89,0.15)" }}
              >
                "
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#C5A059]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Content */}
              <p className={`font-serif text-sm italic leading-relaxed mb-6 relative z-10 ${
                isDark ? "text-stone-300" : "text-stone-700"
              }`}>
                &ldquo;{t(testimonial.contentKey as any)}&rdquo;
              </p>

              {/* Footer */}
              <div className={`border-t pt-4 flex items-center justify-between relative z-10 ${
                isDark ? "border-white/5" : "border-stone-100"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/25 flex items-center justify-center text-[#C5A059] font-serif font-bold text-xs">
                    {testimonial.initials}
                  </div>
                  <div>
                    <h4 className={`font-bold text-xs ${isDark ? "text-white" : "text-stone-900"}`}>{testimonial.name}</h4>
                    <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-stone-500" : "text-stone-500"}`}>{testimonial.role}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 border text-[9px] font-bold uppercase tracking-wider rounded-full ${
                  isDark ? "border-white/10 text-stone-600" : "border-stone-200 text-stone-500 bg-stone-50"
                }`}>
                  {testimonial.course}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Brand logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className={`mt-20 pt-12 border-t text-center ${
            isDark ? "border-white/5" : "border-stone-200"
          }`}
        >
          <p className={`text-[10px] mb-8 font-bold uppercase tracking-[0.25em] ${
            isDark ? "text-stone-600" : "text-stone-400"
          }`}>
            {t("testimonials.trustedBy")}
          </p>
          <div className="flex flex-wrap justify-center gap-10 md:gap-16">
            {brands.map((brand) => (
              <span key={brand} className={`font-serif font-bold text-lg transition-colors select-none ${
                isDark ? "text-stone-700 hover:text-stone-500" : "text-stone-400 hover:text-stone-700"
              }`}>
                {brand}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}