"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useTheme } from "@/lib/theme/ThemeContext";

/**
 * Pre-processes text to preserve newlines and convert inline separators
 * into clean paragraph breaks and bullet lists.
 */
export function formatMarkdownText(text: string | null | undefined): string {
    if (!text) return "";
    let str = text;

    // 1. Xử lý trường hợp chuỗi chứa JSON Rubric
    if (str.trim().startsWith("{")) {
        try {
            const obj = JSON.parse(str);
            if (obj.answer || obj.rubric) {
                str = obj.answer || "";
            }
        } catch { }
    }

    // 2. Chống dính chữ vào các mục b1, b2, Ý...
    str = str.replace(/([:.;?!])\s+[-•]\s*(b\d|Ý)/g, "$1\n- $2");

    // 3. KHẮC PHỤC LỖI KHUNG ĐEN (CODE BLOCK): 
    // Xóa sạch các khoảng trắng thụt lề quá đà trước dấu gạch ngang/chấm tròn
    str = str.replace(/^[ \t]+([-•])/gim, "$1");

    // 4. Định dạng các mục "b1.", "b2.1." thành thẻ Heading 4 để tạo ô riêng
    str = str.replace(/^[ \t]*[-•]?[ \t]*(b\d+(?:\.\d+)*\.)(.*)$/gim, "#### $1 $2");

    // 5. Định dạng Ý lùi 1 tab (VD: Ý 1.2) -> 4 spaces
    str = str.replace(/^[ \t]*[-•]?[ \t]*Ý[ \t]*\d+(?:\.\d+)+\)[ \t]*/gim, "    - ");

    // 6. Định dạng Ý đầu mục (VD: Ý 1) -> 0 spaces
    str = str.replace(/^[ \t]*[-•]?[ \t]*Ý[ \t]*\d+\)[ \t]*/gim, "- ");

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
        <div className={`prose prose-sm max-w-none leading-relaxed font-sans ${isDark ? "text-stone-200" : "text-stone-800"} ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({ children }) => (
                        <p className="mb-2 last:mb-0 text-justify">
                            {children}
                        </p>
                    ),
                    h4: ({ children }) => (
                        <div className={`${isDark ? "bg-stone-900 border-stone-700" : "bg-stone-50 border-stone-200"} border rounded-lg p-3 my-3 shadow-xs`}>
                            {/* Cập nhật màu chữ cho tiêu đề hộp */}
                            <div className={`font-bold m-0 ${isDark ? "text-stone-100" : "text-stone-800"}`}>
                                {children}
                            </div>
                        </div>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-2 space-y-1.5 list-none pl-5 [&_ul]:pl-6 [&_ul]:mt-1.5">
                            {children}
                        </ul>
                    ),
                    li: ({ children }) => (
                        // Cập nhật màu chữ cho danh sách
                        <li className={`relative block before:content-['-'] before:absolute before:-left-4 before:text-[#C5A059]/90 before:font-bold font-medium [&>p]:m-0 [&>p]:inline ${isDark ? "text-stone-300" : "text-stone-700"}`}>
                            {children}
                        </li>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-2 space-y-1.5 pl-5 list-decimal marker:text-[#C5A059] marker:font-bold">
                            {children}
                        </ol>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-bold text-[#C5A059]">{children}</strong>
                    ),
                    pre: ({ children }) => (
                        <div className={`${isDark ? "bg-stone-900 border-stone-700" : "bg-stone-50 border-stone-200"} border rounded-lg p-3 my-3 shadow-xs`}>
                            {children}
                        </div>
                    ),
                    code: ({ children }) => (
                        // Cập nhật màu chữ cho code/text rác lọt vào pre
                        <span className={`font-sans ${isDark ? "text-stone-300" : "text-stone-700"}`}>{children}</span>
                    ),
                }}
            >
                {formattedContent}
            </ReactMarkdown>
        </div>
    );
}

