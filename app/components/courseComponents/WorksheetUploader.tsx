"use client";

import { useState } from "react";
import { UploadCloud, File, FileText, Image as ImageIcon, Loader2, CheckCircle, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { processWorksheetUpload } from "@/app/actions/quiz-worksheet";
import { toast } from "sonner";

interface WorksheetUploaderProps {
    lessonId: string;
    onUploadSuccess: () => void;
}

export default function WorksheetUploader({ lessonId, onUploadSuccess }: WorksheetUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [files, setFiles] = useState<{ id: string; file: File; status: "pending" | "uploading" | "processing" | "success" | "error"; progress: number; message?: string }[]>([]);

    const supabase = createClient();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        await handleFiles(droppedFiles);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            await handleFiles(selectedFiles);
        }
    };

    const handleFiles = async (selectedFiles: File[]) => {
        const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        const validFiles = selectedFiles.filter(f => validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024);

        if (validFiles.length < selectedFiles.length) {
            toast.error("Một số file không hợp lệ (sai định dạng hoặc quá 10MB) đã bị loại bỏ.");
        }

        if (validFiles.length === 0) return;

        const newFiles = validFiles.map(f => ({
            id: crypto.randomUUID(),
            file: f,
            status: "pending" as const,
            progress: 0
        }));

        setFiles(prev => [...prev, ...newFiles]);

        // Process sequentially to avoid overwhelming memory/network
        for (const fileObj of newFiles) {
            await uploadAndProcessFile(fileObj.id, fileObj.file);
        }
    };

    const uploadAndProcessFile = async (id: string, file: File) => {
        try {
            // 1. Upload to Supabase Storage
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "uploading", progress: 10 } : f));
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${lessonId}/${crypto.randomUUID()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("quiz-attachments")
                .upload(fileName, file, {
                    upsert: false
                });

            if (uploadError) throw new Error(uploadError.message);

            const { data: publicUrlData } = supabase.storage
                .from("quiz-attachments")
                .getPublicUrl(fileName);

            const fileUrl = publicUrlData.publicUrl;

            // 2. Process via Server Action (OCR + Regex)
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "processing", progress: 50, message: "Đang OCR và nhận diện câu hỏi..." } : f));
            setIsProcessing(true);

            const result = await processWorksheetUpload(lessonId, fileUrl, file.type);

            if (!result.success) throw new Error(result.error);

            // 3. Success
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "success", progress: 100, message: result.message } : f));
            toast.success(result.message);
            onUploadSuccess();

        } catch (error: any) {
            console.error(error);
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "error", message: error.message } : f));
            toast.error(`Lỗi xử lý file ${file.name}: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm mb-6">
            <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2 text-stone-800">
                <UploadCloud className="text-[#C5A059]" size={20} />
                Upload phiếu bài tập
            </h3>
            
            <p className="text-sm text-stone-500 mb-4">
                Hệ thống sẽ tự động quét (OCR) và trích xuất câu hỏi từ file ảnh hoặc PDF.
            </p>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    isDragging ? "border-[#C5A059] bg-[#C5A059]/5" : "border-stone-200 hover:bg-stone-50"
                }`}
            >
                <input
                    type="file"
                    id="worksheet-upload"
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                />
                <label
                    htmlFor="worksheet-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                >
                    <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
                        <UploadCloud size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-stone-700">
                            Kéo thả hoặc click để chọn file
                        </p>
                        <p className="text-xs text-stone-500 mt-1">
                            Hỗ trợ: JPEG, PNG, PDF (Tối đa 10MB/file)
                        </p>
                    </div>
                </label>
            </div>

            {files.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                    {files.map((fileObj) => (
                        <div key={fileObj.id} className="flex items-center justify-between p-3 bg-stone-50 border border-stone-100 rounded-lg">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {fileObj.file.type === "application/pdf" ? (
                                    <FileText className="text-red-500 flex-shrink-0" size={20} />
                                ) : (
                                    <ImageIcon className="text-blue-500 flex-shrink-0" size={20} />
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-stone-700 truncate">{fileObj.file.name}</p>
                                    <p className="text-xs text-stone-400">
                                        {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                                        {fileObj.message && ` • ${fileObj.message}`}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                {fileObj.status === "uploading" && <Loader2 className="animate-spin text-stone-400" size={18} />}
                                {fileObj.status === "processing" && <Loader2 className="animate-spin text-[#C5A059]" size={18} />}
                                {fileObj.status === "success" && <CheckCircle className="text-green-500" size={18} />}
                                {fileObj.status === "error" && <X className="text-red-500" size={18} />}
                                
                                {fileObj.status !== "uploading" && fileObj.status !== "processing" && (
                                    <button onClick={() => removeFile(fileObj.id)} className="p-1 text-stone-400 hover:text-stone-700">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
