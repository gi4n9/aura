"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Sparkles, Mail, Lock, EyeOff, Eye, ArrowRight, X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signInWithGoogle, resetPassword } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, setIsGooglePending] = useState(false);

  // States for Remember Me & Forgot Password
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const isDark = theme === "dark";

  // Load saved email on mount / open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("aura_remember_email");
      if (savedEmail) {
        setEmailInput(savedEmail);
        setRememberMe(true);
      }
    }
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    try {
      setIsGooglePending(true);
      toast.loading(t("auth.redirectingGoogle", "Đang chuyển hướng sang Google..."));
      const res = await signInWithGoogle();
      if (res?.error) {
        toast.dismiss();
        toast.error(res.error);
        setIsGooglePending(false);
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || t("auth.loginFailed", "Đăng nhập Google thất bại"));
      setIsGooglePending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    // Handle Remember Me storage
    if (typeof window !== "undefined") {
      if (rememberMe && email) {
        localStorage.setItem("aura_remember_email", email);
      } else {
        localStorage.removeItem("aura_remember_email");
      }
    }

    startTransition(async () => {
      const res = await login(formData);

      if (res?.error) {
        setErrorMsg(res.error);
        toast.error(res.error);
      } else if (res?.success) {
        toast.success(t("auth.loginSuccess", "Đăng nhập thành công!"));
        onClose();
        router.refresh();
        if (res.redirectTo) {
          router.push(res.redirectTo);
        }
      }
    });
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!emailInput) {
      setErrorMsg(t("auth.emailRequired", "Vui lòng nhập địa chỉ email"));
      return;
    }

    startTransition(async () => {
      const res = await resetPassword(emailInput);
      if (res?.error) {
        setErrorMsg(res.error);
        toast.error(res.error);
      } else {
        const msg = t("auth.resetEmailSent", "Đã gửi liên kết khôi phục mật khẩu đến email của bạn!");
        setSuccessMsg(msg);
        toast.success(msg);
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key={language}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl overflow-hidden selection:bg-[#C5A059]/20 transition-colors ${
              isDark ? "bg-[#0e0e0e] border border-white/10 text-white" : "bg-white border border-stone-200 text-stone-900"
            }`}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 z-20 p-2 transition-colors rounded-full ${
                isDark ? "text-stone-400 hover:text-white hover:bg-white/10" : "text-stone-400 hover:text-stone-800 hover:bg-stone-100"
              }`}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Content */}
            <div className="relative z-10 p-8 sm:p-10 flex flex-col items-center">

              {/* Brand Identity */}
              <div className="mb-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 mb-4 bg-[#C5A059] rounded-xl flex items-center justify-center shadow-md text-[#080808]">
                  <Sparkles size={22} />
                </div>
                <h2 className={`font-serif text-3xl tracking-tight font-bold ${isDark ? "text-white" : "text-stone-900"}`}>
                  {isResetMode ? t("auth.resetPasswordTitle", "Đặt lại mật khẩu") : t("auth.loginTitle", "Aura Learning")}
                </h2>
                <p className={`text-xs mt-1 font-sans max-w-xs ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                  {isResetMode
                    ? t("auth.resetPasswordSubtitle", "Nhập email của bạn để nhận liên kết khôi phục mật khẩu")
                    : t("auth.loginSubtitle", "Trí tuệ Nhân tạo làm chủ tri thức")}
                </p>
              </div>

              {/* Reset Password Form */}
              {isResetMode ? (
                <form className="w-full flex flex-col gap-5 sm:gap-6" onSubmit={handleResetPassword}>
                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-xs text-center font-medium">
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 text-xs text-center font-medium flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                    <label className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest ${
                      isDark ? "text-stone-300" : "text-stone-600"
                    }`} htmlFor="reset-email">
                      {t("auth.email", "Địa chỉ Email")}
                    </label>
                    <div className={`relative flex items-center border-b transition-colors duration-300 pb-2 ${
                      isDark ? "border-white/15 focus-within:border-[#C5A059]" : "border-stone-200 focus-within:border-[#A88849]"
                    }`}>
                      <Mail size={16} className={`absolute left-0 pointer-events-none ${isDark ? "text-stone-500" : "text-stone-600"}`} />
                      <input
                        className={`w-full bg-transparent border-none py-0 pl-9 pr-0 text-sm focus:ring-0 outline-none focus:outline-none focus:ring-0 shadow-none ${
                          isDark ? "text-white placeholder:text-stone-600" : "text-stone-800 placeholder:text-stone-300"
                        }`}
                        id="reset-email"
                        name="email"
                        value={emailInput || ""}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={t("auth.emailPlaceholder", "scholar@example.com")}
                        required
                        type="email"
                      />
                    </div>
                  </div>

                  {/* Submit Reset Button */}
                  <button
                    className="mt-2 w-full bg-[#C5A059] text-[#080808] text-[11px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest py-3.5 rounded-md hover:bg-[#e9c176] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(197,160,89,0.25)]"
                    type="submit"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#080808]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t("auth.processing", "ĐANG XỬ LÝ...")}
                      </span>
                    ) : (
                      <>
                        <span>{t("auth.sendResetLink", "Gửi liên kết khôi phục")}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  {/* Back to Login link */}
                  <button
                    type="button"
                    onClick={() => { setIsResetMode(false); setErrorMsg(''); setSuccessMsg(''); }}
                    className={`mt-2 flex items-center justify-center gap-2 text-xs transition-colors ${
                      isDark ? "text-stone-400 hover:text-white" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <ArrowLeft size={14} />
                    <span>{t("auth.backToLogin", "Quay lại Đăng nhập")}</span>
                  </button>
                </form>
              ) : (
                /* Login Form */
                <form className="w-full flex flex-col gap-5 sm:gap-6" onSubmit={handleSubmit}>
                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-xs text-center font-medium">
                      {errorMsg}
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                    <label className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest ${
                      isDark ? "text-stone-300" : "text-stone-600"
                    }`} htmlFor="email">
                      {t("auth.email", "Địa chỉ Email")}
                    </label>
                    <div className={`relative flex items-center border-b transition-colors duration-300 pb-2 ${
                      isDark ? "border-white/15 focus-within:border-[#C5A059]" : "border-stone-200 focus-within:border-[#A88849]"
                    }`}>
                      <Mail size={16} className={`absolute left-0 pointer-events-none ${isDark ? "text-stone-500" : "text-stone-600"}`} />
                      <input
                        className={`w-full bg-transparent border-none py-0 pl-9 pr-0 text-sm focus:ring-0 outline-none focus:outline-none focus:ring-0 shadow-none ${
                          isDark ? "text-white placeholder:text-stone-600" : "text-stone-800 placeholder:text-stone-300"
                        }`}
                        id="email"
                        name="email"
                        value={emailInput || ""}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder={t("auth.emailPlaceholder", "scholar@example.com")}
                        required
                        type="email"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                    <label className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest ${
                      isDark ? "text-stone-300" : "text-stone-600"
                    }`} htmlFor="password">
                      {t("auth.password", "Mật khẩu")}
                    </label>
                    <div className={`relative flex items-center border-b transition-colors duration-300 pb-2 ${
                      isDark ? "border-white/15 focus-within:border-[#C5A059]" : "border-stone-200 focus-within:border-[#A88849]"
                    }`}>
                      <Lock size={16} className={`absolute left-0 pointer-events-none ${isDark ? "text-stone-500" : "text-stone-600"}`} />
                      <input
                        className={`w-full bg-transparent border-none py-0 pl-9 pr-8 text-sm focus:ring-0 outline-none focus:outline-none focus:ring-0 shadow-none ${
                          isDark ? "text-white placeholder:text-stone-600" : "text-stone-800 placeholder:text-stone-300"
                        }`}
                        id="password"
                        name="password"
                        value={passwordInput || ""}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        required
                        type={showPassword ? "text" : "password"}
                      />
                      <button
                        className={`absolute right-0 transition-colors focus:outline-none ${
                          isDark ? "text-stone-500 hover:text-white" : "text-stone-400 hover:text-stone-800"
                        }`}
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Options Row: Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        className="w-3.5 h-3.5 rounded border-stone-300 text-[#C5A059] focus:ring-[#C5A059] cursor-pointer"
                        type="checkbox"
                        checked={rememberMe || false}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className={`text-xs transition-colors ${isDark ? "text-stone-400 group-hover:text-stone-200" : "text-stone-500 group-hover:text-stone-800"}`}>
                        {t("auth.rememberMe", "Ghi nhớ đăng nhập")}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="text-xs text-[#C5A059] hover:underline transition-colors focus:outline-none"
                      onClick={() => { setIsResetMode(true); setErrorMsg(''); setSuccessMsg(''); }}
                    >
                      {t("auth.forgotPassword", "Quên mật khẩu?")}
                    </button>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    className="mt-2 w-full bg-[#C5A059] text-[#080808] text-[11px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest py-3.5 rounded-md hover:bg-[#e9c176] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(197,160,89,0.25)]"
                    type="submit"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#080808]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
              )}

              {/* Divider */}
              {!isResetMode && (
                <>
                  <div className="w-full flex items-center gap-4 mt-6 mb-6">
                    <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-stone-200"}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                      isDark ? "text-stone-500" : "text-stone-400"
                    }`}>
                      {t("auth.orContinueWith", "Hoặc tiếp tục với")}
                    </span>
                    <div className={`flex-1 h-px ${isDark ? "bg-white/10" : "bg-stone-200"}`} />
                  </div>

                  {/* Social Logins */}
                  <div className="w-full flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGooglePending}
                      className={`flex-1 rounded-md py-3 px-4 flex items-center justify-center gap-3 text-[10px] font-bold transition-colors disabled:opacity-50 border ${
                        isDark
                          ? "bg-white/5 border-white/10 text-stone-200 hover:bg-white/10"
                          : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span className="uppercase tracking-widest">Google</span>
                    </button>
                  </div>

                  {/* Footer Link */}
                  <p className={`mt-6 text-xs text-center ${isDark ? "text-stone-400" : "text-stone-500"}`}>
                    {t("auth.dontHaveAccount", "Chưa có tài khoản?")}{' '}
                    <button type="button" className="text-[#C5A059] hover:underline font-semibold ml-1" onClick={onSwitchToRegister}>
                      {t("auth.registerHere", "Đăng ký ngay")}
                    </button>
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
