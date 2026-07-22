"use client";

import { ArrowRight, Cpu, Microscope, Building2, Server } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Categories() {
  const { t } = useLanguage();

  return (
    <section className="py-24 px-4 md:px-10 bg-stone-50/50 border-y border-stone-200">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h3 className="font-serif text-[40px] font-bold text-stone-900 mb-4">{t("categories.title")}</h3>
          <p className="text-stone-600 leading-relaxed text-lg">
            {t("categories.subtitle")}
          </p>
        </div>
        
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[240px]">
          
          {/* Large Feature Card (Col span 2, Row span 2) */}
          <div className="md:col-span-2 md:row-span-2 bg-white/60 backdrop-blur-md rounded-2xl p-8 relative overflow-hidden group cursor-pointer border border-stone-200/60 hover:border-[#C5A059]/50 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C5A059]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="w-14 h-14 rounded-full bg-[#1a1a1a] text-[#C5A059] flex items-center justify-center shadow-lg">
                <Cpu size={28} />
              </div>
              <div>
                <h4 className="font-serif text-[28px] md:text-[32px] font-bold text-stone-900 mb-2 leading-tight">{t("categories.aiTitle")}</h4>
                <p className="text-stone-600 max-w-md leading-relaxed text-[15px]">
                  {t("categories.aiDesc")}
                </p>
              </div>
              <div className="mt-6 flex items-center text-[#C5A059] text-[12px] font-bold uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                {t("categories.exploreCurriculum")} <ArrowRight size={16} className="ml-2" />
              </div>
            </div>
          </div>
          
          {/* Small Card 1 */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group cursor-pointer border border-stone-200/60 hover:border-[#C5A059]/30 transition-all shadow-sm hover:shadow-md">
            <div className="relative z-10 flex flex-col h-full justify-between">
              <Building2 className="text-[#C5A059]" size={32} />
              <div>
                <h4 className="font-serif text-2xl font-bold text-stone-900 mb-1">{t("categories.econTitle")}</h4>
                <p className="text-sm text-stone-600">{t("categories.econDesc")}</p>
              </div>
            </div>
          </div>
          
          {/* Small Card 2 (Dark) */}
          <div className="bg-[#1a1a1a] rounded-2xl p-6 relative overflow-hidden group cursor-pointer hover:border-[#C5A059]/30 transition-all shadow-sm hover:shadow-md border border-transparent">
            <div className="absolute inset-0 bg-[#C5A059]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <Microscope className="text-[#C5A059]" size={32} />
              <div>
                <h4 className="font-serif text-2xl font-bold text-white mb-1">{t("categories.bioTitle")}</h4>
                <p className="text-sm text-stone-400">{t("categories.bioDesc")}</p>
              </div>
            </div>
          </div>
          
          {/* Medium Card (Col span 2) */}
          <div className="md:col-span-2 bg-white/60 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group cursor-pointer border border-stone-200/60 hover:border-[#C5A059]/30 transition-all shadow-sm hover:shadow-md flex items-center">
            <div className="relative z-10 flex items-center justify-between w-full">
              <div>
                <Server className="text-[#C5A059] mb-4 block" size={32} />
                <h4 className="font-serif text-2xl font-bold text-stone-900 mb-1">{t("categories.sysTitle")}</h4>
                <p className="text-sm text-stone-600">{t("categories.sysDesc")}</p>
              </div>
              <div className="w-12 h-12 rounded-full border border-[#C5A059]/30 flex items-center justify-center group-hover:bg-[#C5A059] group-hover:text-white transition-colors">
                <ArrowRight size={20} className="-rotate-45" />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}