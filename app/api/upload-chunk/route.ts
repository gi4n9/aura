import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Tắt body parser mặc định của Next.js để nhận raw binary data
export const runtime = "nodejs";

// Giới hạn body size lên tới 50MB mỗi chunk
export const maxDuration = 60; // 60 giây timeout

const TEMP_DIR = path.join(process.cwd(), "tmp");

export async function POST(request: NextRequest) {
  try {
    // Đọc metadata từ headers
    const fileName = request.headers.get("x-file-name");
    const chunkIndex = request.headers.get("x-chunk-index");

    if (!fileName || chunkIndex === null) {
      return NextResponse.json(
        { error: "Thiếu thông tin file (x-file-name, x-chunk-index)" },
        { status: 400 }
      );
    }

    // Tạo thư mục tạm nếu chưa có
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Đọc body (binary data)
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ghi chunk vào file tạm
    const chunkPath = path.join(TEMP_DIR, `${fileName}_part_${chunkIndex}`);
    fs.writeFileSync(chunkPath, buffer);

    return NextResponse.json({
      success: true,
      chunkIndex: Number(chunkIndex),
      size: buffer.length,
    });
  } catch (error: any) {
    console.error("❌ Upload chunk error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi không xác định" },
      { status: 500 }
    );
  }
}
