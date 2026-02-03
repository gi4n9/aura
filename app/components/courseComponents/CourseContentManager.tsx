"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Loader2, Video, GripVertical, FileQuestion, ChevronRight, CheckCircle2, Pencil, Trash2, X, Save, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createChapter, updateChapter, deleteChapter } from "@/app/actions/chapter";
import { createLesson } from "@/app/actions/lesson";
import { getChapterLessons } from "@/app/actions/chapter";
import { toast } from "sonner";
import { ChapterActions } from "./ChapterActions";

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

    // Editing chapter states
    const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
    const [editingChapterTitle, setEditingChapterTitle] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
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

    // Handler để bắt đầu edit chapter
    const handleStartEditChapter = (chapter: { id: string; title: string }) => {
        setEditingChapterId(chapter.id);
        setEditingChapterTitle(chapter.title);
    };

    // Handler để cancel edit
    const handleCancelEdit = () => {
        setEditingChapterId(null);
        setEditingChapterTitle("");
    };

    // Handler để save chapter title
    const handleUpdateChapter = async () => {
        if (!editingChapterId || !editingChapterTitle.trim()) return;

        setIsUpdating(true);
        try {
            const res = await updateChapter(courseId, editingChapterId, {
                title: editingChapterTitle.trim()
            });

            if (res.success) {
                toast.success("Đã cập nhật chương");
                setEditingChapterId(null);
                setEditingChapterTitle("");

                // Optimistic update
                setChapters(chapters.map(ch =>
                    ch.id === editingChapterId
                        ? { ...ch, title: editingChapterTitle.trim() }
                        : ch
                ));

                router.refresh();
            } else {
                toast.error(res.error || "Lỗi cập nhật chương");
            }
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsUpdating(false);
        }
    };

    // Handler để toggle publish status
    const handleTogglePublish = async (chapterId: string, currentStatus: string) => {
        const isCurrentlyPublished = currentStatus === "PUBLISHED";

        try {
            const res = await updateChapter(courseId, chapterId, {
                isPublished: !isCurrentlyPublished
            });

            if (res.success) {
                toast.success(isCurrentlyPublished ? "Đã chuyển về nháp" : "Đã xuất bản chương");

                // Optimistic update
                setChapters(chapters.map(ch =>
                    ch.id === chapterId
                        ? { ...ch, status: isCurrentlyPublished ? "DRAFT" : "PUBLISHED" }
                        : ch
                ));

                router.refresh();
            } else {
                toast.error(res.error || "Lỗi cập nhật trạng thái");
            }
        } catch {
            toast.error("Lỗi kết nối");
        }
    };

    // Handler để delete chapter
    const handleDeleteChapter = async (chapterId: string) => {
        setIsDeleting(true);
        try {
            const res = await deleteChapter(courseId, chapterId);

            if (res.success) {
                toast.success("Đã xóa chương");
                setDeleteConfirmId(null);

                // Update local state
                const newChapters = chapters.filter(ch => ch.id !== chapterId);
                setChapters(newChapters);

                // Update selected chapter
                if (selectedChapterId === chapterId && newChapters.length > 0) {
                    setSelectedChapterId(newChapters[0].id);
                } else if (newChapters.length === 0) {
                    setSelectedChapterId("");
                    setLessons([]);
                }

                router.refresh();
            } else {
                toast.error(res.error || "Lỗi xóa chương");
            }
        } catch {
            toast.error("Lỗi kết nối");
        } finally {
            setIsDeleting(false);
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

                {/* Chapter List */}
                {isMounted && chapters.length > 0 ? (
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-3">
                            Danh sách chương ({chapters.length})
                        </label>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            {chapters.map((chapter) => (
                                <div key={chapter.id}>
                                    {/* Delete Confirmation */}
                                    {deleteConfirmId === chapter.id ? (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-in fade-in">
                                            <span className="flex-1 text-sm text-red-700">
                                                Xác nhận xóa &quot;{chapter.title}&quot;?
                                            </span>
                                            <button
                                                onClick={() => handleDeleteChapter(chapter.id)}
                                                disabled={isDeleting}
                                                className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : "Xóa"}
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmId(null)}
                                                className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded hover:bg-stone-200"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    ) : editingChapterId === chapter.id ? (
                                        /* Edit Mode */
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in">
                                            <input
                                                value={editingChapterTitle}
                                                onChange={(e) => setEditingChapterTitle(e.target.value)}
                                                className="flex-1 px-3 py-1.5 border border-stone-300 rounded text-sm outline-none focus:ring-1 focus:ring-[#C5A059]"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleUpdateChapter}
                                                disabled={isUpdating}
                                                className="p-1.5 bg-[#C5A059] text-white rounded hover:bg-[#b08d4b] disabled:opacity-50"
                                            >
                                                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="p-1.5 bg-stone-100 text-stone-600 rounded hover:bg-stone-200"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        /* Normal View */
                                        <div
                                            onClick={() => setSelectedChapterId(chapter.id)}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selectedChapterId === chapter.id
                                                ? "bg-[#C5A059]/10 border border-[#C5A059]/30"
                                                : "bg-stone-50 border border-transparent hover:border-stone-200"
                                                }`}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium text-sm ${selectedChapterId === chapter.id ? "text-[#C5A059]" : "text-stone-700"
                                                        }`}>
                                                        {chapter.title}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTogglePublish(chapter.id, chapter.status);
                                                        }}
                                                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full transition ${chapter.status === "PUBLISHED"
                                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                            : "bg-stone-200 text-stone-500 hover:bg-stone-300"
                                                            }`}
                                                    >
                                                        {chapter.status === "PUBLISHED" ? "Đã đăng" : "Nháp"}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartEditChapter(chapter);
                                                    }}
                                                    className="p-1.5 text-stone-400 hover:text-[#C5A059] hover:bg-stone-100 rounded transition"
                                                    title="Sửa tên chương"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirmId(chapter.id);
                                                    }}
                                                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                    title="Xóa chương"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-300">
                        Chưa có chương nào. Hãy tạo chương đầu tiên để bắt đầu thêm bài học.
                    </div>
                )}
            </div>

            {/* Selected Chapter Info & Publish Control */}
            {selectedChapterId && chapters.length > 0 && (() => {
                const selectedChapter = chapters.find(ch => ch.id === selectedChapterId);
                if (!selectedChapter) return null;

                return (
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                                    Chương đang chọn
                                </p>
                                <h3 className="font-bold text-stone-800 text-lg">
                                    {selectedChapter.title}
                                </h3>
                            </div>

                            {/* Publish & Actions - Using ChapterActions component */}
                            <ChapterActions
                                disabled={false}
                                courseId={courseId}
                                chapterId={selectedChapter.id}
                                isPublished={selectedChapter.status === "PUBLISHED"}
                                onDelete={() => {
                                    // Callback khi xóa thành công
                                    const newChapters = chapters.filter(ch => ch.id !== selectedChapter.id);
                                    setChapters(newChapters);

                                    // Chọn chương khác hoặc reset
                                    if (newChapters.length > 0) {
                                        setSelectedChapterId(newChapters[0].id);
                                    } else {
                                        setSelectedChapterId("");
                                        setLessons([]);
                                    }
                                }}
                            />
                        </div>
                    </div>
                );
            })()}

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
