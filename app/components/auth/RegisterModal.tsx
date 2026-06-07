"use client";

import React, { useState } from 'react';
import { Sparkles, Mail, Lock, EyeOff, Eye, ArrowRight, X, User } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { signup } from '@/app/actions/auth';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const res = await signup(formData);
      
      if (res?.error) {
        setErrorMsg(res.error);
        setIsLoading(false);
      }
    } catch (err) {
      // Next.js redirect() throws an error to navigate.
      onClose();
      throw err;
    }
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden selection:bg-[#C5A059]/20 max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 text-stone-400 hover:text-stone-800 transition-colors rounded-full hover:bg-stone-100"
            >
              <X size={20} />
            </button>

            {/* Content */}
            <div className="relative z-10 p-8 sm:p-10 flex flex-col items-center">

              {/* Brand Identity */}
              <div className="mb-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 mb-5 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm">
                  <Sparkles className="text-[#C5A059]" size={22} />
                </div>
                <h2 className="font-serif text-3xl text-stone-900 tracking-tight font-bold">Join Aura</h2>
                <p className="text-xs text-stone-500 mt-2 font-sans">Step into the future of illuminated intelligence.</p>
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
                    Full Name
                  </label>
                  <div className="relative flex items-center border-b border-stone-200 focus-within:border-[#A88849] transition-colors duration-300 pb-2">
                    <User size={16} className="absolute left-0 text-stone-600 pointer-events-none" />
                    <input
                      className="w-full bg-transparent border-none py-0 pl-9 pr-0 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none shadow-none"
                      id="fullname"
                      name="fullname"
                      placeholder="e.g. Alex Rivers"
                      required
                      type="text"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                  <label className="text-[10px] sm:text-xs font-bold text-stone-600 uppercase tracking-wider sm:tracking-widest" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative flex items-center border-b border-stone-200 focus-within:border-[#A88849] transition-colors duration-300 pb-2">
                    <Mail size={16} className="absolute left-0 text-stone-600 pointer-events-none" />
                    <input
                      className="w-full bg-transparent border-none py-0 pl-9 pr-0 text-sm text-stone-800 focus:ring-0 placeholder:text-stone-300 outline-none focus:outline-none shadow-none"
                      id="email"
                      name="email"
                      placeholder="scholar@example.com"
                      required
                      type="email"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                  <label className="text-[10px] sm:text-xs font-bold text-stone-600 uppercase tracking-wider sm:tracking-widest" htmlFor="password">
                    Password
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
                    Confirm Password
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
                    I agree to the <Link href="#" className="text-[#C5A059] hover:underline">Terms of Service</Link> and <Link href="#" className="text-[#C5A059] hover:underline">Privacy Policy</Link>.
                  </label>
                </div>

                {/* Primary Action Button */}
                <button
                  className="mt-2 w-full bg-[#C5A059] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest py-3.5 rounded-md hover:bg-[#A88849] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      ĐANG XỬ LÝ...
                    </span>
                  ) : (
                    <>
                      <span>Đăng ký ngay</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Link */}
              <div className="mt-8 pt-6 border-t border-stone-100 w-full text-center">
                <p className="text-xs text-stone-500">
                  Already have an account?{' '}
                  <button onClick={onSwitchToLogin} className="text-[#C5A059] hover:text-[#A88849] transition-colors font-semibold">
                    Log in here
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
