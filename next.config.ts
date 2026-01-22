import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: `${process.env.HOST_NAME}` },
      {
        protocol: "https",
        hostname: "api.dicebear.com", // Cho avatar giảng viên
      },
      {
        protocol: "https",
        hostname: "img.youtube.com", // Cho thumbnail video Youtube
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com", // Domain phụ của Youtube thumbnail
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org", // Cho logo Organization
      },
      {
        protocol: "https",
        hostname: "github.com", // Nếu bạn dùng ảnh từ github
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // Avatar Github user
      },
    ],
  },
  serverExternalPackages: [
    "@prisma/client",
    "bcrypt",
    "fluent-ffmpeg",
    "ffmpeg-static",
    "ffprobe-static",
    "get-video-duration",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
