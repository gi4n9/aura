"use client";

import React, { useState, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, RefreshCw, X, Maximize2 } from "lucide-react";

interface ImageZoomModalProps {
    src: string | null;
    alt?: string;
    onClose: () => void;
}

export default function ImageZoomModal({ src, alt = "Hình ảnh phóng to", onClose }: ImageZoomModalProps) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    // Reset transform when image changes
    useEffect(() => {
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    }, [src]);

    // Keyboard shortcuts (ESC to close, +/- to zoom)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "+" || e.key === "=") handleZoomIn();
            if (e.key === "-") handleZoomOut();
            if (e.key === "0") handleReset();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!src) return null;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    };

    // Wheel zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            handleZoomIn();
        } else {
            handleZoomOut();
        }
    };

    // Drag to pan
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoom > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div 
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none animate-fadeIn"
            onClick={onClose}
        >
            {/* Header / Controls Bar */}
            <div 
                className="absolute top-4 right-4 md:right-8 flex items-center gap-2 bg-stone-900/80 border border-white/15 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-lg z-50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-1 border-r border-white/15 pr-3 text-xs font-mono text-stone-300">
                    <span>{Math.round(zoom * 100)}%</span>
                </div>

                <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    title="Thu nhỏ (-)"
                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                    <ZoomOut size={18} />
                </button>

                <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 4}
                    title="Phóng to (+)"
                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                >
                    <ZoomIn size={18} />
                </button>

                <button
                    onClick={handleRotate}
                    title="Xoay ảnh 90°"
                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <RotateCw size={18} />
                </button>

                <button
                    onClick={handleReset}
                    title="Khôi phục kích thước ban đầu (0)"
                    className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <RefreshCw size={18} />
                </button>

                <div className="h-4 w-[1px] bg-white/15 mx-1" />

                <button
                    onClick={onClose}
                    title="Đóng (ESC)"
                    className="p-1.5 rounded-lg text-stone-300 hover:text-red-400 hover:bg-white/10 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Main Interactive Canvas */}
            <div 
                ref={containerRef}
                className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className="max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-75 rounded-xl shadow-2xl bg-white/5 border border-white/10"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                        cursor: zoom > 1 ? "grab" : "zoom-in"
                    }}
                    onClick={() => {
                        if (zoom === 1) handleZoomIn();
                    }}
                />
            </div>

            {/* Bottom Helper Hint */}
            <div className="absolute bottom-4 text-xs text-stone-400 bg-stone-900/60 border border-white/10 px-3 py-1.5 rounded-full pointer-events-none">
                Lăn chuột hoặc bấm +/- để phóng to/thu nhỏ • Kéo chuột để di chuyển • Bấm ESC để đóng
            </div>
        </div>
    );
}
