"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Sparkles, Target, Users, ShieldCheck, Cpu, Award, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const stats = [
    { label: t("about.statStudents", "Học viên tin tưởng"), value: "100.000+" },
    { label: t("about.statCourses", "Khóa học chuyên sâu"), value: "500+" },
    { label: t("about.statSatisfaction", "Hài lòng tuyệt đối"), value: "98%" },
    { label: t("about.statAi", "Đồng hành cùng AI"), value: "24/7" },
  ];

  const values = [
    {
      icon: Cpu,
      title: t("about.value1Title", "Đổi mới Tối thượng"),
      desc: t("about.value1Desc", "Tích hợp AI liên tục để nâng cao tốc độ tiếp thu kiến thức."),
    },
    {
      icon: ShieldCheck,
      title: t("about.value2Title", "Chất lượng Chuẩn mực"),
      desc: t("about.value2Desc", "Nội dung được biên soạn bởi các chuyên gia Senior hàng đầu."),
    },
    {
      icon: Users,
      title: t("about.value3Title", "Cộng đồng Đồng hành"),
      desc: t("about.value3Desc", "Học đi đôi với hành, cùng nhau giải đáp và nâng tầm sự nghiệp."),
    },
  ];

  const team = [
    {
      name: "Dr. Alex Vance",
      role: "Founder & Chief AI Architect",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    },
    {
      name: "Sarah Jenkins",
      role: "Head of Learning Experience",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    },
    {
      name: "Minh Tran",
      role: "Lead Curriculum Designer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    },
  ];

  return (
    <div className={`pt-28 pb-20 w-full min-h-screen transition-colors duration-500 ${isDark ? "bg-[#080808]" : "bg-[#F9F8F4]"}`}>
      {/* Hero Header */}
      <section className="py-16 px-6 max-w-5xl mx-auto text-center w-full">
        <div className={`inline-flex items-center gap-2 px-4 py-2 border rounded-full shadow-sm mb-6 ${isDark ? "bg-white/5 border-[#C5A059]/30" : "bg-white border-[#C5A059]/30"
          }`}>
          <Sparkles size={16} className="text-[#C5A059]" />
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-stone-300" : "text-stone-700"}`}>
            {t("about.heroBadge", "Về Aura Learning")}
          </span>
        </div>

        <h1 className={`font-serif text-4xl md:text-6xl font-bold leading-tight mb-6 tracking-tight ${isDark ? "text-white" : "text-stone-900"}`}>
          {t("about.heroTitle", "Sứ mệnh Kiến tạo Tương lai Giáo dục AI")}
        </h1>

        <p className={`text-lg md:text-xl font-light max-w-3xl mx-auto leading-relaxed ${isDark ? "text-stone-400" : "text-stone-600"}`}>
          {t("about.heroDesc", "Aura Learning kết hợp giữa tri thức chuẩn quốc tế và Trí tuệ Nhân tạo đột phá, mang đến trải nghiệm học tập cá nhân hóa vượt trội cho từng học viên.")}
        </p>
      </section>

      {/* Stats Section */}
      <section className={`py-12 border-y w-full ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-stone-200/80"}`}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center w-full">
          {stats.map((stat, idx) => (
            <div key={idx} className="p-6">
              <p className={`font-serif text-4xl md:text-5xl font-bold mb-2 ${isDark ? "text-white" : "text-stone-900"}`}>
                {stat.value}
              </p>
              <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-stone-500" : "text-stone-500"}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20 px-6 max-w-6xl mx-auto w-full">
        <div className={`rounded-3xl p-10 md:p-16 relative overflow-hidden shadow-2xl w-full ${isDark ? "bg-[#0e0e0e] text-white border-white/10" : "bg-[#F9F8F4] text- border-stone-800"}`}>
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#C5A059]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-3xl relative z-10">
            <div className={`w-14 h-14 rounded-full text-[#C5A059] flex items-center justify-center mb-8 border shadow-md ${isDark ? "bg-white/5 border-white/10" : "bg-stone-800 border-stone-700"
              }`}>
              <Target size={28} />
            </div>

            <h2 className={`font-serif text-3xl md:text-5xl font-bold mb-6 leading-tight ${isDark ? "text-white" : "text-[#0e0e0e]"
              }`}>
              {t("about.visionTitle", "Tầm nhìn & Sứ mệnh")}
            </h2>

            <p className={`text-lg md:text-xl leading-relaxed font-light mb-10 ${isDark ? "text-stone-300" : "text-stone-900"
              }`}>
              {t("about.visionDesc", "Xây dựng hệ sinh thái học tập thông minh hàng đầu, giúp mọi người dễ dàng tiếp cận công nghệ và phát triển sự nghiệp đỉnh cao.")}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/courses"
                className="px-8 py-4 bg-[#C5A059] text-stone-900 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#b08d47] transition-all shadow-lg inline-flex items-center gap-2"
              >
                {t("hero.exploreBtn", "Khám phá khóa học")}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <div className="inline-block mb-3 text-xs font-bold tracking-widest text-[#C5A059] uppercase">
            Aura Principles
          </div>
          <h2 className={`font-serif text-3xl md:text-5xl font-bold ${isDark ? "text-white" : "text-stone-900"}`}>
            {t("about.valuesTitle", "Giá trị Cốt lõi")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {values.map((val, idx) => {
            const Icon = val.icon;
            return (
              <div
                key={idx}
                className={`p-8 rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${isDark
                  ? "bg-white/[0.03] border-white/10 hover:border-[#C5A059]/40"
                  : "bg-white border-stone-200/80 hover:border-[#C5A059]/50"
                  }`}
              >
                <div>
                  <div className={`w-14 h-14 rounded-2xl text-[#C5A059] flex items-center justify-center mb-6 border shadow-inner ${isDark ? "bg-white/5 border-white/10" : "bg-[#F9F8F4] border-stone-200"
                    }`}>
                    <Icon size={28} />
                  </div>
                  <h3 className={`font-serif text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-stone-900"}`}>
                    {val.title}
                  </h3>
                  <p className={`text-sm leading-relaxed font-light ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                    {val.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-16 px-6 max-w-6xl mx-auto text-center w-full">
        <div className="inline-block mb-3 text-xs font-bold tracking-widest text-[#C5A059] uppercase">
          People Behind Aura
        </div>
        <h2 className={`font-serif text-3xl md:text-5xl font-bold mb-4 ${isDark ? "text-white" : "text-stone-900"}`}>
          {t("about.teamTitle", "Đội ngũ Sáng lập & Chuyên gia")}
        </h2>
        <p className={`max-w-xl mx-auto mb-16 text-base font-light ${isDark ? "text-stone-400" : "text-stone-600"}`}>
          {t("about.teamSubtitle", "Những con người tâm huyết dẫn dắt hành trình đổi mới giáo dục.")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {team.map((member, idx) => (
            <div
              key={idx}
              className={`p-8 rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center group ${isDark
                ? "bg-white/[0.03] border-white/10"
                : "bg-white border-stone-200/80"
                }`}
            >
              <div className="relative w-28 h-28 rounded-full overflow-hidden mb-6 border-2 border-[#C5A059] shadow-md group-hover:scale-105 transition-transform duration-300">
                <Image
                  src={member.avatar}
                  alt={member.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <h3 className={`font-serif text-xl font-bold mb-1 ${isDark ? "text-white" : "text-stone-900"}`}>
                {member.name}
              </h3>
              <p className="text-xs text-[#C5A059] font-bold uppercase tracking-wider">
                {member.role}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}