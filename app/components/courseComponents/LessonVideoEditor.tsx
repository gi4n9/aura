"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, RefreshCw, Video, Upload, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getLessonVideoDetails, updateLessonVideoDetails } from "@/app/actions/lesson-video";

interface LessonVideoEditorProps {
    lessonId: string;
    youtubeVideoId?: string | null;
    isAIProcessing?: boolean;
}

export default function LessonVideoEditor({ lessonId, youtubeVideoId, isAIProcessing }: LessonVideoEditorProps) {
    const [loading, setLoading] = useState(Boolean(youtubeVideoId));
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [videoId, setVideoId] = useState(youtubeVideoId || "");
    const [error, setError] = useState("");

    useEffect(() => {
        if (youtubeVideoId) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [lessonId, youtubeVideoId]);

    const fetchData = async () => {
        setLoading(true);
        setError("");
        const res = await getLessonVideoDetails(lessonId);
        if (res.success && res.data) {
            setTitle(res.data.title);
            setDescription(res.data.description);
            setVideoId(res.data.videoId);
        } else {
            setError(res.error || "Không thể tải thông tin chi tiết từ YouTube API.");
            // Don't toast error on simple sync failure, as video might be external or YouTube API not configured
            if (youtubeVideoId) {
                setVideoId(youtubeVideoId);
            }
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

    // Trường hợp 1: Bài học chưa có video
    if (!youtubeVideoId && !videoId) {
        if (isAIProcessing) {
            return (
                <div className="bg-white p-10 rounded-2xl border border-stone-200 shadow-sm max-w-4xl mx-auto text-center animate-in fade-in duration-300">
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Loader2 size={28} className="animate-spin" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-1">Video đang được xử lý ngầm</h3>
                    <p className="text-stone-500 text-sm max-w-md mx-auto">
                        Hệ thống đang tải video lên YouTube và hoàn tất các phân tích AI. Khi hoàn tất, link video sẽ tự động hiển thị tại đây.
                    </p>
                </div>
            );
        }

        return (
            <div className="bg-white p-10 rounded-2xl border border-stone-200 shadow-sm max-w-4xl mx-auto text-center">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
                    <Video size={28} />
                </div>
                <h3 className="text-lg font-bold text-stone-800 mb-1">Chưa có video bài giảng</h3>
                <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
                    Bài học này hiện chưa được gắn video YouTube. Sau khi tải video lên, bạn có thể chỉnh sửa tiêu đề và mô tả trực tiếp tại đây.
                </p>
                <Link
                    href="/instructor/upload"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C5A059] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[#b5914a] transition"
                >
                    <Upload size={16} /> Tải video lên bài học
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200 shadow-sm max-w-4xl mx-auto">
                <Loader2 className="animate-spin mb-2 text-[#C5A059]" size={32} />
                <p className="text-sm font-medium">Đang tải thông tin từ YouTube...</p>
            </div>
        );
    }

    // Trường hợp 2: Lỗi API nhưng có videoId -> Vẫn hiển thị video player và giải thích
    if (error) {
        const currentVid = videoId || youtubeVideoId;
        return (
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm max-w-4xl mx-auto space-y-5">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-stone-800">Video bài giảng</h2>
                    {currentVid && (
                        <a
                            href={`https://youtu.be/${currentVid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:underline text-sm font-medium"
                        >
                            Xem trên YouTube <ExternalLink size={14} />
                        </a>
                    )}
                </div>

                {/* Embedded Video */}
                {currentVid && (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-sm">
                        <iframe
                            src={`https://www.youtube.com/embed/${currentVid}`}
                            title="YouTube video player"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                )}

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 text-sm flex items-start gap-3">
                    <AlertCircle size={18} className="text-stone-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-stone-700 mb-0.5">Lưu ý đồng bộ YouTube</p>
                        <p className="text-xs text-stone-500 leading-relaxed">
                            Video đang phát bình thường trong hệ thống. Tính năng chỉnh sửa trực tiếp tiêu đề/mô tả trên YouTube yêu cầu kênh YouTube sở hữu bài giảng được liên kết qua OAuth API.
                        </p>
                    </div>
                </div>
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
                        className="w-full p-3 border border-stone-300 text-stone-900 bg-white rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none font-medium"
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
                        className="w-full p-3 border border-stone-300 text-stone-900 bg-white rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none font-mono text-sm"
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
