"use client";

import { ArrowRight, Sparkles, Play, BookOpen, Users, Award, Clock, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as any },
  }),
};

export default function HeroSection() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`relative min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-500 ${
      isDark ? "bg-[#080808]" : "bg-[#F9F8F4]"
    }`}>
      {/* Cinematic Looping Background Video */}
      <video
        suppressHydrationWarning
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className={`absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0 w-[120%] h-[120%] pointer-events-none transition-all duration-700 ${
          isDark ? "opacity-35 mix-blend-screen" : "opacity-30 mix-blend-multiply"
        }`}
        style={{
          filter: isDark ? "none" : "invert(0.92) contrast(1.1) brightness(1.15)",
        }}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4"
      />

      {/* Ambient background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] ${
          isDark ? "bg-[#C5A059]/10" : "bg-[#C5A059]/15"
        }`} />
        <div className={`absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[80px] ${
          isDark ? "bg-[#C5A059]/5" : "bg-[#C5A059]/10"
        }`} />
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark ? "bg-gradient-to-r from-transparent via-[#C5A059]/20 to-transparent" : "bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent"
        }`} />
      </div>

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      />

      <div className="relative z-10 max-w-[1280px] w-full mx-auto px-6 md:px-10 pt-32 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left Content */}
          <div className="lg:col-span-7 flex flex-col items-start gap-8">
            {/* Badge */}
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full liquid-glass ${
                isDark
                  ? "text-[#C5A059]"
                  : "text-stone-900 shadow-sm"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                {t("hero.badge")}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
              <h1 className={`font-serif text-[52px] md:text-[72px] lg:text-[84px] leading-[0.95] tracking-tight ${
                isDark ? "text-white" : "text-stone-900"
              }`}>
                {t("hero.titlePrefix")}{" "}
                <span
                  className="block font-bold"
                  style={{
                    backgroundImage: isDark
                      ? "linear-gradient(135deg, #C5A059 0%, #e9c176 40%, #C5A059 100%)"
                      : "linear-gradient(135deg, #B08A42 0%, #D9B772 50%, #B08A42 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {t("hero.titleSuffix")}
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className={`text-base md:text-lg max-w-xl leading-relaxed font-light ${
                isDark ? "text-stone-300" : "text-stone-700"
              }`}
            >
              {t("hero.subtitle")}
            </motion.p>

            {/* CTAs */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/courses"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#C5A059] text-[#080808] rounded-full text-[11px] font-bold uppercase tracking-[0.18em] hover:bg-[#e9c176] transition-all duration-300 shadow-[0_0_30px_rgba(197,160,89,0.35)] hover:shadow-[0_0_50px_rgba(197,160,89,0.55)]"
              >
                {t("hero.exploreBtn")}
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/onboarding/study-plan"
                className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] transition-all duration-300 liquid-glass-strong ${
                  isDark
                    ? "text-white hover:bg-white/10"
                    : "text-stone-900 hover:bg-white/80 shadow-sm"
                }`}
              >
                <Play size={14} fill="currentColor" />
                {t("hero.aiStudyPlanBtn")}
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className={`flex items-center gap-8 pt-4 border-t w-full ${
                isDark ? "border-white/10" : "border-stone-300/60"
              }`}
            >
              {[
                { icon: <BookOpen size={16} />, value: "500+", label: t("hero.courses") },
                { icon: <Users size={16} />, value: "12K+", label: t("hero.learners") },
                { icon: <Award size={16} />, value: "98%", label: t("hero.satisfaction") },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-[#C5A059]">{stat.icon}</span>
                  <div>
                    <p className={`font-bold text-sm leading-none ${isDark ? "text-white" : "text-stone-900"}`}>{stat.value}</p>
                    <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${isDark ? "text-stone-400" : "text-stone-500"}`}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right – Bento Hero Cards with Liquid Glass */}
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="lg:col-span-5 grid grid-cols-2 gap-3"
          >
            {/* Card 1 – Large (Liquid Glass Gold) */}
            <div
              className={`col-span-2 relative rounded-2xl p-6 flex flex-col gap-3 transition-colors liquid-glass-gold ${
                isDark ? "text-white" : "text-stone-900"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
                <Sparkles size={20} />
              </div>
              <h3 className="font-serif text-xl leading-snug">{t("hero.aiTitle")}</h3>
              <p className={`text-sm leading-relaxed ${isDark ? "text-stone-300" : "text-stone-600"}`}>{t("hero.aiDesc")}</p>
              <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-stone-200"}`}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#C5A059] to-[#e9c176]"
                  initial={{ width: "0%" }}
                  animate={{ width: "72%" }}
                  transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
                />
              </div>
              <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>{t("hero.progress")} — 72%</p>
            </div>

            {/* Card 2 – Liquid Glass */}
            <div
              className={`relative rounded-2xl p-5 flex flex-col gap-2 transition-all liquid-glass hover:scale-[1.02] ${
                isDark ? "text-white" : "text-stone-900"
              }`}
            >
              <div className="text-[#C5A059] mb-1">
                <BookOpen size={18} />
              </div>
              <p className={`font-bold text-2xl font-serif ${isDark ? "text-white" : "text-stone-900"}`}>500+</p>
              <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>{t("hero.courses")}</p>
            </div>

            {/* Card 3 – Liquid Glass Strong */}
            <div
              className={`relative rounded-2xl p-5 flex flex-col gap-2 transition-all liquid-glass-gold hover:scale-[1.02] ${
                isDark ? "text-white" : "text-stone-900"
              }`}
            >
              <div className="text-[#C5A059] mb-1">
                <Users size={18} />
              </div>
              <p className={`font-bold text-2xl font-serif ${isDark ? "text-white" : "text-stone-900"}`}>12K+</p>
              <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>{t("hero.learners")}</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className={`absolute bottom-0 left-0 right-0 h-24 z-10 pointer-events-none ${
        isDark ? "bg-gradient-to-t from-[#080808] to-transparent" : "bg-gradient-to-t from-[#F9F8F4] to-transparent"
      }`} />
    </section>
  );
}