"use client";

import { useState } from "react";
import { Settings, Sliders, Cpu, HardDrive, ShieldAlert, Activity, Save, RefreshCw, CheckCircle2, AlertTriangle, Zap, Server } from "lucide-react";
import { updateSystemSettings, revalidateSystemCache, checkSystemHealth } from "@/app/actions/admin-settings";
import { toast } from "sonner";

interface AdminSettingsClientProps {
  initialSettings: Record<string, string>;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"general" | "ai" | "storage" | "security" | "health">("general");
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateSystemSettings(settings);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Không thể lưu cài đặt");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setCacheLoading(true);
    try {
      const res = await revalidateSystemCache();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || "Lỗi làm mới cache");
      }
    } finally {
      setCacheLoading(false);
    }
  };

  const handleCheckHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await checkSystemHealth();
      if (res.success) {
        setHealthData(res.data);
        toast.success("Kiểm tra sức khỏe hệ thống hoàn tất!");
      } else {
        toast.error(res.error || "Không thể kiểm tra sức khỏe hệ thống");
      }
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-stone-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Settings className="text-[#C5A059]" /> Cài Đặt Hệ Thống & Cấu Hình Platform
          </h1>
          <p className="text-stone-500 mt-1">
            Quản lý thông số chung, mô hình AI, giới hạn lưu trữ, chế độ bảo trì và các công cụ DevOps.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C5A059] text-white font-semibold hover:bg-[#b08c48] transition-all shadow-md shadow-[#C5A059]/20 disabled:opacity-50"
        >
          <Save size={18} /> {loading ? "Đang lưu..." : "Lưu Cài Đặt"}
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-stone-200 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "general"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Sliders size={16} /> Cài Đặt Chung
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "ai"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Cpu size={16} /> Mô Hình AI & LLM
        </button>

        <button
          onClick={() => setActiveTab("storage")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "storage"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <HardDrive size={16} /> Lưu Trữ & Tệp
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "security"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <ShieldAlert size={16} /> Bảo Mật & Bảo Trì
        </button>

        <button
          onClick={() => setActiveTab("health")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "health"
              ? "border-[#C5A059] text-[#C5A059]"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Activity size={16} /> Sức Khỏe & Thao Tác
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: General */}
        {activeTab === "general" && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-stone-900">Thông Tin Nền Tảng & Ngôn Ngữ</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Tên Nền Tảng (Site Name)</label>
                <input
                  type="text"
                  value={settings.siteName || ""}
                  onChange={(e) => handleChange("siteName", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Email Hỗ Trợ Hóa Đơn / Hệ Thống</label>
                <input
                  type="email"
                  value={settings.contactEmail || ""}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Mô Tả Nền Tảng (Meta Description)</label>
                <textarea
                  rows={2}
                  value={settings.siteDescription || ""}
                  onChange={(e) => handleChange("siteDescription", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Ngôn Ngữ Mặc Định</label>
                <select
                  value={settings.defaultLanguage || "vi"}
                  onChange={(e) => handleChange("defaultLanguage", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="vi">Tiếng Việt (vi-VN)</option>
                  <option value="en">English (en-US)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Cho Phép Đăng Ký Học Viên Mới</label>
                <select
                  value={settings.allowRegistration || "true"}
                  onChange={(e) => handleChange("allowRegistration", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="true">Cho phép tự đăng ký</option>
                  <option value="false">Tắt đăng ký tự do (Chỉ Admin tạo tài khoản)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Config */}
        {activeTab === "ai" && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Zap className="text-[#C5A059]" /> Mô Hình Trí Tuệ Nhân Tạo & Cấu Hình Prompt
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Mô Hình AI Tóm Tắt & ChatBot Mặc Định</label>
                <select
                  value={settings.defaultAiModel || "local:gemini-3.6-flash"}
                  onChange={(e) => handleChange("defaultAiModel", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="local:gemini-3.6-flash">Local: Gemini 3.6 Flash Web2API (Khuyên Dùng - Siêu Tốc & Không Giới Hạn Token)</option>
                  <option value="google:gemini-2.5-flash">Google: Gemini 2.5 Flash</option>
                  <option value="groq:openai/gpt-oss-120b">Groq: GPT-OSS 120B</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">AI Temperature (Độ Sáng Tạo: 0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.aiTemperature || "0.3"}
                  onChange={(e) => handleChange("aiTemperature", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Bật Tính Năng Tóm Tắt Tự Động Nhóm Chat</label>
                <select
                  value={settings.enableGroupSummary || "true"}
                  onChange={(e) => handleChange("enableGroupSummary", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="true">Bật Tóm Tắt Nhóm (Groq AI Summary)</option>
                  <option value="false">Tắt Tóm Tắt Tự Động</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Bật Bot Tự Động @AuraBot Trong Nhóm</label>
                <select
                  value={settings.enableGroupBot || "true"}
                  onChange={(e) => handleChange("enableGroupBot", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="true">Bật AuraBot Trả Lời Tự Động</option>
                  <option value="false">Tắt AuraBot Trong Nhóm Chat</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Ngưỡng Khớp Vector Search (RAG Threshold)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.9"
                  value={settings.ragMatchThreshold || "0.35"}
                  onChange={(e) => handleChange("ragMatchThreshold", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Storage */}
        {activeTab === "storage" && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-stone-900">Giới Hạn Dung Lượng & Định Dạng Tệp Upload</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Dung Lượng Tệp Upload Tối Đa (MB)</label>
                <input
                  type="number"
                  value={settings.maxUploadSizeMb || "50"}
                  onChange={(e) => handleChange("maxUploadSizeMb", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Thời Lượng Video Bài Giảng Tối Đa (Phút)</label>
                <input
                  type="number"
                  value={settings.maxVideoDurationMinutes || "120"}
                  onChange={(e) => handleChange("maxVideoDurationMinutes", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Định Dạng Tệp Cho Phép (Allowed Extensions)</label>
                <input
                  type="text"
                  value={settings.allowedFileTypes || ".pdf,.mp4,.png,.jpg,.jpeg,.xlsx,.docx"}
                  onChange={(e) => handleChange("allowedFileTypes", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Maintenance */}
        {activeTab === "security" && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <ShieldAlert className="text-red-500" /> Bật/Tắt Chế Độ Bảo Trì & Giới Hạn Tải Hệ Thống
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Chế Độ Bảo Trì Toàn Hệ Thống (Maintenance Mode)</label>
                <select
                  value={settings.maintenanceMode || "false"}
                  onChange={(e) => handleChange("maintenanceMode", e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border font-bold text-sm focus:outline-none ${
                    settings.maintenanceMode === "true"
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-white border-stone-200 text-stone-900"
                  }`}
                >
                  <option value="false">Tắt (Hệ thống hoạt động bình thường)</option>
                  <option value="true">⚠️ BẬT CHẾ ĐỘ BẢO TRÌ (Khóa truy cập học viên)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Thời Gian Hết Hạn Phiên Đăng Nhập (Giờ)</label>
                <input
                  type="number"
                  value={settings.sessionTimeoutHours || "24"}
                  onChange={(e) => handleChange("sessionTimeoutHours", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Thông Báo Khi Đang Bảo Trì</label>
                <textarea
                  rows={3}
                  value={settings.maintenanceMessage || ""}
                  onChange={(e) => handleChange("maintenanceMessage", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 bg-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Health & Operations */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5">
              <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Server className="text-blue-600" /> Công Cụ Thao Tác & Cache Hệ Thống
              </h3>

              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={cacheLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-sm hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={cacheLoading ? "animate-spin" : ""} />
                  {cacheLoading ? "Đang xóa Cache..." : "Làm Mới Cache Hệ Thống"}
                </button>

                <button
                  type="button"
                  onClick={handleCheckHealth}
                  disabled={healthLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Activity size={16} className={healthLoading ? "animate-spin" : ""} />
                  {healthLoading ? "Đang kiểm tra..." : "Kiểm Tra Sức Khỏe Kết Nối (Ping DB & AI)"}
                </button>
              </div>
            </div>

            {/* Health Status Result */}
            {healthData && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <h4 className="font-bold text-stone-900 text-base">Kết Quả Kiểm Tra Sức Khỏe</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <p className="font-bold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} /> PostgreSQL Database
                    </p>
                    <p className="text-xs text-emerald-700">Trạng thái: OK ({healthData.database?.latency})</p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <p className="font-bold text-blue-800 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Groq AI API
                    </p>
                    <p className="text-xs text-blue-700">Trạng thái: {healthData.groqAi?.status} ({healthData.groqAi?.latency})</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
