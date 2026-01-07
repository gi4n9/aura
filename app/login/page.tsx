"use client";

import { useState, useTransition, Suspense } from "react";
import { login, signup } from "./action"; // Import action mới
import { useSearchParams, useRouter } from "next/navigation"; // Thêm useRouter

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const router = useRouter(); // Khởi tạo router
  const searchParams = useSearchParams();
  
  // State để hiển thị lỗi/thông báo ngay tại chỗ (không cần reload URL)
  const [localError, setLocalError] = useState<string | null>(searchParams.get("error"));
  const [localMessage, setLocalMessage] = useState<string | null>(searchParams.get("message"));

  const handleAction = async (formData: FormData, action: any) => {
    // Reset thông báo cũ
    setLocalError(null);
    setLocalMessage(null);

    startTransition(async () => {
      // Gọi Server Action và đợi kết quả trả về
      const result = await action(formData);

      if (result?.error) {
        // Nếu Server báo lỗi -> Hiển thị lỗi
        setLocalError(result.error);
      } else if (result?.success) {
        // Nếu Server báo thành công -> Client tự chuyển hướng
        if (result.message) {
           // Trường hợp đăng ký: Chuyển về login kèm message (hoặc hiện tại chỗ)
           // Ở đây mình dùng replace URL để hiện message mà ko cần reload
           setLocalMessage(result.message);
           // Hoặc nếu muốn reset form thì: 
           // window.location.href = `/login?message=${encodeURIComponent(result.message)}`
        } else {
           // Trường hợp login thành công -> Về trang chủ
           router.push("/"); 
           router.refresh(); // Đảm bảo Header cập nhật lại state login
        }
      }
    });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold gradient-text mb-2">Aura Learning</h2>
        <p className="text-gray-500">Đăng nhập để tiếp tục việc học</p>
      </div>

      {/* Hiển thị Message */}
      {localMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {localMessage}
        </div>
      )}

      {/* Hiển thị Error */}
      {localError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {localError}
        </div>
      )}

      <form className="flex flex-col gap-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 ml-1">Email</label>
          <input
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 ml-1">Mật khẩu</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-6">
          <button
            formAction={(formData) => handleAction(formData, login)}
            disabled={isPending}
            className="w-full gradient-bg text-white p-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/30 disabled:opacity-50"
          >
            {isPending ? "Đang xử lý..." : "Đăng nhập"}
          </button>
          
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">Chưa có tài khoản?</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            formAction={(formData) => handleAction(formData, signup)}
            disabled={isPending}
            className="w-full bg-white border-2 border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-200 p-3.5 rounded-xl font-semibold transition-all disabled:opacity-50"
          >
            Đăng ký miễn phí
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <Suspense fallback={<div>Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}