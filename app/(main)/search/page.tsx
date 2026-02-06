"use client";

import { useState } from "react";
import { searchContent, SearchResult } from "@/app/actions/search";
import { Search, Loader2, PlayCircle, ArrowRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        const res = await searchContent(query);
        if (res.success && res.data) {
            setResults(res.data);
        } else {
            alert("Search failed");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#F9F8F4] pt-24 px-4 pb-20">
            <div className="max-w-4xl mx-auto">

                {/* Search Header */}
                <div className={`transition-all duration-500 flex flex-col items-center ${searched ? "mb-10" : "mb-20 pt-20"}`}>
                    {!searched && (
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-800 mb-6 text-center">
                            Tìm kiếm kiến thức thông minh
                        </h1>
                    )}

                    <form onSubmit={handleSearch} className="w-full max-w-2xl relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#C5A059] transition-colors">
                            <Search size={24} />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Hỏi về nội dung bài học (VD: machine learning là gì?)..."
                            className="w-full pl-14 pr-6 py-4 rounded-xl border border-stone-200 shadow-sm focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] bg-white text-lg transition-all outline-none"
                        />
                        {loading && (
                            <div className="absolute inset-y-0 right-4 flex items-center">
                                <Loader2 className="animate-spin text-[#C5A059]" />
                            </div>
                        )}
                    </form>
                </div>

                {/* Results Area */}
                {searched && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-stone-500 font-bold text-sm uppercase tracking-wider">
                                {results?.length} Kết quả phù hợp
                            </h2>
                            {results && results.length > 0 && <span className="text-xs text-stone-400">Độ chính xác cao</span>}
                        </div>

                        {results?.length === 0 && !loading && (
                            <div className="text-center py-20 text-stone-400">
                                <Search size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Không tìm thấy nội dung phù hợp.</p>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {results?.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/courses/${item.lesson.chapter.course.id}/lessons/${item.lesson.id}?t=${Math.floor(item.startTime)}`}
                                    className="block group"
                                >
                                    <div className="bg-white rounded-xl p-5 border border-stone-100 hover:border-[#C5A059] shadow-sm hover:shadow-md transition-all flex gap-5 items-start">

                                        {/* Thumbnail (Mock or Real) */}
                                        <div className="w-32 h-20 bg-stone-100 rounded-lg flex-shrink-0 flex items-center justify-center text-stone-300 relative overflow-hidden group-hover:scale-105 transition-transform">
                                            {/* Ideally use Youtube Thumbnail if videoId exists, or Course Image */}
                                            <PlayCircle size={32} className="text-[#C5A059]" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded">
                                                    {formatTime(item.startTime)}
                                                </span>
                                                <span className="text-xs text-stone-400 truncate max-w-[200px]">
                                                    {item.lesson.chapter.course.title}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-stone-800 text-lg group-hover:text-[#C5A059] transition-colors mb-2">
                                                {item.lesson.title}
                                            </h3>

                                            <p className="text-sm text-stone-600 line-clamp-2 italic border-l-2 border-stone-200 pl-3">
                                                "...{item.content}..."
                                            </p>
                                        </div>

                                        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                                            <div className="p-2 rounded-full bg-stone-50 text-[#C5A059]">
                                                <ArrowRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
