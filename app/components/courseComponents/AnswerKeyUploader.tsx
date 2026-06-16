"use client";

import { useState } from "react";
import { UploadCloud, File, FileText, Image as ImageIcon, CheckCircle, X, Key } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { processAnswerKeyUpload } from "@/app/actions/quiz-worksheet";
import { toast } from "sonner";

interface AnswerKeyUploaderProps {
    lessonId: string;
    onUploadSuccess: () => void;
}

export default function AnswerKeyUploader({ lessonId, onUploadSuccess }: AnswerKeyUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [examCode, setExamCode] = useState("");
    const [fileStatus, setFileStatus] = useState<{ name: string; status: "pending" | "processing" | "success" | "error"; message?: string } | null>(null);

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
        if (droppedFiles.length > 0) {
            await handleFile(droppedFiles[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (selectedFile: File) => {
        const validTypes = [
            "image/jpeg", "image/png", "image/webp", 
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
            "application/vnd.ms-excel", // .xls
            "text/csv"
        ];
        
        if (!validTypes.includes(selectedFile.type)) {
            toast.error("Vui lòng tải lên file ảnh (JPG, PNG) hoặc Excel (XLSX, CSV).");
            return;
        }
        
        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error("File không được vượt quá 10MB.");
            return;
        }

        setFileStatus({ name: selectedFile.name, status: "pending", message: "Đang tải lên..." });
        setIsProcessing(true);

        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${lessonId}/answer-key-${crypto.randomUUID()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("quiz-attachments")
                .upload(fileName, selectedFile, { upsert: false });

            if (uploadError) throw new Error(uploadError.message);

            const { data: publicUrlData } = supabase.storage
                .from("quiz-attachments")
                .getPublicUrl(fileName);

            setFileStatus({ name: selectedFile.name, status: "processing", message: "AI đang phân tích bảng đáp án..." });

            const result = await processAnswerKeyUpload(lessonId, publicUrlData.publicUrl, selectedFile.type, examCode);

            if (!result.success) throw new Error(result.error);

            setFileStatus({ name: selectedFile.name, status: "success", message: "Hoàn tất!" });
            toast.success(result.message);
            onUploadSuccess();

        } catch (error: any) {
            setFileStatus({ name: selectedFile.name, status: "error", message: error.message });
            toast.error(error.message || "Lỗi khi xử lý file đáp án");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Key className="text-emerald-600" size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 text-lg">Upload Bảng đáp án</h3>
                    <p className="text-sm text-slate-500">Tải lên ảnh hoặc file Excel để tự động điền đáp án.</p>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã đề thi (Tùy chọn)</label>
                <input 
                    type="text" 
                    placeholder="Ví dụ: 0525" 
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={isProcessing}
                />
                <p className="text-xs text-slate-500 mt-1">Hệ thống sẽ chỉ lấy cột đáp án của mã đề này.</p>
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all relative
                    ${isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"}
                    ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
            >
                <input
                    type="file"
                    accept="image/*,.xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isProcessing}
                />

                <UploadCloud className="mx-auto text-emerald-400 mb-3" size={32} />
                <p className="font-medium text-slate-700 mb-1">
                    Kéo thả hoặc click để chọn file
                </p>
                <p className="text-xs text-slate-500">
                    Hỗ trợ: Ảnh (JPG, PNG), Excel (.xlsx, .csv)
                </p>
            </div>

            {fileStatus && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            {fileStatus.name.includes("xls") || fileStatus.name.includes("csv") ? (
                                <FileText size={16} className="text-emerald-600" />
                            ) : (
                                <ImageIcon size={16} className="text-emerald-600" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 line-clamp-1">{fileStatus.name}</p>
                            <p className={`text-xs ${fileStatus.status === "error" ? "text-red-500" : "text-emerald-600"}`}>
                                {fileStatus.message}
                            </p>
                        </div>
                    </div>
                    {fileStatus.status === "success" && <CheckCircle className="text-emerald-500" size={20} />}
                    {fileStatus.status === "error" && <X className="text-red-500" size={20} />}
                </div>
            )}
        </div>
    );
}
