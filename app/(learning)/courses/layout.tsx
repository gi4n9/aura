"use client";

import Header from "@/app/components/layout/Header";
import { usePathname } from "next/navigation";
import React from "react";

export default function LearningLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLessonPage = pathname.includes("/lessons/");

    if (isLessonPage) {
        return (
            <div className="min-h-screen bg-[#080808]">
                {children}
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F9F8F4] dark:bg-[#080808]">
            <Header />
            <main className="flex-1 pt-[72px]">
                {children}
            </main>
        </div>
    );
}