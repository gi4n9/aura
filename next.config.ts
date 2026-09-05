import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Config allowed origins cho dev mode khi truy cập bằng địa chỉ IP mạng nội bộ
  allowedDevOrigins: ['localhost:3000', '192.168.1.2:3000', '127.0.0.1:3000'],

  // Next.js 16 dùng Turbopack mặc định
  turbopack: {
    // Thêm config nếu cần, hiện tại để trống
  },

  images: {
    unoptimized: process.env.NODE_ENV === "development",
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Tối ưu image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // Cache 1 ngày
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: `${process.env.HOST_NAME}` },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
      // Supabase Storage
      {
        protocol: 'https',
        hostname: 'jeauhbdwsdwovrdovrre.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // External packages không bundle vào client
  serverExternalPackages: [
    "@prisma/client",
    "bcrypt",
    "fluent-ffmpeg",
    "ffmpeg-static",
    "ffprobe-static",
    "get-video-duration",
    "tesseract.js",
    "pdf-parse",
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Tối ưu package imports - Tree shaking cho các thư viện lớn
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@react-three/fiber",
      "@react-three/drei",
      "three",
      "react-markdown",
      "@supabase/supabase-js",
    ],
  },

  // Bật compression cho responses
  compress: true,

  // Tối ưu production build
  productionBrowserSourceMaps: false, // Tắt source maps ở production

  // Headers cho caching
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // Cache 1 năm cho 3D models
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
