"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/lib/theme/ThemeContext";

/**
 * Pre-processes text to preserve newlines and convert inline separators
 * into clean paragraph breaks and bullet lists.
 */
export function formatMarkdownText(text: string | null | undefined): string {
    if (!text) return "";
    let str = text;

    // 1. Xử lý trường hợp chuỗi chứa JSON Rubric -> Chỉ lấy đáp án mẫu (obj.answer)
    if (str.trim().startsWith("{")) {
        try {
            const obj = JSON.parse(str);
            if (obj.answer || obj.rubric) {
                str = obj.answer || "";
            }
        } catch {
            // Giữ nguyên nếu không phải JSON
        }
    }

    // 2. Tách các ý bị dính ngang (ví dụ: "...yêu cầu sau: - **Ý 1..." hoặc "...hành động. - **Ý 2...") thành dòng mới
    str = str
        .replace(/([:.;?!])\s*[-•]\s*/g, "$1\n\n- ")
        .replace(/\s*[-•]\s*(\*\*Ý|\*\*Ý\s*\d|\*\*Mục|Ý\s*\d|Mục\s*\d)/gi, "\n\n- $1")
        .replace(/\n[-•]\s*/g, "\n- ");

    return str;
}

interface FormattedMarkdownProps {
    content: string | null | undefined;
    className?: string;
}

export default function FormattedMarkdown({ content, className = "" }: FormattedMarkdownProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    if (!content) return null;

    const formattedContent = formatMarkdownText(content);

    return (
        <div className={`prose prose-sm max-w-none leading-relaxed font-sans ${
            isDark ? "text-stone-200 prose-invert" : "text-stone-800"
        } ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => (
                        <p className="mb-3 last:mb-0 leading-relaxed indent-6 text-justify">
                            {children}
                        </p>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-2 space-y-1.5 pl-5 list-disc marker:text-[#C5A059]">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-2 space-y-1.5 pl-5 list-decimal marker:text-[#C5A059]">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="leading-relaxed pl-1 my-1">
                            {children}
                        </li>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-bold text-[#C5A059]">{children}</strong>
                    ),
                }}
            >
                {formattedContent}
            </ReactMarkdown>
        </div>
    );
}
