"use client";
import React from "react";

interface RollingTextProps {
    text: string;
    className?: string; // Để bạn tùy chỉnh font, màu, size
}

export default function RollingText({ text, className = "" }: RollingTextProps) {
    return (
        <div className={`group relative cursor-pointer overflow-hidden w-fit ${className}`}>
            {/* Container chứa nội dung:
        Dùng w-fit để khung bao vừa khít chữ.
        overflow-hidden: Quan trọng để cắt phần chữ chạy ra ngoài.
      */}

            {/* Dòng chữ 1 (Ban đầu nhìn thấy) */}
            <span className="block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full">
                {text}
            </span>

            {/* Dòng chữ 2 (Ban đầu ẩn ở dưới) */}
            <span className="absolute inset-0 block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] translate-y-full group-hover:translate-y-0">
                {text}
            </span>
        </div>
    );
}