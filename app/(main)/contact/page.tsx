"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success(t("contact.successToast", "Cảm ơn bạn! Chúng tôi đã nhận được thông tin và sẽ phản hồi sớm nhất."));
    setFormData({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSubmitted(false), 4000);
  };

  const inputClass = `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:border-[#C5A059] transition-colors ${
    isDark
      ? "bg-white/5 border-white/10 text-white placeholder-stone-500 focus:bg-white/[0.08]"
      : "bg-stone-50 border-stone-200 text-stone-900 focus:bg-white"
  }`;

  return (
    <div className={`pt-28 pb-20 min-h-screen w-full transition-colors duration-500 ${isDark ? "bg-[#080808]" : "bg-[#F9F8F4]"}`}>
      {/* Hero Header */}
      <section className="py-12 px-6 max-w-4xl mx-auto text-center w-full">
        <h1 className={`font-serif text-4xl md:text-5xl font-bold leading-tight mb-4 ${isDark ? "text-white" : "text-stone-900"}`}>
          {t("contact.heroTitle", "Liên hệ với Aura Learning")}
        </h1>
        <p className={`text-lg font-light leading-relaxed max-w-2xl mx-auto ${isDark ? "text-stone-400" : "text-stone-600"}`}>
          {t("contact.heroDesc", "Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn 24/7. Hãy gửi tin nhắn cho chúng tôi!")}
        </p>
      </section>

      {/* Main Container */}
      <section className="max-w-6xl mx-auto px-6 w-full flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Contact Form */}
        <div className={`w-full lg:w-7/12 p-8 md:p-10 rounded-2xl border shadow-sm flex flex-col justify-between ${
          isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-stone-200"
        }`}>
          <div>
            <h2 className={`font-serif text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-stone-900"}`}>
              {t("contact.formTitle", "Gửi tin nhắn trực tiếp")}
            </h2>

            {submitted && (
              <div className={`mb-6 p-4 border rounded-xl flex items-center gap-3 text-sm font-medium animate-fade-in ${
                isDark ? "bg-teal-500/10 border-teal-500/20 text-teal-400" : "bg-teal-50 border-teal-200 text-teal-800"
              }`}>
                <CheckCircle2 size={20} className={isDark ? "text-teal-400 flex-shrink-0" : "text-teal-600 flex-shrink-0"} />
                <span>{t("contact.successToast", "Cảm ơn bạn! Chúng tôi đã nhận được thông tin và sẽ phản hồi sớm nhất.")}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-stone-400" : "text-stone-700"}`}>
                  {t("contact.nameLabel", "Họ và tên")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("contact.namePlaceholder", "Nguyễn Văn A")}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-stone-400" : "text-stone-700"}`}>
                  {t("contact.emailLabel", "Địa chỉ Email")}
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("contact.emailPlaceholder", "example@gmail.com")}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-stone-400" : "text-stone-700"}`}>
                  {t("contact.subjectLabel", "Chủ đề")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={t("contact.subjectPlaceholder", "Tư vấn khóa học / Hỗ trợ kỹ thuật...")}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-stone-400" : "text-stone-700"}`}>
                  {t("contact.messageLabel", "Nội dung lời nhắn")}
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t("contact.messagePlaceholder", "Nhập chi tiết yêu cầu của bạn tại đây...")}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#C5A059] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#b08d47] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {t("contact.sendBtn", "Gửi lời nhắn ngay")}
              </button>
            </form>
          </div>
        </div>

        {/* Contact Info */}
        <div className={`w-full lg:w-5/12 text-white p-8 md:p-10 rounded-2xl shadow-xl flex flex-col justify-between ${
          isDark ? "bg-[#0e0e0e] border border-white/10" : "bg-[#1a1a1a]"
        }`}>
          <div>
            <h2 className="font-serif text-2xl font-bold mb-8 text-[#C5A059]">
              {t("contact.infoTitle", "Thông tin liên hệ")}
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1 ${
                  isDark ? "bg-white/5" : "bg-stone-800"
                }`}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                    {t("contact.infoAddressTitle", "Trụ sở chính")}
                  </h4>
                  <p className="text-sm text-stone-200 leading-relaxed font-light">
                    {t("contact.infoAddress", "Tòa nhà Technology Center, Khu Công nghệ Cao, TP. Hồ Chí Minh")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1 ${
                  isDark ? "bg-white/5" : "bg-stone-800"
                }`}>
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                    {t("contact.infoPhoneTitle", "Điện thoại hỗ trợ")}
                  </h4>
                  <p className="text-sm text-stone-200 leading-relaxed font-light">
                    {t("contact.infoPhone", "+84 (0) 28 7777 8888")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1 ${
                  isDark ? "bg-white/5" : "bg-stone-800"
                }`}>
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                    {t("contact.infoEmailTitle", "Email liên hệ")}
                  </h4>
                  <p className="text-sm text-stone-200 leading-relaxed font-light">
                    {t("contact.infoEmail", "support@auralearning.edu.vn")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1 ${
                  isDark ? "bg-white/5" : "bg-stone-800"
                }`}>
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                    {t("contact.workingHoursTitle", "Giờ làm việc")}
                  </h4>
                  <p className="text-sm text-stone-200 leading-relaxed font-light">
                    {t("contact.workingHours", "Thứ 2 - Thứ 7: 8:00 - 20:00")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}