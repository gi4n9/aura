"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface AvatarProps {
    audioUrl: string | null;
    isSpeaking: boolean;
    onSpeakEnd: () => void;
}

// 1. Jarvis Holographic Core Component (Fallback & Main Theme)
function JarvisCore({ isSpeaking, analyser }: { isSpeaking: boolean; analyser: AnalyserNode | null }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const outerRingRef = useRef<THREE.Mesh>(null);
    const particleRef = useRef<THREE.Points>(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        
        let audioFactor = 0;
        if (analyser && isSpeaking) {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            audioFactor = sum / dataArray.length / 255; // 0 to 1
        }

        // Animate Inner Core
        if (meshRef.current) {
            meshRef.current.rotation.y = t * 0.5;
            meshRef.current.rotation.x = t * 0.3;
            // Pulsing scale based on audio
            const scale = 1 + (isSpeaking ? audioFactor * 0.4 : Math.sin(t * 2) * 0.05);
            meshRef.current.scale.set(scale, scale, scale);
        }

        // Animate Outer Hologram Ring
        if (outerRingRef.current) {
            outerRingRef.current.rotation.z = -t * 0.3;
            outerRingRef.current.rotation.y = t * 0.2;
            const ringScale = 1.4 + (isSpeaking ? audioFactor * 0.6 : Math.sin(t * 1.5) * 0.08);
            outerRingRef.current.scale.set(ringScale, ringScale, ringScale);
        }

        // Animate Particles
        if (particleRef.current) {
            particleRef.current.rotation.y = t * 0.1;
            const points = particleRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < points.length; i += 3) {
                // Wave distortion on particles based on audio
                const wave = Math.sin(t * 3 + i) * (isSpeaking ? audioFactor * 0.15 : 0.02);
                points[i + 1] += wave * 0.05; // distort Y axis slightly
            }
            particleRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    // Create particles array for rings
    const particleCount = 120;
    const positions = useMemo(() => {
        const pos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 1.8 + Math.random() * 0.2;
            pos[i * 3] = Math.cos(angle) * radius;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
            pos[i * 3 + 2] = Math.sin(angle) * radius;
        }
        return pos;
    }, []);

    function useMemo(fn: () => any, deps: any[]) {
        return useState(fn)[0];
    }

    return (
        <group>
            {/* Pulsing inner sphere (hologram node) */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshBasicMaterial 
                    color="#C5A059" 
                    wireframe 
                    transparent 
                    opacity={isSpeaking ? 0.75 : 0.4}
                />
            </mesh>

            {/* Glowing outer shell */}
            <mesh>
                <sphereGeometry args={[0.68, 16, 16]} />
                <meshPhysicalMaterial 
                    color="#D4AF37" 
                    emissive="#C5A059"
                    emissiveIntensity={isSpeaking ? 1.5 : 0.5}
                    transparent 
                    opacity={0.15}
                    roughness={0.1}
                    metalness={0.9}
                />
            </mesh>

            {/* Outer wireframe shell ring */}
            <mesh ref={outerRingRef}>
                <torusGeometry args={[0.9, 0.04, 8, 48]} />
                <meshBasicMaterial 
                    color="#D4AF37" 
                    wireframe 
                    transparent 
                    opacity={isSpeaking ? 0.9 : 0.5}
                />
            </mesh>

            {/* Orbiting Particles */}
            <points ref={particleRef}>
                <bufferGeometry>
                    <bufferAttribute 
                        attach="attributes-position"
                        args={[positions, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial 
                    color="#C5A059" 
                    size={0.04} 
                    transparent 
                    opacity={0.8}
                />
            </points>
        </group>
    );
}

interface AvatarProps {
    audioUrl: string | null;
    isSpeaking: boolean;
    onSpeakEnd: () => void;
    isMuted: boolean;
}

// 2. Main Avatar component with fallback
export default function AuraAvatar3D({ audioUrl, isSpeaking, onSpeakEnd, isMuted }: AvatarProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastPlayedUrlRef = useRef<string | null>(null);

    // Đồng bộ trạng thái tắt âm của Audio element
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // Xử lý Audio phát ra và Web Audio Analyser
    useEffect(() => {
        if (!audioUrl || !isSpeaking) return;

        // Tránh tạo lại Audio nếu url đang được phát rồi
        if (audioUrl === lastPlayedUrlRef.current) {
            return;
        }
        
        lastPlayedUrlRef.current = audioUrl;

        // Khởi tạo Audio và AudioContext
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.crossOrigin = "anonymous"; // Cho phép CORS nếu load từ Supabase
        audio.muted = isMuted; // Cấu hình trạng thái tắt tiếng ban đầu

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Nhỏ cho nhẹ
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyserRef.current = analyser;

        audio.play().catch(err => {
            console.warn("Audio autoplay blocked or failed:", err);
            // Fallback play khi có tương tác người dùng
        });

        audio.onended = () => {
            onSpeakEnd();
            cleanupAudio();
        };

        const cleanupAudio = () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
                audioCtxRef.current.close();
            }
            analyserRef.current = null;
            lastPlayedUrlRef.current = null;
        };

        return cleanupAudio;
    }, [audioUrl, isSpeaking, onSpeakEnd]);

    return (
        <div className="w-full h-full relative">
            <Canvas camera={{ position: [0, 0, 3], fov: 45 }} className="w-full h-full">
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={1.5} color="#C5A059" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8A2BE2" />
                
                <JarvisCore isSpeaking={isSpeaking} analyser={analyserRef.current} />
                
                <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>
            
            {/* Jarvis Visualizer Waveform overlay ở bottom */}
            {isSpeaking && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 h-8">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div 
                            key={i} 
                            className="w-1 bg-[#C5A059] rounded-full animate-pulse"
                            style={{
                                height: `${Math.random() * 100}%`,
                                animationDuration: `${0.3 + Math.random() * 0.4}s`,
                                animationDelay: `${i * 0.05}s`
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
