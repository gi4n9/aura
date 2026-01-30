"use client";

import { Canvas } from "@react-three/fiber";
import { Float, Environment, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import { Model as FloatingFoxModel } from "./Floating_fox";
import { Loader2 } from "lucide-react";

type MascotProps = {
    status: "ahead" | "behind" | "neutral";
    message?: string;
};

function Scene({ status }: { status: "ahead" | "behind" | "neutral" }) {
    const floatSpeed = status === "ahead" ? 2.5 : 1;
    const modelScale = 1.3;

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={70} />
            <ambientLight intensity={0.7} />
            <spotLight position={[5, 10, 5]} angle={0.25} penumbra={1} intensity={1.5} color="#fffcf0" />
            <pointLight position={[-5, 5, -5]} intensity={0.5} color="#e0f2fe" />

            <Environment preset="city" />

            <Float
                speed={floatSpeed}
                rotationIntensity={0}
                floatIntensity={0.6}
                floatingRange={[-0.2, 0.2]}
            >
                <group rotation={[0.2, 0, 0]} position={[0, 0.9, 0]}>
                    <FloatingFoxModel scale={modelScale} />
                </group>
            </Float>

        </>
    )
}

export default function Mascot({ status, message }: MascotProps) {

    const isBehind = status === "behind";
    const bubbleColor = isBehind
        ? "bg-blue-50 text-blue-600 border-blue-200"
        : "bg-amber-50 text-amber-700 border-[#C5A059]";

    return (
        <div className="w-full h-[350px] relative">

            <Canvas dpr={[1, 2]} gl={{ powerPreference: "default", antialias: true }}>
                <Suspense fallback={null}>
                    <Scene status={status} />
                </Suspense>
            </Canvas>

            <Suspense fallback={
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Loader2 className="animate-spin text-stone-300" size={32} />
                </div>
            }>
            </Suspense>

            <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 min-w-[200px] max-w-[90%] px-5 py-3 rounded-2xl shadow-lg border-2 text-sm font-bold text-center animate-in fade-in slide-in-from-bottom-4 transition-colors duration-500 z-10
                ${bubbleColor}
            `}>
                <p>{message || (isBehind ? "Cố lên bạn ơi! Đừng bỏ cuộc! 😭" : "Làm tốt lắm! Tiếp tục phát huy nhé! 🦊")}</p>

                <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 border-t-2 border-l-2 transform rotate-45 bg-inherit border-inherit`}></div>
            </div>
        </div>
    );
}
