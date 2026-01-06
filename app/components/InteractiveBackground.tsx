"use client";

import {
    motion,
    useAnimationFrame,
    motionValue
} from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";

// --- CẤU HÌNH ---
const ORB_COUNT = 12;
const BASE_SPEED = 2;
const MAX_SPEED = 8;
const REPEL_RADIUS = 250;
const REPEL_FORCE = 3;
const DAMPING = 0.98;

const COLORS = [
    "bg-[var(--primary-400)]",
    "bg-[var(--primary-500)]",
    "bg-[var(--accent-purple)]",
    "bg-[var(--accent-pink)]",
];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

// Interface cho Vật lý (Dùng trong tính toán)
interface PhysicsState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number; // Cần radius để tính va chạm
}

// Interface cho Render (Dùng để hiển thị)
interface VisualState {
    id: number;
    color: string;
    radius: number;
}

export default function InteractiveBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. MotionValues: Cầu nối giữa tính toán và DOM
    const motionOrbs = useMemo(() => {
        return Array.from({ length: ORB_COUNT }).map(() => ({
            x: motionValue(0),
            y: motionValue(0),
        }));
    }, []);

    // 2. Physics Ref: Lưu trữ trạng thái vật lý (Mutable - không gây re-render)
    const physicsRef = useRef<PhysicsState[]>([]);

    // 3. Visual State: Lưu trữ thông tin hiển thị (Gây re-render 1 lần khi mount)
    // Đây là chìa khóa để sửa lỗi "Cannot access refs during render"
    const [visualOrbs, setVisualOrbs] = useState<VisualState[]>([]);

    // Khởi tạo dữ liệu (Chạy 1 lần sau khi mount - Client Side Only)
    useEffect(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        const newPhysics: PhysicsState[] = [];
        const newVisuals: VisualState[] = [];

        for (let i = 0; i < ORB_COUNT; i++) {
            const radius = random(360, 420);
            const startX = random(0, width - radius);
            const startY = random(0, height - radius);

            // Setup Visuals
            newVisuals.push({
                id: i,
                color: COLORS[random(0, COLORS.length - 1)],
                radius: radius
            });

            // Setup Physics
            newPhysics.push({
                x: startX,
                y: startY,
                vx: (Math.random() - 0.5) * BASE_SPEED * 2,
                vy: (Math.random() - 0.5) * BASE_SPEED * 2,
                radius: radius
            });

            // Set giá trị ban đầu cho MotionValues
            motionOrbs[i].x.set(startX);
            motionOrbs[i].y.set(startY);
        }

        physicsRef.current = newPhysics;
        setVisualOrbs(newVisuals); // Trigger render
    }, [motionOrbs]);

    // Theo dõi chuột
    const mouseRef = useRef({ x: -1000, y: -1000 });
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // GAME LOOP
    useAnimationFrame(() => {
        if (!containerRef.current || physicsRef.current.length === 0) return;

        const { width, height } = containerRef.current.getBoundingClientRect();
        const mouse = mouseRef.current;

        // Loop qua mảng vật lý (physicsRef)
        physicsRef.current.forEach((orb, i) => {
            // Logic tương tác chuột
            const dx = orb.x + orb.radius / 2 - mouse.x;
            const dy = orb.y + orb.radius / 2 - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < REPEL_RADIUS) {
                const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
                const angle = Math.atan2(dy, dx);

                orb.vx += Math.cos(angle) * force * REPEL_FORCE;
                orb.vy += Math.sin(angle) * force * REPEL_FORCE;
            }

            // Cập nhật vị trí
            orb.x += orb.vx;
            orb.y += orb.vy;

            // Va chạm biên
            if (orb.x < -orb.radius * 0.2) { orb.x = -orb.radius * 0.2; orb.vx *= -1; }
            if (orb.x > width - orb.radius * 0.8) { orb.x = width - orb.radius * 0.8; orb.vx *= -1; }
            if (orb.y < -orb.radius * 0.2) { orb.y = -orb.radius * 0.2; orb.vy *= -1; }
            if (orb.y > height - orb.radius * 0.8) { orb.y = height - orb.radius * 0.8; orb.vy *= -1; }

            // Giới hạn tốc độ
            const speed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
            if (speed > MAX_SPEED) {
                orb.vx = (orb.vx / speed) * MAX_SPEED;
                orb.vy = (orb.vy / speed) * MAX_SPEED;
            }
            if (speed < 0.5) {
                orb.vx += (Math.random() - 0.5) * 0.5;
                orb.vy += (Math.random() - 0.5) * 0.5;
            }

            orb.vx *= DAMPING;
            orb.vy *= DAMPING;

            // Update Motion Values (để DOM thay đổi)
            motionOrbs[i].x.set(orb.x);
            motionOrbs[i].y.set(orb.y);
        });
    });

    return (
        <div ref={containerRef} className="absolute inset-0 overflow-hidden -z-10 bg-white">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxMjgsIDEyOCwgMTI4LCAwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L2BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

            {/* Render dựa trên State (visualOrbs) chứ không phải Ref */}
            {visualOrbs.map((orb, i) => (
                <OrbRendeer
                    key={orb.id}
                    motionX={motionOrbs[i].x}
                    motionY={motionOrbs[i].y}
                    color={orb.color}     // Truyền trực tiếp props
                    radius={orb.radius}   // Truyền trực tiếp props
                />
            ))}
        </div>
    );
}

// Component con bây giờ nhận props thuần túy, không chọc vào Ref nữa
function OrbRendeer({ motionX, motionY, color, radius }: any) {
    return (
        <motion.div
            style={{
                x: motionX,
                y: motionY,
                width: radius,
                height: radius
            }}
            className={`absolute top-0 left-0 rounded-full mix-blend-multiply filter blur-3xl opacity-15 ${color}`}
            animate={{ scale: [1, 1.05, 0.95, 1] }}
            transition={{
                duration: Math.random() * 3 + 3,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    );
}