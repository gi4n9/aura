"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CourseDescriptionProps {
    description: string;
}

export default function CourseDescription({ description }: CourseDescriptionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Fallback nếu không có mô tả
    if (!description) {
        return (
            <p className="text-stone-500 italic">Chưa có mô tả chi tiết cho khóa học này.</p>
        );
    }

    return (
        <div className="mb-8">
            <div
                className={`relative transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? "max-h-none" : "max-h-[180px]" // Giới hạn chiều cao khoảng bằng 1/2 hoặc 2/3 card bên phải
                    }`}
            >
                {/* whitespace-pre-line: Giúp hiển thị đúng các dấu xuống dòng (\n) từ dữ liệu cào 
            text-justify: Căn đều 2 bên cho đẹp
        */}
                <p className="text-lg text-stone-600 font-light leading-relaxed whitespace-pre-line text-justify">
                    {description}
                </p>

                {/* Lớp phủ mờ (Gradient Fade) khi chưa mở rộng */}
                {!isExpanded && (
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
                )}
            </div>

            {/* Nút Toggle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 flex items-center gap-1 text-sm font-bold text-[#C5A059] hover:text-stone-800 transition-colors uppercase tracking-wider group"
            >
                {isExpanded ? (
                    <>
                        Thu gọn <ChevronUp size={16} className="group-hover:-translate-y-1 transition-transform" />
                    </>
                ) : (
                    <>
                        Xem thêm <ChevronDown size={16} className="group-hover:translate-y-1 transition-transform" />
                    </>
                )}
            </button>
        </div>
    );
}