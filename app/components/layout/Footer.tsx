"use client";

import Link from "next/link";
import { Facebook, Github, Youtube, Mail } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";

export default function Footer() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className={`py-20 border-t relative overflow-hidden transition-colors duration-500 ${
      isDark
        ? "bg-[#050505] text-stone-500 border-white/5"
        : "bg-[#141414] text-stone-400 border-stone-800"
    }`}>
      {/* Ambient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#C5A059]/20 to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-[#C5A059] rounded-full flex items-center justify-center text-[#080808] font-serif font-bold text-lg">
                α
              </div>
              <span className="font-serif font-bold text-xl text-white">
                Aura<span className="font-normal text-stone-500 italic text-lg">Learning</span>
              </span>
            </Link>
            <p className="text-sm font-light leading-relaxed opacity-80 mb-6">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              {[Facebook, Github, Youtube, Mail].map((Icon, idx) => (
                <a key={idx} href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#C5A059] hover:border-[#C5A059] hover:text-[#080808] transition-all">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-white font-serif font-bold mb-6">{t("footer.quickLinks")}</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/courses" className="hover:text-[#C5A059] transition-colors">{t("nav.courses")}</Link></li>
              <li><Link href="/categories" className="hover:text-[#C5A059] transition-colors">{t("nav.categories")}</Link></li>
              <li><Link href="/community" className="hover:text-[#C5A059] transition-colors">{t("nav.community")}</Link></li>
              <li><Link href="/roadmap" className="hover:text-[#C5A059] transition-colors">{t("nav.roadmap")}</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-white font-serif font-bold mb-6">{t("footer.support")}</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/about" className="hover:text-[#C5A059] transition-colors">{t("nav.about")}</Link></li>
              <li><Link href="/contact" className="hover:text-[#C5A059] transition-colors">{t("nav.contact")}</Link></li>
              <li><Link href="#" className="hover:text-[#C5A059] transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link href="#" className="hover:text-[#C5A059] transition-colors">{t("footer.terms")}</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-serif font-bold mb-6">{t("footer.contact")}</h4>
            <p className="text-xs mb-4 opacity-60">Aura Learning AI Platform</p>
            <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Email..."
                className="bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-stone-500"
              />
              <button className="bg-[#C5A059] text-[#080808] font-bold uppercase text-xs tracking-wider py-3 rounded-xl hover:bg-[#e9c176] transition-colors">
                {t("footer.subscribe")}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold tracking-widest uppercase ${
          isDark ? "border-white/5 text-stone-600" : "border-stone-800 text-stone-500"
        }`}>
          <p>{t("footer.copyright")}</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-[#C5A059] transition-colors">{t("footer.privacy")}</a>
            <a href="#" className="hover:text-[#C5A059] transition-colors">{t("footer.terms")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}