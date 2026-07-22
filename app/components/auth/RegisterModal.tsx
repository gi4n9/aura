"use client";

import React, { useState, useTransition } from 'react';
import { Sparkles, Mail, Lock, EyeOff, Eye, ArrowRight, X, User } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { signup } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (password !== confirmPassword) {
      setErrorMsg(t("auth.passwordMismatch", "Mật khẩu xác nhận không khớp"));
      return;
    }

    startTransition(async () => {
      const res = await signup(formData);

      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.success) {
        onClose();
        router.refresh();
        if (res.redirectTo) {
          router.push(res.redirectTo);
        }
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key={language}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden selection:bg-[#C5A059]/20 max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 text-stone-400 hover:text-stone-800 transition-colors rounded-full hover:bg-stone-100"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Content */}
            <div className="relative z-10 p-8 sm:p-10 flex flex-col items-center">

              {/* Brand Identity */}
              <div className="mb-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 mb-4 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm">
                  <Sparkles className="text-[#C5A059]" size={22} />
                </div>
                <h2 className="font-serif text-3xl text-stone-900 tracking-tight font-bold">
                  {t("auth.registerTitle", "Tạo tài khoản Aura")}
                </h2>
                <p className="text-xs text-stone-500 mt-1 font-sans">
                  {t("auth.registerSubtitle", "Bước vào tương lai học tập cá nhân hóa")}
                </p>
              </div>

              {/* Form */}
              <form className="w-full flex flex-col gap-4 sm:gap-5" onSubmit={handleSubmit}>
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs text-center font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Full Name Input */}
                <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                  <label className="text-[10px] sm:text-xs font-bold text-stone-600 uppercase tracking-wider sm:tracking-widest" htmlFor="fullname">
                    {t("auth.fullName", "Họ và tên")}
                  </label>
                  <div className="relative flex items-center border-b border-stone-200 focus-within:border-[#A88849] transition-colors duration-300 pb-2">
                    <User size={16} className="absolute left-0 text-stone-600 pointer-events-none" />
                    <input
                      className="w-full bg-transparent border-none py-0 pl-9 pr-0 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none shadow-none"
                      id="fullname"
                      name="fullname"
                      placeholder={t("auth.fullNamePlaceholder", "Nguyễn Văn A")}
                      required
                      type="text"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                  <label className="text-[10px] sm:text-xs font-bold text-stone-600 uppercase tracking-wider sm:tracking-widest" htmlFor="email">
                    {t("auth.email", "Địa chỉ Email")}
                  </label>
                  <div className="relative flex items-center border-b border-stone-200 focus-within:border-[#A88849] transition-colors duration-300 pb-2">
                    <Mail size={16} className="absolute left-0 text-stone-600 pointer-events-none" />
                    <input
                      className="w-full bg-transparent border-none py-0 pl-9 pr-0 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none shadow-none"
                      id="email"
                      name="email"
                      placeholder={t("auth.emailPlaceholder", "scholar@example.com")}
                      required
                      type="email"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                  <label className="text-[10px] sm:text-xs font-bold text-stone-600 uppercase tracking-wider sm:tracking-widest" htmlFor="password">
                    {t("auth.password", "Mật khẩu")}
                  </label>
                  <div className="relative flex items-center border-b border-stone-200 focus-within:border-[#A88849] transition-colors duration-300 pb-2">
                    <Lock size={16} className="absolute left-0 text-stone-600 pointer-events-none" />
                    <input
                      className="w-full bg-transparent border-none py-0 pl-9 pr-8 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none shadow-none"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      className="absolute right-0 text-stone-400 hover:text-stone-800 transition-colors focus:outline-none"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                  <label className="text-[10px] sm:text-xs font-bold text-stone-600 uppercase tracking-wider sm:tracking-widest" htmlFor="confirm_password">
                    {t("auth.confirmPassword", "Xác nhận mật khẩu")}
                  </label>
                  <div className="relative flex items-center border-b border-stone-200 focus-within:border-[#A88849] transition-colors duration-300 pb-2">
                    <Lock size={16} className="absolute left-0 text-stone-600 pointer-events-none" />
                    <input
                      className="w-full bg-transparent border-none py-0 pl-9 pr-8 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none shadow-none"
                      id="confirm_password"
                      name="confirm_password"
                      placeholder="••••••••"
                      required
                      type={showConfirmPassword ? "text" : "password"}
                    />
                    <button
                      className="absolute right-0 text-stone-400 hover:text-stone-800 transition-colors focus:outline-none"
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>

                {/* Terms Row */}
                <div className="flex items-start gap-3 mt-2">
                  <div className="flex items-center h-5">
                    <input className="w-3.5 h-3.5 rounded border-stone-300 text-[#C5A059] focus:ring-[#C5A059]" id="terms" name="terms" type="checkbox" required />
                  </div>
                  <label className="text-xs text-stone-500 leading-tight" htmlFor="terms">
                    {t("auth.termsPrefix", "Tôi đồng ý với")} <Link href="#" className="text-[#C5A059] hover:underline">{t("auth.termsOfService", "Điều khoản dịch vụ")}</Link> & <Link href="#" className="text-[#C5A059] hover:underline">{t("auth.privacyPolicy", "Chính sách bảo mật")}</Link>.
                  </label>
                </div>

                {/* Primary Action Button */}
                <button
                  className="mt-2 w-full bg-[#C5A059] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest py-3.5 rounded-md hover:bg-[#A88849] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t("auth.processing", "ĐANG XỬ LÝ...")}
                    </span>
                  ) : (
                    <>
                      <span>{t("auth.registerBtn", "Đăng ký ngay")}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Link */}
              <div className="mt-8 pt-6 border-t border-stone-100 w-full text-center">
                <p className="text-xs text-stone-500">
                  {t("auth.alreadyHaveAccount", "Đã có tài khoản?")}{' '}
                  <button onClick={onSwitchToLogin} className="text-[#C5A059] hover:text-[#A88849] transition-colors font-semibold ml-1">
                    {t("auth.loginHere", "Đăng nhập ngay")}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
