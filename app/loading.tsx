import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#F9F8F4]">
            <div className="flex flex-col items-center gap-4">
                {/* Logo hoặc Icon xoay */}
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-stone-200"></div>
                    <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-[#C5A059] border-t-transparent animate-spin"></div>
                </div>

                <p className="font-serif text-[#C5A059] font-bold animate-pulse tracking-widest text-sm">
                    AURA LEARNING...
                </p>
            </div>
        </div>
    );
}