"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, UploadCloud, CheckCircle, Video, List, Clock, Zap, Timer } from "lucide-react";
import { processVideoUpload, cleanupFailedUpload } from "../../actions/process-video";
import { getChapterByCourseId } from "../../actions/chapter";
import { useRouter } from "next/navigation";

// Định nghĩa kiểu dữ liệu cho props
interface Option {
    id: string;
    title: string;
}

// --- Helper: Format thời gian dễ đọc ---
function formatETA(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return "Đang tính...";
    if (seconds < 60) return `~${Math.ceil(seconds)} giây`;
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.ceil(seconds % 60);
        return `~${mins} phút ${secs > 0 ? secs + " giây" : ""}`;
    }
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.ceil((seconds % 3600) / 60);
    return `~${hrs} giờ ${mins} phút`;
}

// --- Helper: Format file size ---
function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// --- Constants cho ETA ---
type ProcessingPhase = "idle" | "uploading" | "merging" | "extracting" | "ai_processing" | "saving" | "done" | "error";

const PHASE_LABELS: Record<ProcessingPhase, string> = {
    idle: "Chờ bắt đầu",
    uploading: "Đang tải lên Server đệm",
    merging: "Ghép file & trích xuất Audio",
    extracting: "Phát hiện scene changes",
    ai_processing: "YouTube & Gemini AI đang xử lý",
    saving: "Lưu kết quả vào Database",
    done: "Hoàn tất!",
    error: "Lỗi",
};

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
    const [progress, setProgress] = useState(0);

    // --- ETA State ---
    const [phase, setPhase] = useState<ProcessingPhase>("idle");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [etaSeconds, setEtaSeconds] = useState(0);
    const [uploadSpeed, setUploadSpeed] = useState(0); // bytes/second

    const startTimeRef = useRef<number>(0);
    const uploadStartRef = useRef<number>(0);
    const bytesUploadedRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Elapsed time counter
    useEffect(() => {
        if (loading && startTimeRef.current > 0) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [loading]);

    // Estimate ETA cho phase Foreground processing (local FFmpeg)
    const estimateProcessingTime = useCallback((fileSizeBytes: number): number => {
        const sizeMB = fileSizeBytes / (1024 * 1024);
        // Trích xuất Audio và Scene Detection Keyframes vẫn tốn chút thời gian decode
        // Công thức thực tế: ~45s cho mỗi 100MB + 30s base
        return Math.ceil((sizeMB / 100) * 45) + 30;
    }, []);

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
        if (!file || !selectedCourseId || !selectedChapterId) {
            alert("Vui lòng chọn khóa học và video!");
            return;
        }

        setLoading(true);
        setPhase("uploading");
        setElapsedSeconds(0);
        setEtaSeconds(0);
        setUploadSpeed(0);
        startTimeRef.current = Date.now();
        uploadStartRef.current = Date.now();
        bytesUploadedRef.current = 0;
        setStatus("Đang tải lên Server đệm...");

        // 1. Chia nhỏ file (Chunking) & Upload trực tiếp lên Server
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB mỗi chunk (đảm bảo qua mặt mọi giới hạn body size của Next.js)

        try {
            const cleanName = sanitizeFileName(file.name);
            const fileName = `${Date.now()}-${cleanName}`;
            
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            let chunksUploaded = 0;

            setStatus(`Đang chuẩn bị băm file thành ${totalChunks} phần...`);

            const uploadChunk = async (chunkIndex: number) => {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunkBlob = file.slice(start, end);
                const chunkSize = end - start;

                // Upload trực tiếp lên Server qua API Route (không qua Supabase)
                const response = await fetch("/api/upload-chunk", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "x-file-name": fileName,
                        "x-chunk-index": String(chunkIndex),
                    },
                    body: chunkBlob,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Lỗi server" }));
                    throw new Error(`Lỗi tải lên phần ${chunkIndex + 1}: ${errorData.error}`);
                }

                chunksUploaded++;
                bytesUploadedRef.current += chunkSize;

                // Tính upload speed và ETA
                const elapsedUpload = (Date.now() - uploadStartRef.current) / 1000;
                const currentSpeed = bytesUploadedRef.current / elapsedUpload;
                setUploadSpeed(currentSpeed);

                const remainingBytes = file.size - bytesUploadedRef.current;
                const uploadETA = remainingBytes / currentSpeed;
                const processingETA = estimateProcessingTime(file.size);
                setEtaSeconds(Math.ceil(uploadETA + processingETA));

                const percentage = ((chunksUploaded / totalChunks) * 100).toFixed(2);
                setProgress(Number(percentage));
                setStatus(`Đang tải lên... ${percentage}% (${chunksUploaded}/${totalChunks})`);
            };

            // Upload theo batch song song
            const CONCURRENCY = 5;
            for (let i = 0; i < totalChunks; i += CONCURRENCY) {
                const batch = [];
                for (let j = 0; j < CONCURRENCY && i + j < totalChunks; j++) {
                    batch.push(uploadChunk(i + j));
                }
                await Promise.all(batch);
            }

            // Phase 2: Server processing
            setPhase("ai_processing");
            setProgress(100);
            const processingETA = estimateProcessingTime(file.size);
            setEtaSeconds(processingETA);
            setStatus("Đang xử lý cục bộ: Ghép file → Trích xuất Audio → Smart Keyframes...");

            // 3. Gọi Server Action để lắp ghép và xử lý
            const result = await processVideoUpload(
                fileName,
                totalChunks,
                file.name.replace(".mp4", ""),
                selectedChapterId
            );

            if (!result.success) throw new Error(result.error);

            setPhase("done");
            setEtaSeconds(0);
            setStatus("Thành công! Video đang được AI phân tích ngầm.");
            if (result.lessonId) {
                router.push(`/instructor/courses/${selectedCourseId}/chapters/${selectedChapterId}/lesson/${result.lessonId}`)
            }
            setFile(null);

        } catch (err: any) {
            console.error(err);
            setPhase("error");
            setStatus(`Lỗi: ${err.message}`);
            // Xóa file rác trên server
            if (file) {
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                const fileName = sanitizeFileName(file.name.replace(".mp4", ""));
                cleanupFailedUpload(fileName, totalChunks).catch(console.error);
            }
        } finally {
            setLoading(false);
            setProgress(0);
            if (timerRef.current) clearInterval(timerRef.current);
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
                    className="w-full p-3 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-[#C5A059] outline-none font-medium"
                >
                    <option value="" className="text-stone-900">-- Vui lòng chọn một khóa học --</option>
                    {playlists.map((p) => (
                        <option key={p.id} value={p.id} className="text-stone-900">
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
                        className="w-full p-3 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-[#C5A059] outline-none font-medium"
                    >
                        <option value="" className="text-stone-900">-- Chọn chương để thêm video --</option>
                        {chapters.map((c) => (
                            <option key={c.id} value={c.id} className="text-stone-900">
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

            {/* 3. File info preview */}
            {file && !loading && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                        <Video size={16} className="text-[#C5A059]" />
                        <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="font-mono bg-stone-100 px-2 py-1 rounded">{formatSize(file.size)}</span>
                        <span className="flex items-center gap-1">
                            <Timer size={12} />
                            Ước tính: {formatETA(estimateProcessingTime(file.size) + (file.size / (5 * 1024 * 1024)))}
                        </span>
                    </div>
                </div>
            )}

            {/* 4. Phần chọn file + Upload */}
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
                        disabled={!file || !selectedCourseId || !selectedChapterId}
                        className="bg-[#1a1a1a] text-white px-6 py-2 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full justify-center"
                    >
                        <UploadCloud size={20} /> Bắt đầu Upload
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center py-6">
                    {/* Spinner + Status */}
                    <Loader2 className="animate-spin mb-3 text-[#C5A059]" size={36} />
                    <p className="font-medium text-stone-800 mb-1 text-center">{status}</p>

                    {/* Phase indicator */}
                    <div className="flex items-center gap-2 text-xs text-stone-500 mb-4">
                        <span className="inline-flex items-center gap-1 bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded-full font-semibold">
                            <Zap size={10} />
                            {PHASE_LABELS[phase]}
                        </span>
                    </div>
                    
                    {/* Progress bar */}
                    {progress > 0 && progress <= 100 && (
                        <div className="w-full max-w-sm bg-stone-200 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
                            <div 
                                className="bg-gradient-to-r from-[#C5A059] to-[#e9c176] h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden" 
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
                            </div>
                        </div>
                    )}

                    {/* ETA & Stats Panel */}
                    <div className="w-full max-w-sm grid grid-cols-2 gap-2 text-xs">
                        {/* Elapsed time */}
                        <div className="bg-white rounded-lg p-2.5 border border-stone-200 flex items-center gap-2">
                            <Clock size={14} className="text-stone-400" />
                            <div>
                                <p className="text-stone-400 font-medium">Đã chạy</p>
                                <p className="text-stone-700 font-bold font-mono">{formatETA(elapsedSeconds)}</p>
                            </div>
                        </div>

                        {/* ETA */}
                        <div className="bg-white rounded-lg p-2.5 border border-stone-200 flex items-center gap-2">
                            <Timer size={14} className="text-[#C5A059]" />
                            <div>
                                <p className="text-stone-400 font-medium">Còn lại</p>
                                <p className="text-[#C5A059] font-bold font-mono">{formatETA(etaSeconds)}</p>
                            </div>
                        </div>

                        {/* Upload speed (only during upload phase) */}
                        {phase === "uploading" && uploadSpeed > 0 && (
                            <>
                                <div className="bg-white rounded-lg p-2.5 border border-stone-200 flex items-center gap-2">
                                    <Zap size={14} className="text-green-500" />
                                    <div>
                                        <p className="text-stone-400 font-medium">Tốc độ</p>
                                        <p className="text-green-600 font-bold font-mono">{formatSize(uploadSpeed)}/s</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-2.5 border border-stone-200 flex items-center gap-2">
                                    <UploadCloud size={14} className="text-blue-500" />
                                    <div>
                                        <p className="text-stone-400 font-medium">Đã tải</p>
                                        <p className="text-blue-600 font-bold font-mono">{formatSize(bytesUploadedRef.current)} / {file ? formatSize(file.size) : ""}</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* AI processing phase info */}
                        {phase === "ai_processing" && (
                            <div className="col-span-2 bg-gradient-to-r from-purple-50 to-amber-50 rounded-lg p-3 border border-purple-100 text-center">
                                <p className="text-purple-700 font-medium text-[11px]">
                                    🎵 Audio → 📸 Scene Detection → 🎬 YouTube → 🤖 Gemini AI → 💾 Database
                                </p>
                                <p className="text-stone-500 mt-1 text-[10px]">
                                    Quá trình này diễn ra tự động trên server. Vui lòng không đóng trang.
                                </p>
                            </div>
                        )}
                    </div>
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