"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function WhyChooseUs() {
    const { t } = useLanguage();

    const features = [
        {
            id: 1,
            title: t("whyUs.aiTitle"),
            description: t("whyUs.aiDesc")
        },
        {
            id: 2,
            title: t("whyUs.roadmapTitle"),
            description: t("whyUs.roadmapDesc")
        },
        {
            id: 3,
            title: t("whyUs.certTitle"),
            description: t("whyUs.certDesc")
        }
    ];

    return (
        <section className="py-24 bg-nobel-dark text-stone-300">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="inline-block px-3 py-1 border border-nobel-gold text-nobel-gold text-[10px] font-bold tracking-[0.2em] uppercase rounded-full mb-6">
                        Aura Advantage
                    </span>
                    <h2 className="font-serif text-3xl md:text-5xl text-white mb-6">
                        {t("whyUs.title")}
                    </h2>
                    <p className="text-stone-400 font-light max-w-2xl mx-auto text-lg">
                        {t("whyUs.subtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={feature.id}
                            className="p-8 border border-stone-800 bg-stone-900/50 hover:border-nobel-gold/30 transition-colors rounded-xl"
                        >
                            <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-nobel-gold mb-6 font-serif font-bold text-xl border border-stone-700">
                                {index + 1}
                            </div>
                            <h3 className="font-serif text-xl text-white mb-3">
                                {feature.title}
                            </h3>
                            <p className="text-stone-400 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}