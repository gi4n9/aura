"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { updatePassword, exchangeResetCode } from "@/app/actions/auth";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/theme/ThemeContext";
import Header from "@/app/components/layout/Header";
import Footer from "@/app/components/layout/Footer";
import { toast } from "sonner";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [isExchanging, setIsExchanging] = useState(false);

  const isDark = theme === "dark";

  // Check if session exists or exchange PKCE code for session
  useEffect(() => {
    setIsExchanging(true);
    const supabase = createBrowserClient();

    // 1. Kiểm tra xem Browser đã có phiên đăng nhập active (do Server Callback vừa tạo) hay chưa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsExchanging(false);
        setErrorMsg("");
        return;
      }

      // 2. Nếu chưa có phiên đăng nhập và có mã code trong URL, tiến hành trao đổi code lấy Session
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!error && data?.session) {
            setIsExchanging(false);
            setErrorMsg("");
          } else {
            // Fallback tới Server Action
            exchangeResetCode(code).then((res) => {
              setIsExchanging(false);
              if (res?.error) {
                // Kiểm tra lại lần cuối xem session đã được tạo hay chưa trước khi báo lỗi
                supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
                  if (currentSession) {
                    setErrorMsg("");
                  } else {
                    const msg = t("auth.linkExpired", "Liên kết khôi phục đã hết hạn hoặc không hợp lệ. Vui lòng gửi lại yêu cầu!");
                    setErrorMsg(msg);
                    toast.error(msg);
                  }
                });
              }
            });
          }
        });
      } else {
        setIsExchanging(false);
      }
    });
  }, [code]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      const msg = t("auth.passwordMinLength", "Mật khẩu phải có ít nhất 6 ký tự");
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = t("auth.passwordMismatch", "Mật khẩu xác nhận không khớp");
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      const res = await updatePassword(password);
      if (res?.error) {
        setErrorMsg(res.error);
        toast.error(res.error);
      } else {
        setIsSuccess(true);
        toast.success(t("auth.passwordUpdated", "Đã cập nhật mật khẩu thành công!"));
      }
    });
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-500 ${
      isDark ? "bg-[#080808] text-white" : "bg-[#F9F8F4] text-stone-900"
    }`}>
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 pt-32 pb-20 relative z-10">
        {/* Ambient background glow */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[140px] ${
            isDark ? "bg-[#C5A059]/10" : "bg-[#C5A059]/15"
          }`} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative z-10 w-full max-w-md rounded-2xl p-8 sm:p-10 border shadow-2xl backdrop-blur-xl ${
            isDark
              ? "bg-[#0e0e0e]/90 border-white/10 text-white"
              : "bg-white/90 border-stone-200 text-stone-900"
          }`}
        >
          {/* Header Identity */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 mb-4 bg-[#C5A059] rounded-xl flex items-center justify-center shadow-md text-[#080808]">
              <Sparkles size={22} />
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">
              {t("auth.resetPasswordTitle", "Đặt lại mật khẩu")}
            </h1>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? "text-stone-400" : "text-stone-600"}`}>
              {t("auth.enterNewPasswordDesc", "Tạo mật khẩu mới cho tài khoản Aura Learning của bạn")}
            </p>
          </div>

          {isExchanging ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-stone-400 font-mono">{t("common.loading", "Đang xác thực liên kết...")}</p>
            </div>
          ) : isSuccess ? (
            <div className="flex flex-col items-center text-center gap-6 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">
                  {t("auth.passwordUpdated", "Đã cập nhật mật khẩu thành công!")}
                </h3>
                <p className={`text-xs ${isDark ? "text-stone-400" : "text-stone-600"}`}>
                  {t("auth.passwordUpdatedSub", "Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.")}
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3.5 bg-[#C5A059] text-[#080808] font-bold uppercase text-xs tracking-wider rounded-lg hover:bg-[#e9c176] transition-colors shadow-lg shadow-[#C5A059]/20"
              >
                {t("nav.courses", "Về trang chủ")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-xs text-center font-medium flex items-center justify-center gap-2">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Password Input */}
              <div className="flex flex-col gap-1.5 relative">
                <label className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  isDark ? "text-stone-300" : "text-stone-600"
                }`} htmlFor="new-password">
                  {t("auth.newPassword", "Mật khẩu mới")}
                </label>
                <div className={`relative flex items-center border-b transition-colors duration-300 pb-2 ${
                  isDark ? "border-white/15 focus-within:border-[#C5A059]" : "border-stone-200 focus-within:border-[#A88849]"
                }`}>
                  <Lock size={16} className={`absolute left-0 pointer-events-none ${isDark ? "text-stone-500" : "text-stone-600"}`} />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`w-full bg-transparent border-none py-0 pl-9 pr-8 text-sm focus:ring-0 outline-none focus:outline-none focus:ring-0 shadow-none ${
                      isDark ? "text-white placeholder:text-stone-600" : "text-stone-800 placeholder:text-stone-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-0 transition-colors focus:outline-none ${
                      isDark ? "text-stone-500 hover:text-white" : "text-stone-400 hover:text-stone-800"
                    }`}
                  >
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="flex flex-col gap-1.5 relative">
                <label className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  isDark ? "text-stone-300" : "text-stone-600"
                }`} htmlFor="confirm-new-password">
                  {t("auth.confirmNewPassword", "Xác nhận mật khẩu mới")}
                </label>
                <div className={`relative flex items-center border-b transition-colors duration-300 pb-2 ${
                  isDark ? "border-white/15 focus-within:border-[#C5A059]" : "border-stone-200 focus-within:border-[#A88849]"
                }`}>
                  <Lock size={16} className={`absolute left-0 pointer-events-none ${isDark ? "text-stone-500" : "text-stone-600"}`} />
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`w-full bg-transparent border-none py-0 pl-9 pr-8 text-sm focus:ring-0 outline-none focus:outline-none focus:ring-0 shadow-none ${
                      isDark ? "text-white placeholder:text-stone-600" : "text-stone-800 placeholder:text-stone-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-0 transition-colors focus:outline-none ${
                      isDark ? "text-stone-500 hover:text-white" : "text-stone-400 hover:text-stone-800"
                    }`}
                  >
                    {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isPending}
                className="mt-4 w-full bg-[#C5A059] text-[#080808] text-xs font-bold uppercase tracking-widest py-3.5 rounded-lg hover:bg-[#e9c176] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(197,160,89,0.25)] disabled:opacity-70"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#080808] border-t-transparent rounded-full animate-spin" />
                    {t("auth.processing", "ĐANG XỬ LÝ...")}
                  </span>
                ) : (
                  <>
                    <span>{t("auth.updatePasswordBtn", "Cập nhật mật khẩu")}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
