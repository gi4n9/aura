"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const { t } = useLanguage();
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

  return (
    <div className="pt-28 pb-20 bg-[#F9F8F4] min-h-screen w-full">
      {/* Hero Header */}
      <section className="py-12 px-6 max-w-4xl mx-auto text-center w-full">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-stone-900 leading-tight mb-4">
          {t("contact.heroTitle", "Liên hệ với Aura Learning")}
        </h1>
        <p className="text-stone-600 text-lg font-light leading-relaxed max-w-2xl mx-auto">
          {t("contact.heroDesc", "Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn 24/7. Hãy gửi tin nhắn cho chúng tôi!")}
        </p>
      </section>

      {/* Main Container */}
      <section className="max-w-6xl mx-auto px-6 w-full flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Contact Form */}
        <div className="w-full lg:w-7/12 bg-white p-8 md:p-10 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 mb-6">
              {t("contact.formTitle", "Gửi tin nhắn trực tiếp")}
            </h2>

            {submitted && (
              <div className="mb-6 p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl flex items-center gap-3 text-sm font-medium animate-fade-in">
                <CheckCircle2 size={20} className="text-teal-600 flex-shrink-0" />
                <span>{t("contact.successToast", "Cảm ơn bạn! Chúng tôi đã nhận được thông tin và sẽ phản hồi sớm nhất.")}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  {t("contact.nameLabel", "Họ và tên")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("contact.namePlaceholder", "Nguyễn Văn A")}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  {t("contact.emailLabel", "Địa chỉ Email")}
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("contact.emailPlaceholder", "example@gmail.com")}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  {t("contact.subjectLabel", "Chủ đề")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={t("contact.subjectPlaceholder", "Tư vấn khóa học / Hỗ trợ kỹ thuật...")}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  {t("contact.messageLabel", "Nội dung lời nhắn")}
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t("contact.messagePlaceholder", "Nhập chi tiết yêu cầu của bạn tại đây...")}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#C5A059] focus:bg-white transition-colors resize-none"
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
        <div className="w-full lg:w-5/12 bg-[#1a1a1a] text-white p-8 md:p-10 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-8 text-[#C5A059]">
              {t("contact.infoTitle", "Thông tin liên hệ")}
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1">
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
                <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1">
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
                <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1">
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
                <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-[#C5A059] flex-shrink-0 mt-1">
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