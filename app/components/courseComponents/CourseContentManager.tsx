"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Loader2, Video, GripVertical, FileQuestion, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createChapter } from "@/app/actions/chapter";
import { createLesson } from "@/app/actions/lesson";
import { getChapterLessons } from "@/app/actions/chapter";
import { toast } from "sonner";

interface CourseContentManagerProps {
    initialChapters: { id: string; title: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; position: number }[];
    courseId: string;
}

export const CourseContentManager = ({ initialChapters, courseId }: CourseContentManagerProps) => {
    const [chapters, setChapters] = useState(initialChapters);
    const [selectedChapterId, setSelectedChapterId] = useState<string>(initialChapters.length > 0 ? initialChapters[0].id : "");
    const [lessons, setLessons] = useState<any[]>([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(false);

    // Creating states
    const [isCreatingChapter, setIsCreatingChapter] = useState(false);
    const [newChapterTitle, setNewChapterTitle] = useState("");
    const [isCreatingLesson, setIsCreatingLesson] = useState(false);
    const [newLessonTitle, setNewLessonTitle] = useState("");

    const router = useRouter();

    useEffect(() => {
        setChapters(initialChapters);
        // If the selected chapter is no longer in the list (e.g. after full refresh), reset or keep
        if (initialChapters.length > 0 && !selectedChapterId) {
            setSelectedChapterId(initialChapters[0].id);
        }
    }, [initialChapters]);

    // Fetch lessons when selected chapter changes
    useEffect(() => {
        if (!selectedChapterId) return;

        const fetchLessons = async () => {
            setIsLoadingLessons(true);
            const res = await getChapterLessons(selectedChapterId);
            if (res.success && res.data) {
                setLessons(res.data);
            }
            setIsLoadingLessons(false);
        };

        fetchLessons();
    }, [selectedChapterId]);


    const handleCreateChapter = async () => {
        if (!newChapterTitle.trim()) return;

        try {
            const res = await createChapter(courseId, newChapterTitle);
            if (res.success && res.data) {
                toast.success("Đã tạo chương mới");
                setNewChapterTitle("");
                setIsCreatingChapter(false);
                router.refresh(); // This should update initialChapters prop eventually

                // Optimistic update or wait for refresh
                // Ideally we wait for refresh to update prop, but we can append locally if strict syncing isn't required immediately
                // setChapters([...chapters, res.data]); 
                // setSelectedChapterId(res.data.id);
            } else {
                toast.error(res.error || "Lỗi tạo chương");
            }
        } catch {
            toast.error("Lỗi kết nối");
        }
    };

    const handleCreateLesson = async () => {
        if (!newLessonTitle.trim() || !selectedChapterId) return;

        try {
            const res = await createLesson(selectedChapterId, newLessonTitle);
            if (res.success && res.data) {
                toast.success("Đã thêm bài học");
                setNewLessonTitle("");
                setIsCreatingLesson(false);

                // Refresh lessons list
                const lessonRes = await getChapterLessons(selectedChapterId);
                if (lessonRes.success) setLessons(lessonRes.data || []);

                router.refresh();
            } else {
                toast.error(res.error || "Lỗi tạo bài học");
            }
        } catch {
            toast.error("Lỗi kết nối");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header: Select Chapter & Add Chapter */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                        <CheckCircle2 className="text-[#C5A059]" />
                        Nội dung khóa học
                    </h2>

                    {!isCreatingChapter ? (
                        <button
                            onClick={() => setIsCreatingChapter(true)}
                            className="text-sm font-medium text-[#C5A059] hover:underline flex items-center gap-1"
                        >
                            <PlusCircle size={16} /> Thêm chương mới
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <input
                                value={newChapterTitle}
                                onChange={(e) => setNewChapterTitle(e.target.value)}
                                placeholder="Tên chương..."
                                className="px-3 py-1.5 border border-stone-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-[#C5A059]"
                                autoFocus
                            />
                            <button
                                onClick={handleCreateChapter}
                                className="px-3 py-1.5 bg-[#C5A059] text-white text-xs font-bold rounded-md hover:bg-[#b08d4b]"
                            >
                                Lưu
                            </button>
                            <button
                                onClick={() => setIsCreatingChapter(false)}
                                className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-md hover:bg-stone-200"
                            >
                                Hủy
                            </button>
                        </div>
                    )}
                </div>

                {/* Chapter Selector */}
                {chapters.length > 0 ? (
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                            Chọn chương để biên tập
                        </label>
                        <div className="relative">
                            <select
                                value={selectedChapterId}
                                onChange={(e) => setSelectedChapterId(e.target.value)}
                                className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-700 py-3 px-4 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-[#C5A059] font-medium cursor-pointer transition-all hover:bg-stone-100"
                            >
                                {chapters.map((chapter) => (
                                    <option key={chapter.id} value={chapter.id}>
                                        {chapter.title} {chapter.status === "PUBLISHED" ? "(Đã đăng)" : "(Nháp)"}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none rotate-90" size={16} />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-300">
                        Chưa có chương nào. Hãy tạo chương đầu tiên để bắt đầu thêm bài học.
                    </div>
                )}
            </div>

            {/* Lesson List Panel */}
            {selectedChapterId && chapters.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-stone-700">
                            Bài học trong chương
                        </h3>

                        {!isCreatingLesson ? (
                            <button
                                onClick={() => setIsCreatingLesson(true)}
                                className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                            >
                                <PlusCircle size={16} /> Thêm bài học
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 w-full max-w-md justify-end animate-in fade-in">
                                <span className="text-sm font-bold text-stone-500 whitespace-nowrap">Bài mới:</span>
                                <input
                                    value={newLessonTitle}
                                    onChange={(e) => setNewLessonTitle(e.target.value)}
                                    placeholder="Nhập tên bài học..."
                                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#C5A059]"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreateLesson}
                                    className="px-4 py-2 bg-[#C5A059] text-white text-sm font-bold rounded-lg hover:bg-[#b08d4b]"
                                >
                                    Thêm
                                </button>
                                <button
                                    onClick={() => setIsCreatingLesson(false)}
                                    className="px-3 py-2 bg-stone-100 text-stone-600 text-sm font-bold rounded-lg hover:bg-stone-200"
                                >
                                    Hủy
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {isLoadingLessons ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="animate-spin text-[#C5A059]" />
                            </div>
                        ) : lessons.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-stone-200 rounded-lg bg-stone-50">
                                <p className="text-stone-500 mb-2">Chưa có bài học nào trong chương này.</p>
                                <p className="text-xs text-stone-400">Nhấn "Thêm bài học" để bắt đầu tải lên video và câu hỏi.</p>
                            </div>
                        ) : (
                            lessons.map((lesson) => (
                                <Link
                                    key={lesson.id}
                                    href={`/instructor/courses/${courseId}/chapters/${selectedChapterId}/lesson/${lesson.id}`}
                                    className="block group"
                                >
                                    <div className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl hover:border-[#C5A059] hover:shadow-md transition-all duration-200">
                                        <div className="cursor-grab text-stone-300 group-hover:text-stone-500 transition">
                                            <GripVertical size={20} />
                                        </div>

                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${lesson._count?.questions > 0 ? "bg-[#C5A059]/10 text-[#C5A059]" : "bg-stone-100 text-stone-400"
                                            }`}>
                                            <Video size={20} />
                                        </div>

                                        <div className="flex-1">
                                            <h4 className="font-semibold text-stone-800 group-hover:text-[#C5A059] transition-colors">
                                                {lesson.title}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-xs text-stone-500 flex items-center gap-1">
                                                    <FileQuestion size={12} /> {lesson._count?.questions || 0} câu hỏi
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-stone-300 group-hover:text-[#C5A059] transition-transform group-hover:translate-x-1">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
