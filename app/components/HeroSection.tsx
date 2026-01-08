"use client";

import Hero3D from "./Hero3D"; // Import component nền 3D vừa tạo
import { ArrowDown } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-nobel-cream">
      
      {/* 1. NỀN 3D (Nằm dưới cùng) */}
      <Hero3D />
      
      {/* 2. Lớp phủ Gradient để text dễ đọc hơn */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(249,248,244,0.92)_0%,rgba(249,248,244,0.6)_50%,rgba(249,248,244,0.3)_100%)]" />

      {/* 3. NỘI DUNG CHÍNH (Áp dụng Font & Màu mới) */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        
        {/* Badge nhỏ */}
        <div className="inline-block mb-4 px-3 py-1 border border-nobel-gold text-nobel-gold text-xs tracking-[0.2em] uppercase font-bold rounded-full backdrop-blur-sm bg-white/30 animate-fade-in">
          Aura • Learning Platform
        </div>
        
        {/* Tiêu đề lớn (Font Serif) */}
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium leading-tight mb-8 text-nobel-dark drop-shadow-sm">
          Aura Learning <br/>
          <span className="italic font-normal text-stone-500 text-3xl md:text-5xl block mt-4">
            AI for Modern Education
          </span>
        </h1>
        
        {/* Mô tả */}
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-stone-600 font-light leading-relaxed mb-12 font-sans">
          Hệ thống học tập thông minh, tích hợp AI để cá nhân hóa lộ trình và tối ưu hóa trải nghiệm giáo dục của bạn.
        </p>
        
        {/* Nút hành động */}
        <div className="flex justify-center gap-6">
           <button className="px-8 py-3 bg-nobel-dark text-black rounded-full font-medium tracking-wide hover:bg-stone-800 hover:text-white transition-all shadow-lg hover:shadow-xl">
              Bắt đầu ngay
           </button>
           <button className="group flex flex-col items-center justify-center gap-2 text-sm font-medium text-stone-500 hover:text-nobel-dark transition-colors">
              <span className="p-3 border border-stone-300 rounded-full group-hover:border-nobel-dark transition-colors bg-white/50 group-hover:bg-white">
                  <ArrowDown size={20} />
              </span>
           </button>
        </div>
      </div>
    </section>
  );
}