'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, BookOpen, Loader2, Users, ShieldCheck, Lock } from 'lucide-react';
import { createGroup } from '@/app/actions/community-actions';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { toast } from 'sonner';

interface Course {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
}

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    enrolledCourses: Course[]; // Danh sách khóa học của user (đã đăng ký hoặc là giảng viên)
    isInstructor?: boolean;    // Giảng viên hay học viên
}

export default function CreateGroupModal({ isOpen, onClose, enrolledCourses, isInstructor = false }: CreateGroupModalProps) {
    const router = useRouter();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === "dark";

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [isPublic, setIsPublic] = useState(true);
    const [inviteInstructors, setInviteInstructors] = useState(true);
    const [loading, setLoading] = useState(false);

    // Reset form khi đóng
    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDescription('');
            setSelectedCourseIds([]);
            setIsPublic(true);
            setInviteInstructors(true);
        }
    }, [isOpen]);

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error(t("community.errorNameRequired", "Vui lòng nhập tên nhóm"));
            return;
        }
        if (selectedCourseIds.length === 0) {
            toast.error(t("community.errorCourseRequired", "Vui lòng chọn ít nhất 1 khóa học"));
            return;
        }

        setLoading(true);
        const result = await createGroup({
            name: name.trim(),
            description: description.trim(),
            courseIds: selectedCourseIds,
            isPublic,
            inviteInstructors: !isInstructor && inviteInstructors // Chỉ gửi lời mời nếu là học viên
        });
        setLoading(false);

        if (result.success && result.groupId) {
            toast.success(t("community.groupCreated", "Tạo nhóm thành công!"));
            onClose();
            if (isInstructor) {
                router.refresh();
            } else {
                router.push(`/community/${result.groupId}`);
            }
        } else {
            toast.error(result.error || t("community.errorGeneric", "Có lỗi xảy ra"));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col ${
                isDark ? "bg-[#0e0e0e] border border-white/10 text-white" : "bg-white text-stone-900"
            }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-5 border-b flex-shrink-0 ${isDark ? "border-white/10" : "border-stone-200"}`}>
                    <h2 className="font-serif font-bold text-lg flex items-center gap-2">
                        <Users size={20} className="text-[#C5A059]" />
                        {t("community.createGroupTitle", "Tạo nhóm học tập")}
                    </h2>
                    <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-white/10 text-stone-400" : "hover:bg-stone-100 text-stone-500"}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Tên nhóm */}
                    <div>
                        <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            {t("community.groupName", "Tên nhóm")} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t("community.groupNamePlaceholder", "VD: Flutter Study Group")}
                            maxLength={100}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:border-[#C5A059] ${
                                isDark ? "bg-white/5 border-white/10 text-white placeholder-stone-500" : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                            }`}
                        />
                    </div>

                    {/* Mô tả */}
                    <div>
                        <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            {t("community.description", "Mô tả")}
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t("community.descriptionPlaceholder", "Mô tả ngắn về mục tiêu hoặc nội dung thảo luận của nhóm...")}
                            rows={3}
                            maxLength={500}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:border-[#C5A059] resize-none ${
                                isDark ? "bg-white/5 border-white/10 text-white placeholder-stone-500" : "bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                            }`}
                        />
                    </div>

                    {/* Chọn khóa học */}
                    <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            {t("community.selectCourses", "Liên kết khóa học")} <span className="text-red-500">*</span>
                        </label>
                        {enrolledCourses.length === 0 ? (
                            <p className={`text-xs italic ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                                {t("community.noCoursesAvailable", "Bạn chưa đăng ký khóa học nào.")}
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {enrolledCourses.map(course => {
                                    const isSelected = selectedCourseIds.includes(course.id);
                                    return (
                                        <button
                                            type="button"
                                            key={course.id}
                                            onClick={() => toggleCourse(course.id)}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border flex items-center gap-3 transition-all ${
                                                isSelected
                                                    ? isDark
                                                        ? "border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]"
                                                        : "border-[#C5A059] bg-[#C5A059]/5 text-stone-900"
                                                    : isDark
                                                        ? "border-white/10 bg-white/[0.02] text-stone-300 hover:bg-white/5"
                                                        : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                isSelected ? "border-[#C5A059] bg-[#C5A059] text-white" : isDark ? "border-stone-600" : "border-stone-300"
                                            }`}>
                                                {isSelected && <span className="text-xs font-bold">✓</span>}
                                            </div>
                                            <BookOpen size={14} className="flex-shrink-0 text-[#C5A059]" />
                                            <span className="truncate font-medium">{course.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <p className={`text-xs mt-1.5 ${isDark ? "text-stone-500" : "text-stone-400"}`}>
                            {t("community.selectedCount", `Đã chọn ${selectedCourseIds.length} khóa học`)}
                        </p>
                    </div>

                    {/* Loại nhóm: Công khai / Riêng tư */}
                    <div>
                        <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                            {t("community.groupType", "Loại nhóm")}
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setIsPublic(true)}
                                className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                    isPublic
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : isDark
                                            ? "border-white/10 text-stone-400 hover:bg-white/5"
                                            : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                }`}
                            >
                                <ShieldCheck size={16} />
                                {t("community.public", "Công khai")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPublic(false)}
                                className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                    !isPublic
                                        ? "border-amber-500 bg-amber-50 text-amber-700"
                                        : isDark
                                            ? "border-white/10 text-stone-400 hover:bg-white/5"
                                            : "border-stone-200 text-stone-500 hover:bg-stone-50"
                                }`}
                            >
                                <Lock size={16} />
                                {t("community.private", "Riêng tư")}
                            </button>
                        </div>
                    </div>

                    {/* Mời giảng viên (chỉ hiện cho học viên) */}
                    {!isInstructor && (
                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? "border-white/10 bg-white/[0.02]" : "border-stone-200 bg-stone-50"}`}>
                            <input
                                type="checkbox"
                                id="inviteInstructors"
                                checked={inviteInstructors}
                                onChange={e => setInviteInstructors(e.target.checked)}
                                className="w-4 h-4 accent-[#C5A059] rounded"
                            />
                            <label htmlFor="inviteInstructors" className={`text-sm font-medium cursor-pointer ${isDark ? "text-stone-300" : "text-stone-700"}`}>
                                {t("community.inviteInstructors", "Tự động mời giảng viên các khóa học vào nhóm")}
                            </label>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className={`flex gap-3 p-5 border-t flex-shrink-0 ${isDark ? "border-white/10" : "border-stone-200"}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={`flex-1 py-2.5 font-bold text-sm rounded-xl transition-colors ${
                            isDark ? "bg-white/5 text-stone-300 hover:bg-white/10" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                        }`}
                    >
                        {t("common.cancel", "Hủy")}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !name.trim() || selectedCourseIds.length === 0}
                        className={`flex-1 py-2.5 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
                            loading || !name.trim() || selectedCourseIds.length === 0
                                ? "bg-stone-300 text-stone-500 cursor-not-allowed"
                                : "bg-[#C5A059] text-white hover:bg-[#b08d4b] active:scale-95"
                        }`}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t("community.createBtn", "Tạo nhóm")}
                    </button>
                </div>
            </div>
        </div>
    );
}
