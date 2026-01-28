import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Font tiêu đề sang trọng
        serif: ['"Playfair Display"', "Georgia", "serif"],
        // Font nội dung hiện đại
        sans: ['"Inter"', "sans-serif"],
      },
      colors: {
        // Bộ màu AlphaQubit
        nobel: {
          gold: "#C5A059", // Vàng kim loại (Accent)
          cream: "#F9F8F4", // Kem nền nã (Background)
          dark: "#1a1a1a", // Đen đá (Text chính)
        },
      },
    },
  },
  plugins: [],
};
export default config;
