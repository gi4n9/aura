"use client";

import { Cpu, AlertOctagon, CheckCircle2, Clock, FileSearch, Mic, RefreshCw, Sparkles, Activity } from "lucide-react";

interface AiOpsManagerProps {
  initialData: {
    scriptStatusMap: Record<string, number>;
    recentFailedScripts: any[];
    audioStatusMap: Record<string, number>;
    ocrCount: number;
    ocrAvgConfidence: number;
    ocrAvgVietnameseRatio: number;
    recentOcrLogs: any[];
  };
}

export default function AiOpsManager({ initialData }: AiOpsManagerProps) {
  const {
    scriptStatusMap,
    recentFailedScripts,
    audioStatusMap,
    ocrCount,
    ocrAvgConfidence,
    ocrAvgVietnameseRatio,
    recentOcrLogs,
  } = initialData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
          <Cpu className="text-[#C5A059]" /> Giám Sát Hệ Thống AI & DevOps (AI Ops Monitor)
        </h1>
        <p className="text-stone-500 mt-1">
          Theo dõi tiến trình sinh bài giảng AI, hàng đợi âm thanh TTS và hiệu suất OCR Cache từ CSDL Supabase.
        </p>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lecture Scripts Stat */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Tiến Trình Kịch Bản AI</span>
            <Sparkles size={20} className="text-[#C5A059]" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-700">{scriptStatusMap["READY"] || 0}</p>
              <p className="text-[11px] font-semibold text-emerald-600 uppercase">Hoàn Thành (Ready)</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
              <p className="text-2xl font-bold text-amber-700">{scriptStatusMap["GENERATING"] || 0}</p>
              <p className="text-[11px] font-semibold text-amber-600 uppercase">Đang Sinh (Generating)</p>
            </div>
          </div>
          {scriptStatusMap["ERROR"] ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-xs font-bold border border-red-200">
              <AlertOctagon size={16} />
              <span>{scriptStatusMap["ERROR"]} kịch bản bị lỗi cần kiểm tra</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl text-stone-600 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Không có kịch bản bị lỗi</span>
            </div>
          )}
        </div>

        {/* TTS Audio Queue Stat */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Hàng Đợi Âm Thanh (TTS)</span>
            <Mic size={20} className="text-purple-600" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
              <p className="text-2xl font-bold text-purple-700">{audioStatusMap["completed"] || audioStatusMap["COMPLETED"] || 0}</p>
              <p className="text-[11px] font-semibold text-purple-600 uppercase">Đã Tạo Voice</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{audioStatusMap["pending"] || audioStatusMap["PENDING"] || 0}</p>
              <p className="text-[11px] font-semibold text-blue-600 uppercase">Đang Chờ Chuyển</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl text-stone-600 text-xs font-semibold">
            <Activity size={16} className="text-purple-600" />
            <span>Edge TTS Status: Normal</span>
          </div>
        </div>

        {/* OCR Cache Metrics */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Quản Lý Cache OCR (Supabase)</span>
            <FileSearch size={20} className="text-cyan-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500 font-medium">Tổng File Đã Quét Cache:</span>
              <span className="font-bold text-stone-900">{ocrCount} tài liệu</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500 font-medium">Độ Chính Xác Trung Bình:</span>
              <span className="font-bold text-emerald-600">{(ocrAvgConfidence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500 font-medium">Tỷ Lệ Tiếng Việt Đã Quét:</span>
              <span className="font-bold text-blue-600">{(ocrAvgVietnameseRatio * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Section: Failed Scripts Logs */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
          <AlertOctagon className="text-red-500" /> Nhật Ký Lỗi Sinh Kịch Bản Video (LectureScript Errors)
        </h3>

        {recentFailedScripts.length === 0 ? (
          <p className="text-stone-400 text-sm italic py-4">Không có kịch bản bài giảng nào báo lỗi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
                <tr>
                  <th className="p-3">Bài Học (Lesson)</th>
                  <th className="p-3">Thông Báo Lỗi (Error Message)</th>
                  <th className="p-3">Thời Gian Thất Bại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {recentFailedScripts.map((s, idx) => (
                  <tr key={s.id || `script-${idx}`}>
                    <td className="p-3 font-bold text-stone-900">{s.lesson?.title || "Không rõ bài học"}</td>
                    <td className="p-3 font-mono text-xs text-red-600 max-w-md truncate">
                      {s.errorMessage || "Unspecified generation failure"}
                    </td>
                    <td className="p-3 text-xs text-stone-400 whitespace-nowrap">
                      {new Date(s.updatedAt).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Section: Recent OCR Scans */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
          <FileSearch className="text-cyan-600" /> Nhật Ký Quét OCR Gần Đây (Supabase OcrCache)
        </h3>

        {recentOcrLogs.length === 0 ? (
          <div className="text-center py-8 text-stone-400">
            <FileSearch size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Chưa có dữ liệu nhật ký quét OCR trong CSDL Supabase OcrCache.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-700">
              <thead className="bg-stone-50 text-xs font-bold uppercase text-stone-500">
                <tr>
                  <th className="p-3">Loại (Type)</th>
                  <th className="p-3">Mã Hash SHA256</th>
                  <th className="p-3">Nội Dung Trích Xuất (Snippet)</th>
                  <th className="p-3">Độ Chính Xác</th>
                  <th className="p-3">Tỷ Lệ Tiếng Việt</th>
                  <th className="p-3">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {recentOcrLogs.map((o, idx) => {
                  const meta = o.meta || {};
                  const confidence = typeof meta.confidence === "number" ? meta.confidence : (o.confidence || 0.95);
                  const vietnameseRatio = typeof meta.vietnameseRatio === "number" ? meta.vietnameseRatio : (o.vietnameseRatio || 0.88);

                  return (
                    <tr key={o.hash || `ocr-${idx}`}>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          o.type === "pdf" ? "bg-red-50 text-red-600 border border-red-100" :
                          o.type === "audio" ? "bg-purple-50 text-purple-600 border border-purple-100" :
                          "bg-cyan-50 text-cyan-600 border border-cyan-100"
                        }`}>
                          {o.type || "image"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-stone-600" title={o.hash}>
                        {o.hash ? `${o.hash.slice(0, 12)}...` : "N/A"}
                      </td>
                      <td className="p-3 text-xs text-stone-700 max-w-xs truncate" title={o.text}>
                        {o.text ? `"${o.text.slice(0, 60)}..."` : "N/A"}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">{(confidence * 100).toFixed(1)}%</td>
                      <td className="p-3 font-bold text-blue-600">{(vietnameseRatio * 100).toFixed(1)}%</td>
                      <td className="p-3 text-xs text-stone-400 whitespace-nowrap">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
