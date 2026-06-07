"use client";

import { ArrowRight, PlayCircle, Sparkles, TrendingUp } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="min-h-[870px] flex items-center justify-center relative overflow-hidden px-4 md:px-10 bg-nobel-cream pt-16">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 bg-[#C5A059]/10 pointer-events-none opacity-50 blur-3xl rounded-full translate-x-1/4 -translate-y-1/4 mix-blend-multiply"></div>
      
      <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
        
        {/* Left Content */}
        <div className="md:col-span-6 flex flex-col items-start gap-8 z-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md border border-[#C5A059]/30 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse"></span>
            <span className="text-[12px] font-bold text-stone-900 uppercase tracking-wider">AI-Powered Education</span>
          </div>
          
          <h2 className="font-serif text-[40px] md:text-[56px] lg:text-[64px] font-bold text-stone-900 leading-[1.1] tracking-tight">
            Illuminate Your <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C5A059] to-[#e9c176] font-bold">Intelligence</span>
          </h2>
          
          <p className="text-lg text-stone-600 max-w-lg leading-relaxed">
            Experience a premium, personalized learning journey. Our AI-driven roadmaps adapt to your unique pace, bridging the gap between traditional prestige and future-forward efficiency.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
            <button className="px-8 py-4 bg-[#C5A059] text-white rounded-[4px] text-xs font-bold uppercase tracking-widest hover:scale-[0.98] transition-transform shadow-lg shadow-[#C5A059]/20 flex items-center justify-center gap-2">
              Start Journey
              <ArrowRight size={18} />
            </button>
            <button className="px-8 py-4 bg-white/50 backdrop-blur-md border border-[#C5A059]/50 text-stone-900 rounded-[4px] text-xs font-bold uppercase tracking-widest hover:bg-white/80 transition-colors flex items-center justify-center gap-2">
              <PlayCircle size={18} />
              View Demo
            </button>
          </div>
        </div>

        {/* Right Content - 3D Card */}
        <div className="md:col-span-6 relative mt-12 md:mt-0 flex justify-center h-[500px] lg:h-[600px]" style={{ perspective: "1000px" }}>
          
          {/* Hero Image Card */}
          <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-white/40 backdrop-blur-md border border-stone-200/50 shadow-2xl transform rotate-y-12 hover:rotate-y-0 transition-transform duration-700 ease-out flex items-center justify-center" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-12deg)' }}>
            <img 
              alt="Abstract 3D geometric shapes glowing in gold and white" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJbzmQAjj_T7Mtmsv3Lv0TUt8PuzaV6502Cm_v9R3v5HFPstHDfdiUkZAjQRWS12EkBCSNw2A5QL1epE4aVEFsy0tJp4TA4JGZrLwy96ij6kOcqZ57GFGw6Ls4bb9K5EuHiuOHFV2rQcKaPtvnogEa0qgBLG-Q-l5GDgBQA1aMU2sUTBPb52kQG2UW4k7I9yYHWAG1NOtdwoI9stMsRu2gdAZuobCBxoY6pVwkXRySvVcYqg1Yg78L9fdTZzNYRr8KyFGLm7luSWd5"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#C5A059]/20 to-transparent z-10 mix-blend-overlay pointer-events-none"></div>
          </div>

          {/* Floating elements */}
          <div className="absolute -left-12 top-1/4 bg-white/70 backdrop-blur-md border border-stone-100 p-4 rounded-xl shadow-xl animate-[bounce_6s_ease-in-out_infinite] z-20 hidden lg:flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C5A059]/20 flex items-center justify-center text-[#C5A059]">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-stone-500 uppercase tracking-wider">Progress</p>
              <p className="font-serif text-2xl font-bold text-stone-900">+42%</p>
            </div>
          </div>
          
          <div className="absolute -right-8 bottom-1/4 bg-white/70 backdrop-blur-md border border-stone-100 p-4 rounded-xl shadow-xl animate-[bounce_5s_ease-in-out_infinite_reverse] z-20 hidden lg:flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#C5A059]">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-stone-500 uppercase tracking-wider">AI Insight</p>
              <p className="text-sm text-stone-900 font-semibold">Path Optimized</p>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}