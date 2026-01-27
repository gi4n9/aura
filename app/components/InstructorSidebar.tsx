"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react"; // Added useState
import {
    LayoutDashboard,
    Settings,
    FileVideo,
    FileQuestion,
    ChevronDown,
    PenTool
} from "lucide-react";
import QuizModal from "./courseComponents/QuizModal"; // Import Modal

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}

export default function InstructorSidebar({
    course
}: {
    course: any
}) {
    const pathname = usePathname();
    // Start with null state
    const [editingQuiz, setEditingQuiz] = useState<{ lessonId: string, lessonTitle: string } | null>(null);

    return (
        <>
            <div className="flex flex-col w-full h-full bg-white border-r border-stone-200 overflow-y-auto relative z-0">
                {/* 1. Header Sidebar */}
                <div className="p-6 border-b border-stone-100">
                    <h2 className="font-bold text-lg text-slate-900 line-clamp-2">
                        {course.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase font-semibold tracking-wider">
                        Trang quản lý
                    </p>
                </div>

                {/* 2. Menu Cài đặt chung */}
                <div className="flex flex-col py-4">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Tổng quan khóa học"
                        href={`/instructor/courses/${course.id}`}
                        isActive={pathname === `/instructor/courses/${course.id}`}
                    />
                    <SidebarItem
                        icon={Settings}
                        label="Cài đặt (Tên, Giá, Ảnh)"
                        href={`/instructor/courses/${course.id}/settings`}
                        isActive={pathname.endsWith("/settings")}
                    />
                </div>

                {/* 3. Menu Nội dung (Curriculum) */}
                <div className="px-6 pt-4 pb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Nội dung học
                    </h3>
                </div>

                <div className="flex-1 pb-10">
                    {course.chapters.map((chapter: any) => (
                        <div key={chapter.id} className="mb-2">
                            {/* Tên Chương */}
                            <div className="px-6 py-2 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-600 uppercase border-y border-slate-50">
                                <span className="line-clamp-1">{chapter.title}</span>
                                <ChevronDown size={12} />
                            </div>

                            {/* Danh sách bài học trong chương */}
                            <div className="flex flex-col mt-1">
                                {chapter.lessons.map((lesson: any) => {
                                    // Xác định đường dẫn active
                                    const isLessonActive = pathname.includes(`/lesson/${lesson.id}`);
                                    const isEditActive = pathname.includes(`/lesson/${lesson.id}/settings`);

                                    return (
                                        <div key={lesson.id} className={cn(
                                            "relative group transition-colors",
                                            isLessonActive ? "bg-indigo-50/50" : "hover:bg-slate-50"
                                        )}>
                                            {/* Tên bài học */}
                                            <div className="flex items-center px-6 py-2 gap-2 text-sm text-slate-700">
                                                <FileVideo size={16} className={isLessonActive ? "text-indigo-600" : "text-slate-400"} />
                                                <span className={cn("line-clamp-1 font-medium", isLessonActive && "text-indigo-700")}>
                                                    {lesson.title}
                                                </span>
                                            </div>

                                            {/* Sub-menu: Edit & Quiz (Chỉ hiện các nút hành động nhỏ bên dưới bài học) */}
                                            <div className="flex items-center gap-1 pl-10 pr-4 pb-2">
                                                {/* Nút Sửa nội dung */}
                                                <Link
                                                    href={`/instructor/courses/${course.id}/chapters/${chapter.id}/lesson/${lesson.id}`}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border",
                                                        isEditActive
                                                            ? "bg-white border-indigo-200 text-indigo-700 font-medium shadow-sm"
                                                            : "border-transparent text-slate-500 hover:bg-white hover:border-slate-200 hover:shadow-sm"
                                                    )}
                                                    title="Sửa nội dung bài học"
                                                >
                                                    <PenTool size={12} /> Sửa bài
                                                </Link>

                                                {/* Nút Sửa Quiz (MODAL TRIGGER) */}
                                                <button
                                                    onClick={() => setEditingQuiz({ lessonId: lesson.id, lessonTitle: lesson.title })}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border border-transparent text-slate-500 hover:bg-white hover:border-slate-200 hover:shadow-sm hover:text-indigo-600"
                                                    title="Quản lý trắc nghiệm (Popup)"
                                                >
                                                    <FileQuestion size={12} /> Quiz
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL OVERLAY */}
            {editingQuiz && (
                <QuizModal
                    lessonId={editingQuiz.lessonId}
                    lessonTitle={editingQuiz.lessonTitle}
                    onClose={() => setEditingQuiz(null)}
                />
            )}
        </>
    );
}

// Component item menu nhỏ gọn
function SidebarItem({ icon: Icon, label, href, isActive }: any) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-x-3 pl-6 py-3 text-sm font-medium transition-all hover:text-indigo-600 hover:bg-slate-50",
                isActive
                    ? "text-indigo-700 bg-indigo-50 border-r-4 border-indigo-700"
                    : "text-slate-600"
            )}
        >
            <Icon size={20} />
            {label}
        </Link>
    );
}
