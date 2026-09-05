"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { formatMathForDisplay } from "@/lib/math-formatter";

export function formatMarkdownText(text: string | null | undefined): string {
    if (!text) return "";
    let str = formatMathForDisplay(text);

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

interface FormattedMarkdownForInstructorsProps {
    content: string | null | undefined;
    className?: string;
}

export default function FormattedMarkdownForInstructors({ content, className = "" }: FormattedMarkdownForInstructorsProps) {
    if (!content) return null;

    const formattedContent = formatMarkdownText(content);

    return (
        <div className={`prose prose-sm max-w-none leading-relaxed font-sans text-stone-800 ${className}`}>
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
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 my-3 shadow-xs">
                            <div className="font-bold text-stone-800 m-0">
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
                        <li className="relative block text-stone-700 before:content-['-'] before:absolute before:-left-4 before:text-[#C5A059]/90 before:font-bold font-medium [&>p]:m-0 [&>p]:inline">
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
                    // GHI ĐÈ THẺ PRE VÀ CODE: Triệt tiêu hoàn toàn style nền đen chữ trắng của class prose
                    pre: ({ children }) => (
                        <div className="whitespace-pre-wrap font-sans text-stone-700 my-2">
                            {children}
                        </div>
                    ),
                    code: ({ children }) => (
                        <span className="font-sans text-stone-700">{children}</span>
                    ),
                }}
            >
                {formattedContent}
            </ReactMarkdown>
        </div>
    );
}