"use client";

import React, { useState, useTransition } from 'react';
import { Sparkles, Mail, Lock, EyeOff, Eye, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { login } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await login(formData);

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
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden selection:bg-[#C5A059]/20"
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
                <div className="w-12 h-12 mb-4 bg-[#A88849] rounded-xl flex items-center justify-center shadow-md">
                  <Sparkles className="text-white" size={22} />
                </div>
                <h2 className="font-serif text-3xl text-stone-900 tracking-tight font-bold">Aura Learning</h2>
                <p className="text-xs text-stone-500 mt-1 font-sans">
                  {t("auth.loginSubtitle", "Trí tuệ Nhân tạo làm chủ tri thức")}
                </p>
              </div>

              {/* Form */}
              <form className="w-full flex flex-col gap-5 sm:gap-6" onSubmit={handleSubmit}>
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs text-center font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Email Input */}
                <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                  <label className="text-[10px] sm:text-xs font-bold text-stone-600 uppercase tracking-wider sm:tracking-widest" htmlFor="email">
                    {t("auth.email", "Địa chỉ Email")}
                  </label>
                  <div className="relative flex items-center border-b border-stone-200 focus-within:border-[#A88849] transition-colors duration-300 pb-2">
                    <Mail size={16} className="absolute left-0 text-stone-600 pointer-events-none" />
                    <input
                      className="w-full bg-transparent border-none py-0 pl-9 pr-0 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none focus:ring-0 shadow-none"
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
                      className="w-full bg-transparent border-none py-0 pl-9 pr-8 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none focus:ring-0 shadow-none"
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

                {/* Options Row */}
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input className="w-3.5 h-3.5 rounded border-stone-300 text-[#C5A059] focus:ring-[#C5A059]" type="checkbox" />
                    <span className="text-xs text-stone-500">
                      {t("auth.rememberMe", "Ghi nhớ đăng nhập")}
                    </span>
                  </label>
                  <Link className="text-xs text-[#C5A059] hover:text-[#A88849] transition-colors" href="#">
                    {t("auth.forgotPassword", "Quên mật khẩu?")}
                  </Link>
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
                      <span>{t("auth.loginBtn", "Đăng nhập ngay")}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="w-full flex items-center gap-4 mt-6 mb-6">
                <div className="flex-1 h-px bg-stone-200"></div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">
                  {t("auth.orContinueWith", "Hoặc tiếp tục với")}
                </span>
                <div className="flex-1 h-px bg-stone-200"></div>
              </div>

              {/* Social Logins */}
              <div className="w-full flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-white border border-stone-200 rounded-md py-3 px-4 flex items-center justify-center gap-3 text-[10px] font-bold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors">
                  <span className="text-sm text-stone-900 font-bold">G</span>
                  <span className="uppercase tracking-widest">Google</span>
                </button>
                <button className="flex-1 bg-white border border-stone-200 rounded-md py-3 px-4 flex items-center justify-center gap-3 text-[10px] font-bold text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors">
                  <span className="text-sm font-bold text-stone-900">{"<>"}</span>
                  <span className="uppercase tracking-widest">Github</span>
                </button>
              </div>

              {/* Footer Link */}
              <p className="mt-6 text-xs text-stone-500 text-center">
                {t("auth.dontHaveAccount", "Chưa có tài khoản?")}{' '}
                <button type="button" className="text-[#C5A059] hover:text-[#A88849] transition-colors font-semibold ml-1" onClick={onSwitchToRegister}>
                  {t("auth.registerHere", "Đăng ký ngay")}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
