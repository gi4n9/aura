export interface CosmeticItem {
    id: string;
    name: string;
    type: 'frame' | 'banner' | 'title';
    requiredLevel: number;
    description: string;
    previewStyle: string; // Tailwind CSS or style classes
}

// Catalog of unlockable cosmetic items
export const AVATAR_FRAMES: CosmeticItem[] = [
    {
        id: "frame_default",
        name: "Mặc định",
        type: "frame",
        requiredLevel: 1,
        description: "Khung cơ bản cho học viên Aura",
        previewStyle: "border-2 border-stone-400"
    },
    {
        id: "frame_bronze",
        name: "Đồng Ánh Kim",
        type: "frame",
        requiredLevel: 2,
        description: "Mở khóa khi đạt Cấp 2",
        previewStyle: "border-2 border-[#CD7F32] shadow-[0_0_12px_rgba(205,127,50,0.5)]"
    },
    {
        id: "frame_silver",
        name: "Bạc Tinh Anh",
        type: "frame",
        requiredLevel: 5,
        description: "Mở khóa khi đạt Cấp 5",
        previewStyle: "border-2 border-[#C0C0C0] shadow-[0_0_15px_rgba(192,192,192,0.6)]"
    },
    {
        id: "frame_gold",
        name: "Vàng Hoàng Gia",
        type: "frame",
        requiredLevel: 10,
        description: "Mở khóa khi đạt Cấp 10",
        previewStyle: "border-2 border-[#C5A059] ring-2 ring-[#C5A059]/40 shadow-[0_0_20px_rgba(197,160,89,0.7)]"
    },
    {
        id: "frame_platinum",
        name: "Bạch Kim Khiên Phổ",
        type: "frame",
        requiredLevel: 15,
        description: "Mở khóa khi đạt Cấp 15",
        previewStyle: "border-2 border-[#E5E4E2] ring-4 ring-indigo-500/30 shadow-[0_0_25px_rgba(229,228,226,0.8)]"
    },
    {
        id: "frame_cosmic",
        name: "Vũ Trụ Aura",
        type: "frame",
        requiredLevel: 20,
        description: "Mở khóa cho bậc thầy Cấp 20",
        previewStyle: "border-2 border-purple-500 ring-4 ring-pink-500/50 shadow-[0_0_30px_rgba(168,85,247,0.9)] animate-glow-cosmic"
    }
];

export const BANNER_THEMES: CosmeticItem[] = [
    {
        id: "banner_default",
        name: "Đêm Huyền Tối",
        type: "banner",
        requiredLevel: 1,
        description: "Phong cách tối giản Aura",
        previewStyle: "bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900"
    },
    {
        id: "banner_emerald",
        name: "Rừng Ngọc Bích",
        type: "banner",
        requiredLevel: 2,
        description: "Mở khóa khi đạt Cấp 2",
        previewStyle: "bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900"
    },
    {
        id: "banner_onyx",
        name: "Onyx Bí Ẩn",
        type: "banner",
        requiredLevel: 5,
        description: "Mở khóa khi đạt Cấp 5",
        previewStyle: "bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950"
    },
    {
        id: "banner_gold",
        name: "Hoàng Gia Hoàng Kim",
        type: "banner",
        requiredLevel: 10,
        description: "Mở khóa khi đạt Cấp 10",
        previewStyle: "bg-gradient-to-r from-amber-950 via-[#2A200F] to-amber-900 border-b border-[#C5A059]/40"
    },
    {
        id: "banner_starfield",
        name: "Tinh Vân Tinh Tú",
        type: "banner",
        requiredLevel: 15,
        description: "Mở khóa khi đạt Cấp 15",
        previewStyle: "bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950"
    },
    {
        id: "banner_cyberpunk",
        name: "Cyber Neon Aura",
        type: "banner",
        requiredLevel: 20,
        description: "Mở khóa khi đạt Cấp 20",
        previewStyle: "bg-gradient-to-r from-pink-950 via-purple-950 to-cyan-950 border-b border-cyan-500/40"
    }
];

export const USER_TITLES: CosmeticItem[] = [
    { id: "title_newbie", name: "Tân binh Aura", type: "title", requiredLevel: 1, description: "Học viên mới khởi đầu", previewStyle: "text-stone-500 dark:text-stone-400" },
    { id: "title_diligent", name: "Học viên Chăm chỉ", type: "title", requiredLevel: 3, description: "Cấp 3", previewStyle: "text-emerald-600 dark:text-emerald-400 font-semibold" },
    { id: "title_scholar", name: "Thấu học sinh", type: "title", requiredLevel: 5, description: "Cấp 5", previewStyle: "text-blue-600 dark:text-blue-400 font-semibold" },
    { id: "title_master", name: "Cao thủ Tri thức", type: "title", requiredLevel: 10, description: "Cấp 10", previewStyle: "text-[#B58934] dark:text-[#C5A059] font-bold" },
    { id: "title_grandmaster", name: "Đại Sư Bách Khoa", type: "title", requiredLevel: 15, description: "Cấp 15", previewStyle: "text-purple-600 dark:text-purple-400 font-bold" },
    { id: "title_legend", name: "Huyền thoại Aura", type: "title", requiredLevel: 20, description: "Cấp 20", previewStyle: "text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-400 font-extrabold" }
];

// Level Progression Curve:
// Level 1: 0 XP
// Level 2: 100 XP
// Level 3: 250 XP
// Level 4: 400 XP
// Level 5: 600 XP
// Level 10: 1,800 XP
// Level 15: 3,500 XP
// Level 20: 6,000 XP
export function calculateLevelFromXp(totalXp: number): number {
    if (totalXp >= 6000) return 20;
    if (totalXp >= 3500) return 15 + Math.floor((totalXp - 3500) / 500);
    if (totalXp >= 1800) return 10 + Math.floor((totalXp - 1800) / 340);
    if (totalXp >= 600) return 5 + Math.floor((totalXp - 600) / 240);
    if (totalXp >= 400) return 4;
    if (totalXp >= 250) return 3;
    if (totalXp >= 100) return 2;
    return 1;
}

export function getXpRequiredForLevel(level: number): number {
    if (level <= 1) return 0;
    if (level === 2) return 100;
    if (level === 3) return 250;
    if (level === 4) return 400;
    if (level === 5) return 600;
    if (level <= 10) return 600 + (level - 5) * 240;
    if (level <= 15) return 1800 + (level - 10) * 340;
    return 3500 + (level - 15) * 500;
}

export function getUnlockedItemIdsForLevel(level: number): string[] {
    const unlocked: string[] = [];
    [...AVATAR_FRAMES, ...BANNER_THEMES, ...USER_TITLES].forEach(item => {
        if (item.requiredLevel <= level) {
            unlocked.push(item.id);
        }
    });
    return unlocked;
}
