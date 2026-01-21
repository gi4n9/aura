"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, UploadCloud, CheckCircle, Video, List } from "lucide-react";
import { processVideoUpload } from "../../actions/process-video";
import { getChapterByCourseId } from "../../actions/chapter";
import { useRouter } from "next/navigation";

// Định nghĩa kiểu dữ liệu cho props
interface Option {
    id: string;
    title: string;
}

// Nhận thêm props playlists
export default function UploadVideoForm({ playlists }: { playlists: Option[] }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);

    // State quản lý chọn Course & Chapter
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [chapters, setChapters] = useState<Option[]>([]);
    const [selectedChapterId, setSelectedChapterId] = useState("");

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    // Hàm sanitize tên file (giữ nguyên như cũ)
    function sanitizeFileName(str: string) {
        return String(str)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .replace(/\s+/g, "-").replace(/[^\w\-\.]/g, "").toLowerCase();
    }

    const handleCourseChange = async (courseId: string) => {
        setSelectedCourseId(courseId);
        setSelectedChapterId(""); // Reset chapter cũ
        setChapters([]);

        if (courseId) {
            const data = await getChapterByCourseId(courseId);
            setChapters(data);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedCourseId || !selectedChapterId) { // Kiểm tra phải chọn khóa học và chương mới cho upload
            alert("Vui lòng chọn khóa học và video!");
            return;
        }

        setLoading(true);
        setStatus("Đang tải lên Server đệm...");

        try {
            const supabase = createClient();
            const cleanName = sanitizeFileName(file.name);
            const fileName = `${Date.now()}-${cleanName}`;

            // 1. Upload Supabase
            const { error } = await supabase.storage.from("videos").upload(fileName, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(fileName);

            setStatus("Đang xử lý YouTube & AI...");

            // 2. Gọi Server Action với selectedPlaylistId
            const result = await processVideoUpload(
                publicUrl,
                fileName,
                file.name.replace(".mp4", ""),
                selectedChapterId
            );

            if (!result.success) throw new Error(result.error);

            setStatus("Thành công! Video đã được thêm vào khóa học.");
            if (result.lessonId) {
                router.push(`/instructor/lesson/${result.lessonId}`)
            }
            setFile(null);

        } catch (err: any) {
            console.error(err);
            setStatus(`Lỗi: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border-2 border-dashed border-stone-300 rounded-xl bg-stone-50">

            {/* 1. Phần chọn khóa học */}
            <div className="mb-6 text-left">
                <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <Video size={16} /> Chọn khóa học
                </label>
                <select
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    disabled={loading}
                    className="w-full p-3 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-[#C5A059] outline-none"
                >
                    <option value="">-- Vui lòng chọn một khóa học --</option>
                    {playlists.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.title}
                        </option>
                    ))}
                </select>
                {playlists.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Chưa có khóa học nào. Hãy tạo khóa học trước.</p>
                )}
            </div>

            {/* 2. Chọn Chương */}
            {selectedCourseId && (
                <div className="mb-6 text-left animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                        <List size={16} /> Chọn chương học
                    </label>
                    <select
                        value={selectedChapterId}
                        onChange={(e) => setSelectedChapterId(e.target.value)}
                        disabled={loading}
                        className="w-full p-3 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-[#C5A059] outline-none"
                    >
                        <option value="">-- Chọn chương để thêm video --</option>
                        {chapters.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                    {chapters.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                            Khóa học này chưa có chương nào. Hãy tạo chương trong phần "Chỉnh sửa khóa học" trước.
                        </p>
                    )}
                </div>
            )}

            {/* 3. Phần chọn file */}
            {!loading ? (
                <div className="flex flex-col items-center gap-4">
                    <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                    <button
                        onClick={handleUpload}
                        // Disable nút nếu chưa chọn file HOẶC chưa chọn khóa học
                        disabled={!file || !selectedCourseId || !selectedChapterId}
                        className="bg-[#1a1a1a] text-white px-6 py-2 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full justify-center"
                    >
                        <UploadCloud size={20} /> Bắt đầu Upload
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center py-6 text-[#C5A059]">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p className="font-medium animate-pulse">{status}</p>
                </div>
            )}

            {status.includes("Thành công") && (
                <div className="mt-4 text-green-600 flex items-center justify-center gap-2 font-bold">
                    <CheckCircle /> {status}
                </div>
            )}
        </div>
    );
}