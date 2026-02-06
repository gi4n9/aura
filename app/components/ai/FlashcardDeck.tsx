"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Clock } from "lucide-react";

interface Flashcard {
    front: string;
    back: string;
    timestamp?: number;
}

interface FlashcardDeckProps {
    cards: Flashcard[] | null;
    onSeek: (seconds: number) => void;
}

export default function FlashcardDeck({ cards, onSeek }: FlashcardDeckProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (!cards || cards.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 p-8 text-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                    <RotateCw size={32} />
                </div>
                <p className="font-bold text-stone-600">Chưa có Flashcards</p>
                <p className="text-sm">Nội dung này chưa được tạo thẻ học tập AI.</p>
            </div>
        );
    }

    const currentCard = cards[currentIndex];

    const nextCard = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % cards.length);
        }, 300); // Wait for unflip animation
    };

    const prevCard = () => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
        }, 300);
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-[#F9F8F4]">
            {/* Progress */}
            <div className="w-full max-w-lg flex justify-between text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
                <span>Card {currentIndex + 1} / {cards.length}</span>
                {currentCard.timestamp && (
                    <button
                        onClick={() => onSeek(currentCard.timestamp!)}
                        className="flex items-center gap-1 hover:text-[#C5A059] transition-colors"
                    >
                        <Clock size={12} /> Jump to Video
                    </button>
                )}
            </div>

            {/* Card Container */}
            <div
                className="relative w-full max-w-lg aspect-[3/2] perspective-1000 cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? "rotate-y-180" : ""}`}>

                    {/* Front */}
                    <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-xl border border-stone-200 flex flex-col items-center justify-center p-8 text-center">
                        <span className="text-xs font-bold text-[#C5A059] uppercase tracking-widest mb-4">Question</span>
                        <h3 className="text-xl md:text-2xl font-serif font-bold text-stone-800">
                            {currentCard.front}
                        </h3>
                        <p className="absolute bottom-4 text-xs text-stone-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to flip
                        </p>
                    </div>

                    {/* Back */}
                    <div className="absolute w-full h-full backface-hidden bg-[#2C2C2C] text-white rounded-2xl shadow-xl rotate-y-180 flex flex-col items-center justify-center p-8 text-center overflow-y-auto custom-scrollbar">
                        <span className="text-xs font-bold text-[#C5A059] uppercase tracking-widest mb-4">Answer</span>
                        <p className="text-lg md:text-xl font-medium leading-relaxed">
                            {currentCard.back}
                        </p>
                    </div>

                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-8">
                <button
                    onClick={prevCard}
                    className="p-3 rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-[#C5A059] transition-all"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="flex gap-2">
                    {cards.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === currentIndex ? "bg-[#C5A059]" : "bg-stone-200"}`}
                        />
                    ))}
                </div>

                <button
                    onClick={nextCard}
                    className="p-3 rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-[#C5A059] transition-all"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
}
