import Header from "@/app/components/Header";
import React from "react";


export default function LearningLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-[#F9F8F4]">
            {/* Header được đặt ở đây. 
        Vì trong Header.tsx bạn để position: fixed, 
        nên nội dung bên dưới cần padding-top để không bị che khuất.
      */}
            <Header />

            {/* Main Content:
        - pt-[80px]: Tạo khoảng trống bên trên để tránh bị Header (fixed) che mất nội dung.
        - flex-1: Đẩy nội dung chiếm hết chiều cao còn lại.
      */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}