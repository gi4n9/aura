"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { getLessonVideoDetails, updateLessonVideoDetails } from "@/app/actions/lesson-video";

interface LessonVideoEditorProps {
    lessonId: string;
}

export default function LessonVideoEditor({ lessonId }: LessonVideoEditorProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [videoId, setVideoId] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        fetchData();
    }, [lessonId]);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        const res = await getLessonVideoDetails(lessonId);
        if (res.success && res.data) {
            setTitle(res.data.title);
            setDescription(res.data.description);
            setVideoId(res.data.videoId);
        } else {
            setError(res.error || "Không thể tải thông tin video.");
            toast.error(res.error || "Lỗi tải video");
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!title.trim()) return toast.error("Tiêu đề không được để trống");

        setSaving(true);
        const res = await updateLessonVideoDetails(lessonId, title, description);
        setSaving(false);

        if (res.success) {
            toast.success("Đã cập nhật thông tin lên YouTube & Hệ thống!");
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-stone-500">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p>Đang tải thông tin từ YouTube...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center">
                <p className="font-bold mb-2">Đã xảy ra lỗi</p>
                <p>{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 text-sm font-medium"
                >
                    Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-stone-800">Cài đặt Video Lesson</h2>
                {videoId && (
                    <a
                        href={`https://youtu.be/${videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                    >
                        Xem trên YouTube ↗
                    </a>
                )}
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                        Tiêu đề (YouTube & Hệ thống)
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none"
                        placeholder="Nhập tiêu đề video..."
                    />
                    <p className="text-xs text-stone-500 mt-1">
                        Thay đổi này sẽ cập nhật cả tên bài học trong hệ thống và tên video trên YouTube.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                        Mô tả (YouTube Description)
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={8}
                        className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none font-mono text-sm"
                        placeholder="Nhập mô tả video..."
                    />
                    <p className="text-xs text-stone-500 mt-1">
                        Nội dung này được lưu trực tiếp trên YouTube. Hỗ trợ SEO và cung cấp thông tin cho học viên khi xem trên YouTube.
                    </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-white rounded-xl font-bold hover:bg-[#b08d4b] disabled:opacity-50 shadow-md transition-all hover:shadow-lg"
                    >
                        {saving ? (
                            <><Loader2 className="animate-spin" size={20} /> Đang đồng bộ...</>
                        ) : (
                            <><Save size={20} /> Lưu thay đổi</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
