"use client";

import React from "react";

interface StaggeredTextProps {
    text: string;
    className?: string;
}

export default function StaggeredText({ text, className = "" }: StaggeredTextProps) {
    // Tách chuỗi thành mảng các ký tự
    const letters = text.split("");

    return (
        <div className={`group flex items-center overflow-hidden w-fit cursor-pointer ${className}`}>
            {letters.map((letter, index) => (
                <div
                    key={index}
                    className="relative overflow-hidden"
                >
                    {/* Layer 1: Ký tự gốc (sẽ bay lên trên khi hover) */}
                    <span
                        className="block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full"
                        style={{ transitionDelay: `${index * 0.025}s` }} // Độ trễ tăng dần
                    >
                        {/* Xử lý khoảng trắng: nếu là space thì dùng non-breaking space */}
                        {letter === " " ? "\u00A0" : letter}
                    </span>

                    {/* Layer 2: Ký tự thay thế (từ dưới bay lên) */}
                    <span
                        className="absolute inset-0 block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] translate-y-full group-hover:translate-y-0"
                        style={{ transitionDelay: `${index * 0.025}s` }} // Độ trễ tương tự
                    >
                        {letter === " " ? "\u00A0" : letter}
                    </span>
                </div>
            ))}
        </div>
    );
}