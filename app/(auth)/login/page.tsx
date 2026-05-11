"use client";

import { useState, useTransition, Suspense } from "react";
import { login, signup } from "./action";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [localError, setLocalError] = useState<string | null>(searchParams.get("error"));
  const [localMessage, setLocalMessage] = useState<string | null>(searchParams.get("message"));

  const handleAction = async (formData: FormData, action: any) => {
    setLocalError(null);
    setLocalMessage(null);

    startTransition(async () => {
      const result = await action(formData);

      if (result?.error) {
        setLocalError(result.error);
      } else if (result?.success) {
        router.push(result.redirectUrl || "/")
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-white p-8 md:p-10 rounded-xl shadow-xl w-full max-w-md border border-stone-200 relative">

      {/* Nút quay về trang chủ */}
      <Link href="/" className="absolute top-6 left-6 text-stone-400 hover:text-[#C5A059] transition-colors">
        <ArrowLeft size={20} />
      </Link>

      <div className="text-center mb-10 mt-4">
        {/* Logo nhỏ */}
        <div className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm mx-auto mb-4">
          α
        </div>
        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-2">Welcome Back</h2>
        <p className="text-stone-500 text-sm font-medium tracking-wide">Continue your learning journey</p>
      </div>

      {/* Thông báo thành công */}
      {localMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-medium flex items-center gap-3">
          <CheckCircle size={18} className="text-green-600" />
          {localMessage}
        </div>
      )}

      {/* Thông báo lỗi */}
      {localError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-medium flex items-center gap-3">
          <AlertCircle size={18} className="text-red-600" />
          {localError}
        </div>
      )}

      <form className="flex flex-col gap-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">Email Address</label>
          <input
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            className="w-full bg-[#F9F8F4] border border-stone-200 text-[#1a1a1a] p-3.5 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all placeholder:text-stone-400"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              className="w-full bg-[#F9F8F4] border border-stone-200 text-[#1a1a1a] p-3.5 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all pr-12 placeholder:text-stone-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#C5A059] focus:outline-none p-1 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-6">
          <button
            formAction={(formData) => handleAction(formData, login)}
            disabled={isPending}
            className="w-full bg-[#1a1a1a] text-white p-3.5 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-[#C5A059] hover:text-[#1a1a1a] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Processing..." : "Sign In"}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="flex-shrink mx-4 text-stone-400 text-xs uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>

          <button
            formAction={(formData) => handleAction(formData, signup)}
            disabled={isPending}
            className="w-full bg-white border border-stone-300 text-stone-600 hover:border-[#C5A059] hover:text-[#C5A059] p-3.5 rounded-full font-bold uppercase text-xs tracking-widest transition-all disabled:opacity-50"
          >
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    // Background màu Kem đặc trưng (#F9F8F4)
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F8F4] px-4 selection:bg-[#C5A059] selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#C5A059] opacity-5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#1a1a1a] opacity-5 rounded-full blur-[100px]"></div>
      </div>

      <Suspense fallback={<div className="text-[#C5A059] font-serif animate-pulse">Loading Aura...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}