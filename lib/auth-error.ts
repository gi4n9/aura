import { prisma } from "@/lib/prisma";

export interface AuthErrorResponse {
  error: string;
  code: string;
}

/**
 * Phân tích và chuyển đổi các thông báo lỗi thô của Supabase Auth thành mã lỗi và thông báo chi tiết
 */
export async function resolveLoginError(
  supabaseError: any,
  rawEmail?: string
): Promise<AuthErrorResponse> {
  const email = (rawEmail || "").trim().toLowerCase();
  const errMsg = (supabaseError?.message || "").toLowerCase();
  const errCode = supabaseError?.code || "";
  const status = supabaseError?.status;

  // 1. Kiểm tra lỗi Invalid Credentials (email sai hoặc password sai)
  if (
    errMsg.includes("invalid login credentials") ||
    errMsg.includes("invalid credentials") ||
    errCode === "invalid_credentials" ||
    errCode === "invalid_grant" ||
    status === 400
  ) {
    if (email) {
      try {
        const existingProfile = await prisma.profile.findUnique({
          where: { email },
          select: { id: true, role: true }
        });

        if (!existingProfile) {
          return {
            error: `Tài khoản với email "${email}" chưa được đăng ký trong hệ thống Aura.`,
            code: "ERR_USER_NOT_FOUND"
          };
        } else {
          return {
            error: "Mật khẩu không chính xác. Vui lòng kiểm tra lại mật khẩu của bạn.",
            code: "ERR_WRONG_PASSWORD"
          };
        }
      } catch (dbErr) {
        console.error("Lỗi khi tra cứu Profile trong resolveLoginError:", dbErr);
      }
    }

    return {
      error: "Thông tin đăng nhập (Email hoặc Mật khẩu) không chính xác.",
      code: "ERR_INVALID_CREDENTIALS"
    };
  }

  // 2. Kiểm tra chưa xác thực email
  if (errMsg.includes("email not confirmed") || errCode === "email_not_confirmed") {
    return {
      error: "Tài khoản email này chưa được xác thực. Vui lòng kiểm tra hộp thư email để xác minh.",
      code: "ERR_EMAIL_NOT_CONFIRMED"
    };
  }

  // 3. Kiểm tra tài khoản bị khóa / vô hiệu hóa
  if (errMsg.includes("user disabled") || errMsg.includes("banned") || errCode === "user_disabled") {
    return {
      error: "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ Quản trị viên.",
      code: "ERR_ACCOUNT_DISABLED"
    };
  }

  // 4. Kiểm tra giới hạn số lần thử (Rate limit / Too Many Requests)
  if (status === 429 || errMsg.includes("rate limit") || errCode === "over_request_rate_limit") {
    return {
      error: "Bạn đã thử đăng nhập quá nhiều lần liên tiếp. Vui lòng chờ 1 - 2 phút rồi thử lại.",
      code: "ERR_TOO_MANY_REQUESTS"
    };
  }

  // Fallback cho các lỗi khác
  return {
    error: supabaseError?.message || "Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.",
    code: errCode || "ERR_LOGIN_FAILED"
  };
}
