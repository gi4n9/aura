import { Award } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-32 px-4 md:px-10 relative overflow-hidden bg-[#1a1a1a]">
      {/* Atmospheric glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[#C5A059]/10 blur-[100px] rounded-full pointer-events-none z-0"></div>
      
      <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
        <div className="text-[#C5A059] mb-6">
          <Award size={56} strokeWidth={1.5} />
        </div>
        
        <h2 className="font-serif text-[40px] md:text-[56px] font-bold text-white mb-6 leading-tight tracking-tight">
          Begin Your Pursuit of Excellence
        </h2>
        
        <p className="text-lg text-stone-300 max-w-2xl mb-12 leading-relaxed">
          Join an exclusive cohort of dedicated learners. Access our premium AI-driven platform and transform your educational trajectory today.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
          <button className="px-10 py-5 bg-[#C5A059] text-stone-900 rounded-[4px] text-[12px] font-bold tracking-widest uppercase hover:scale-[0.98] transition-transform shadow-[0_0_30px_rgba(197,160,89,0.3)]">
            Enroll Now
          </button>
          <button className="px-10 py-5 bg-[#1a1a1a]/80 backdrop-blur-md border border-[#C5A059]/50 text-white rounded-[4px] text-[12px] font-bold tracking-widest uppercase hover:bg-white/10 transition-colors">
            View Pricing Tiers
          </button>
        </div>
        
        <p className="mt-8 text-[14px] text-stone-500">
          Secure checkout. 14-day intellectual satisfaction guarantee.
        </p>
      </div>
    </section>
  );
}