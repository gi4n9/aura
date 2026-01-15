import Header from "@/app/components/Header";
import React from "react";


export default function LearningLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-[#F9F8F4] ">
            <Header />
            <main className="flex-1 pt-80px">
                {children}
            </main>
        </div>
    );
}