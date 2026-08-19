"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { motion } from "framer-motion";

interface CourseItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  price: any;
  organization?: { name: string } | null;
  instructor?: { fullName: string | null; avatarUrl: string | null } | null;
  _count: { chapters: number };
}

const DEFAULT_PLACEHOLDER = "https://placehold.co/600x400/0a0a0a/C5A059?text=Aura";

function FeaturedCourseCardItem({ course, i, isDark, t, language }: { course: CourseItem; i: number; isDark: boolean; t: any; language: string }) {
  const [imgSrc, setImgSrc] = useState<string>(course.thumbnailUrl || DEFAULT_PLACEHOLDER);

  return (
    <motion.div
      key={course.id}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/courses/${course.id}`}
        className={`group flex flex-col rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 liquid-glass ${
          isDark
            ? "text-white hover:shadow-[0_20px_60px_rgba(197,160,89,0.15)]"
            : "text-stone-900 shadow-md hover:shadow-xl"
        }`}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
          <Image
            src={imgSrc}
            alt={course.title}
            fill
            onError={() => setImgSrc(DEFAULT_PLACEHOLDER)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100 saturate-75 group-hover:saturate-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Org badge */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
            <span className="text-[9px] font-bold tracking-widest uppercase text-stone-300">
              {course.organization?.name || (language === "vi" ? "Miễn phí" : "Free")}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-grow p-5">
          <h3 className={`font-serif text-base leading-snug mb-3 group-hover:text-[#C5A059] transition-colors line-clamp-2 ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            {course.title}
          </h3>
          <div className={`w-6 h-px mb-4 group-hover:bg-[#C5A059]/40 transition-colors ${
            isDark ? "bg-white/10" : "bg-stone-200"
          }`} />

          <div className="mt-auto space-y-4">
            {/* Instructor */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-stone-200 bg-stone-800 flex-shrink-0">
                <Image
                  src={course.instructor?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                  alt={`Ảnh đại diện của ${course.instructor?.fullName || "giảng viên"}`}
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>
              <div>
                <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                  isDark ? "text-stone-500" : "text-stone-400"
                }`}>{t("courses.instructor")}</span>
                <span className={`text-xs font-medium font-serif italic ${
                  isDark ? "text-stone-300" : "text-stone-700"
                }`}>
                  {course.instructor?.fullName || "Alpha Team"}
                </span>
              </div>
            </div>

            {/* Footer stats */}
            <div className={`flex items-center justify-between pt-3 border-t text-xs ${
              isDark ? "border-white/5 text-stone-500" : "border-stone-100 text-stone-500"
            }`}>
              <div className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-[#C5A059]" />
                <span>{course._count.chapters} {t("courses.chapters")}</span>
              </div>
              <div className={`font-bold text-xs ${isDark ? "text-white" : "text-stone-900"}`}>
                {Number(course.price) === 0
                  ? t("courses.free")
                  : new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", {
                      style: "currency",
                      currency: language === "vi" ? "VND" : "USD",
                    }).format(Number(course.price))}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function FeaturedCoursesClient({ courses }: { courses: CourseItem[] }) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className={`py-28 transition-colors duration-500 border-t relative overflow-hidden ${
      isDark ? "bg-[#0a0a0a] border-white/5 text-white" : "bg-[#F4F3EE] border-stone-200 text-stone-900"
    }`}>
      {/* Ambient */}
      <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none ${
        isDark ? "bg-[#C5A059]/4" : "bg-[#C5A059]/10"
      }`} />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 max-w-2xl"
        >
          <div className="inline-block mb-3 text-[10px] font-bold tracking-[0.25em] text-[#C5A059] uppercase border border-[#C5A059]/30 px-3 py-1 rounded-full">
            {t("courses.curriculumBadge")}
          </div>
          <h2 className={`font-serif text-[40px] md:text-[52px] mb-4 leading-[1] ${
            isDark ? "text-white" : "text-stone-900"
          }`}>
            {t("courses.featuredTitle")}
          </h2>
          <div className="w-12 h-px bg-[#C5A059] mb-4" />
          <p className={`text-base font-light leading-relaxed ${
            isDark ? "text-stone-400" : "text-stone-600"
          }`}>
            {t("courses.featuredSubtitle")}
          </p>
        </motion.div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {courses.map((course, i) => (
            <FeaturedCourseCardItem key={course.id} course={course} i={i} isDark={isDark} t={t} language={language} />
          ))}
        </div>

        {/* View All */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-14 text-center"
        >
          <Link
            href="/courses"
            className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase transition-colors group ${
              isDark ? "text-stone-500 hover:text-[#C5A059]" : "text-stone-600 hover:text-[#C5A059]"
            }`}
          >
            {t("courses.viewAllCurriculum")}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
