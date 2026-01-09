"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, UploadCloud, CheckCircle, Video } from "lucide-react";
import { processVideoUpload } from "../actions/process-video";

// Định nghĩa kiểu dữ liệu cho props
interface PlaylistOption {
    id: string;
    title: string;
}

// Nhận thêm props playlists
export default function UploadVideoForm({ playlists }: { playlists: PlaylistOption[] }) {
    const [file, setFile] = useState<File | null>(null);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(""); // State lưu ID khóa học được chọn
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    // Hàm sanitize tên file (giữ nguyên như cũ)
    function sanitizeFileName(str: string) {
        return String(str)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .replace(/\s+/g, "-").replace(/[^\w\-\.]/g, "").toLowerCase();
    }

    const handleUpload = async () => {
        if (!file || !selectedPlaylistId) { // Kiểm tra phải chọn khóa học mới cho upload
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
                selectedPlaylistId // <--- Truyền ID khóa học người dùng chọn
            );

            if (!result.success) throw new Error(result.error);

            setStatus("Thành công! Video đã được thêm vào khóa học.");
            setFile(null);
            // setSelectedPlaylistId(""); // Có thể reset hoặc giữ nguyên để up tiếp bài 2

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
                    value={selectedPlaylistId}
                    onChange={(e) => setSelectedPlaylistId(e.target.value)}
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

            {/* 2. Phần chọn file (Giữ nguyên) */}
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
                        disabled={!file || !selectedPlaylistId}
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