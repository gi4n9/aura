"use client";

import React, { useState } from "react";

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    size?: number; // Size in px (default 36)
    className?: string;
    fallbackBg?: string;
}

export default function UserAvatar({
    src,
    name,
    size = 36,
    className = "",
    fallbackBg = "bg-[#C5A059] text-white"
}: UserAvatarProps) {
    const [imgError, setImgError] = useState(false);

    const initial = (name && name.trim())
        ? name.trim().charAt(0).toUpperCase()
        : "U";

    const hasValidSrc = Boolean(src && typeof src === "string" && src.trim().length > 0 && !src.includes("placehold.co"));

    if (hasValidSrc && !imgError) {
        return (
            <img
                src={src!}
                alt={name || "Avatar"}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{ width: `${size}px`, height: `${size}px` }}
                className={`rounded-full object-cover flex-shrink-0 shadow-sm ${className}`}
            />
        );
    }

    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                fontSize: `${Math.max(11, Math.floor(size * 0.4))}px`
            }}
            className={`rounded-full flex items-center justify-center font-serif font-bold flex-shrink-0 shadow-sm border border-stone-200 ${fallbackBg} ${className}`}
        >
            {initial}
        </div>
    );
}
