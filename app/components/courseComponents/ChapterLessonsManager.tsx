"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Video,
    FileQuestion,
    PlusCircle,
    GripVertical,
    Trash2,
    Loader2,
    AlertTriangle,
    X,
    ChevronRight,
    ArrowLeft
} from "lucide-react";
import { deleteLesson, deleteAllLessons, createLesson } from "@/app/actions/lesson";
import { toast } from "sonner";

interface LessonItem {
    id: string;
    title: string;
    youtubeVideoId: string | null;
    transcript?: string | null;
    position: number;
    _count: {
        questions: number;
    };
}

interface ChapterLessonsManagerProps {
    courseId: string;
    chapterId: string;
    chapterTitle: string;
    initialLessons: LessonItem[];
}

export default function ChapterLessonsManager({
    courseId,
    chapterId,
    chapterTitle,
    initialLessons,
}: ChapterLessonsManagerProps) {
    const router = useRouter();
    const [lessons, setLessons] = useState<LessonItem[]>(initialLessons);
    const [currentPage, setCurrentPage] = useState(1);
    const LESSONS_PER_PAGE = 6;
    const totalPages = Math.ceil(lessons.length / LESSONS_PER_PAGE) || 1;
    const paginatedLessons = lessons.slice(
        (currentPage - 1) * LESSONS_PER_PAGE,
        currentPage * LESSONS_PER_PAGE
    );

    // Create lesson states
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

    // Delete single lesson modal state
    const [lessonToDelete, setLessonToDelete] = useState<LessonItem | null>(null);
    const [isDeletingSingle, setIsDeletingSingle] = useState(false);

    // Delete all lessons modal state
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    // Xử lý tạo bài học mới
    const handleCreateLesson = async () => {
        if (!newTitle.trim()) return;
        setIsSubmittingCreate(true);
        try {
            const res = await createLesson(chapterId, newTitle.trim());
            if (res.success && res.data) {
                toast.success("Đã thêm bài học mới");
                setLessons(prev => [
                    ...prev,
                    {
                        id: res.data.id,
                        title: res.data.title,
                        youtubeVideoId: res.data.youtubeVideoId,
                        position: res.data.position,
                        _count: { questions: 0 },
                    },
                ]);
                setNewTitle("");
                setIsCreating(false);
                router.refresh();
            } else {
                toast.error(res.error || "Không thể tạo bài học");
            }
        } catch {
            toast.error("Đã xảy ra lỗi kết nối");
        } finally {
            setIsSubmittingCreate(false);
        }
    };

    // Xử lý xóa 1 bài học
    const handleConfirmDeleteSingle = async () => {
        if (!lessonToDelete) return;
        setIsDeletingSingle(true);
        try {
            const res = await deleteLesson(lessonToDelete.id);
            if (res.success) {
                toast.success(`Đã xóa bài học "${lessonToDelete.title}"`);
                setLessons(prev => prev.filter(l => l.id !== lessonToDelete.id));
                setLessonToDelete(null);
                router.refresh();
            } else {
                toast.error(res.error || "Lỗi khi xóa bài học");
            }
        } catch {
            toast.error("Đã xảy ra lỗi khi xóa bài học");
        } finally {
            setIsDeletingSingle(false);
        }
    };

    // Xử lý xóa tất cả bài học trong chương
    const handleConfirmDeleteAll = async () => {
        setIsDeletingAll(true);
        try {
            const res = await deleteAllLessons(chapterId);
            if (res.success) {
                toast.success(`Đã xóa toàn bộ ${res.count || lessons.length} bài học trong chương`);
                setLessons([]);
                setIsDeleteAllOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "Lỗi khi xóa bài học");
            }
        } catch {
            toast.error("Đã xảy ra lỗi kết nối");
        } finally {
            setIsDeletingAll(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto bg-[#F9F8F4] min-h-screen">
            {/* Header / Navigation */}
            <div className="mb-8">
                <Link
                    href={`/instructor/courses/${courseId}/settings`}
                    className="inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-800 transition mb-4"
                >
                    <ArrowLeft size={16} className="mr-2" /> Quay lại Cài đặt khóa học
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-serif font-bold text-stone-800">
                                {chapterTitle}
                            </h1>
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-200 text-stone-700">
                                {lessons.length} bài học
                            </span>
                        </div>
                        <p className="text-stone-500 text-sm mt-1">
                            Quản lý các bài học, video và câu hỏi trắc nghiệm trong chương này
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {lessons.length > 0 && (
                            <button
                                onClick={() => setIsDeleteAllOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-100 hover:border-red-300 rounded-lg text-sm font-semibold transition shadow-xs cursor-pointer"
                                title="Xóa tất cả các bài học trong chương"
                            >
                                <Trash2 size={16} /> Xóa tất cả
                            </button>
                        )}

                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition shadow-sm text-sm font-medium cursor-pointer"
                        >
                            <PlusCircle size={17} /> Thêm bài học mới
                        </button>
                    </div>
                </div>
            </div>

            {/* Inline Add Lesson Form */}
            {isCreating && (
                <div className="mb-6 p-4 bg-white rounded-2xl border border-[#C5A059]/40 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                            Thêm bài học mới vào chương
                        </span>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateLesson();
                                if (e.key === "Escape") setIsCreating(false);
                            }}
                            placeholder="Nhập tên bài học (VD: Bài 1 - Giới thiệu cấu trúc bài thi)..."
                            className="flex-1 w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
                            autoFocus
                        />
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <button
                                onClick={handleCreateLesson}
                                disabled={isSubmittingCreate || !newTitle.trim()}
                                className="px-5 py-2.5 bg-[#C5A059] text-white text-sm font-bold rounded-xl hover:bg-[#b5914a] transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                {isSubmittingCreate ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                                Thêm bài học
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition cursor-pointer"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lessons List */}
            <div className="space-y-3">
                {lessons.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-300 shadow-xs">
                        <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
                            <Video size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-stone-700 mb-1">Chưa có bài học nào</h3>
                        <p className="text-stone-500 text-sm max-w-md mx-auto mb-5">
                            Chương này hiện đang trống. Hãy tạo bài học đầu tiên để bắt đầu thêm nội dung video và câu hỏi luyện tập.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C5A059] text-white rounded-xl font-bold text-sm shadow-sm hover:bg-[#b5914a] transition cursor-pointer"
                        >
                            <PlusCircle size={18} /> Thêm bài học đầu tiên
                        </button>
                    </div>
                ) : (
                    paginatedLessons.map((lesson) => (
                        <div
                            key={lesson.id}
                            className="group bg-white p-4 rounded-2xl border border-stone-200 shadow-xs hover:border-[#C5A059] hover:shadow-md transition-all flex items-center gap-4"
                        >
                            <div className="cursor-grab text-stone-300 group-hover:text-stone-500 transition">
                                <GripVertical size={20} />
                            </div>

                            <Link
                                href={`/instructor/courses/${courseId}/chapters/${chapterId}/lesson/${lesson.id}`}
                                className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-500 group-hover:bg-[#C5A059]/10 group-hover:text-[#C5A059] transition shrink-0"
                                title="Bấm để chỉnh sửa nội dung bài học"
                            >
                                <Video size={24} />
                            </Link>

                            <div className="flex-1 min-w-0">
                                <Link
                                    href={`/instructor/courses/${courseId}/chapters/${chapterId}/lesson/${lesson.id}`}
                                    className="block group/title"
                                >
                                    <h3 className="font-bold text-stone-800 group-hover/title:text-[#C5A059] transition truncate text-base">
                                        {lesson.title}
                                    </h3>
                                </Link>
                                <div className="flex items-center gap-4 mt-1 text-xs text-stone-500 flex-wrap">
                                    {lesson.transcript === "Đang được AI xử lý ngầm..." || (typeof lesson.transcript === "string" && lesson.transcript.startsWith("PROCESSING:")) ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            <Loader2 size={11} className="animate-spin text-amber-600" />
                                            {lesson.youtubeVideoId ? "Đã upload YouTube - Đang chạy AI..." : "Đang tải lên YouTube & AI xử lý..."}
                                        </span>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            lesson.youtubeVideoId 
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                : "bg-stone-100 text-stone-500 border border-stone-200"
                                        }`}>
                                            {lesson.youtubeVideoId ? "● Đã có video YouTube" : "○ Chưa có video"}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 font-medium">
                                        <FileQuestion size={13} /> {lesson._count.questions} câu hỏi
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Link
                                    href={`/instructor/courses/${courseId}/chapters/${chapterId}/lesson/${lesson.id}`}
                                    className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition"
                                >
                                    Chi tiết <ChevronRight size={14} />
                                </Link>

                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setLessonToDelete(lesson);
                                    }}
                                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                    title="Xóa bài học này"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Thanh Phân Trang Bài Học */}
            {lessons.length > LESSONS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200 mt-4 text-sm">
                    <p className="text-xs text-stone-500 font-medium">
                        Hiển thị bài <strong className="text-stone-800 font-bold">{(currentPage - 1) * LESSONS_PER_PAGE + 1}</strong> - <strong className="text-stone-800 font-bold">{Math.min(currentPage * LESSONS_PER_PAGE, lessons.length)}</strong> trong tổng số <strong className="text-stone-800 font-bold">{lessons.length}</strong> bài học
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold cursor-pointer shadow-xs"
                        >
                            Trước
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    currentPage === page
                                        ? "bg-[#C5A059] text-white shadow-xs"
                                        : "border border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-semibold cursor-pointer shadow-xs"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: Xác nhận xóa 1 bài học */}
            {lessonToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 size={20} />
                            </div>
                            <h3 className="font-serif font-bold text-lg text-stone-900">
                                Xác nhận xóa bài học?
                            </h3>
                        </div>

                        <p className="text-stone-600 text-sm mb-4 leading-relaxed">
                            Bạn có chắc chắn muốn xóa bài học{" "}
                            <span className="font-bold text-stone-900">
                                &quot;{lessonToDelete.title}&quot;
                            </span>
                            ? Toàn bộ video, câu hỏi trắc nghiệm và tiến độ học tập liên quan sẽ bị xóa vĩnh viễn.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setLessonToDelete(null)}
                                disabled={isDeletingSingle}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmDeleteSingle}
                                disabled={isDeletingSingle}
                                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                {isDeletingSingle ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Đang xóa...
                                    </>
                                ) : (
                                    "Xác nhận xóa"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Xác nhận xóa TẤT CẢ bài học */}
            {isDeleteAllOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="font-serif font-bold text-lg text-stone-900">
                                Xóa TẤT CẢ {lessons.length} bài học?
                            </h3>
                        </div>

                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold mb-4 flex items-center gap-2">
                            <AlertTriangle size={16} className="shrink-0" />
                            Cảnh báo: Hành động này không thể khôi phục!
                        </div>

                        <p className="text-stone-600 text-sm mb-5 leading-relaxed">
                            Toàn bộ <span className="font-bold text-stone-900">{lessons.length} bài học</span> trong chương{" "}
                            <span className="font-bold text-stone-900">&quot;{chapterTitle}&quot;</span> cùng mọi câu hỏi, video và tiến trình liên quan sẽ bị xóa hoàn toàn.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsDeleteAllOpen(false)}
                                disabled={isDeletingAll}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={handleConfirmDeleteAll}
                                disabled={isDeletingAll}
                                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                {isDeletingAll ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" /> Đang xóa tất cả...
                                    </>
                                ) : (
                                    `Xóa tất cả (${lessons.length})`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
