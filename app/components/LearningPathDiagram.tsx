"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code2, Database, Layout, Sparkles } from 'lucide-react';

export const LearningPathDiagram: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        setStep(s => (s + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { icon: Layout, label: "Frontend UI", color: "bg-blue-50 text-blue-600 border-blue-200" },
    { icon: Code2, label: "Logic JS", color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
    { icon: Database, label: "State & API", color: "bg-purple-50 text-purple-600 border-purple-200" },
    { icon: Sparkles, label: "Mastery", color: "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]" }
  ];

  return (
    <div className="flex flex-col items-center p-8 bg-[#F9F8F4] rounded-xl border border-stone-200 w-full max-w-2xl mx-auto shadow-sm">
      <h3 className="font-serif text-xl mb-2 text-stone-900">Adaptive Learning Path</h3>
      <p className="text-sm text-stone-500 mb-8 text-center max-w-md font-sans">
        Hệ thống tự động tối ưu hóa lộ trình dựa trên tiến độ thực tế của bạn.
      </p>

      <div className="flex items-center justify-between w-full relative px-4">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-stone-200 -z-0"></div>
        
        {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step >= i;
            const isCurrent = step === i;

            return (
                <div key={i} className="relative z-10 flex flex-col items-center gap-3">
                    <motion.div 
                        animate={{ 
                            scale: isCurrent ? 1.1 : 1,
                            borderColor: isActive ? (i === 3 ? '#C5A059' : '#1a1a1a') : '#e7e5e4'
                        }}
                        className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center bg-white transition-all duration-500 shadow-sm ${isActive ? 'opacity-100' : 'opacity-50 grayscale'}`}
                    >
                        <Icon size={24} className={isActive ? (i === 3 ? 'text-[#C5A059]' : 'text-stone-800') : 'text-stone-300'} />
                    </motion.div>
                    <span className={`text-[10px] uppercase font-bold tracking-widest ${isActive ? 'text-stone-800' : 'text-stone-400'}`}>
                        {s.label}
                    </span>
                </div>
            )
        })}
      </div>
    </div>
  );
};