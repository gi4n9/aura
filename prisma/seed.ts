// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type JsonData = {
  metadata: {
    playlist_title: string;
    channel: string;
    total_videos: number;
    crawl_time: string;
  };
  videos: Array<{
    stt: number;
    title: string;
    url: string;
    id: string;
  }>;
};

async function main() {
  // 1. Cập nhật danh sách tên file CHÍNH XÁC theo ảnh bạn gửi
  const fileNames = [
    "data_HTML,_CSS_từ_Zero_Tới_Hero_F8_Official.json",
    "data_Javascript_Cơ_Bản_F8_Official.json",
    "data_Javascript_Nâng_Cao_F8_Official.json",
    "data_NodeJS_&_ExpressJS_F8_Official.json", // Tên file này khác code cũ
    "data_React_Hooks_2022_F8_Official.json", // File mới thấy trong ảnh
    "data_ReactJS_2022_F8_Official.json", // File mới thấy trong ảnh
    "data_Session,_cookie,_CORS,_JWT,_SSO_F8_Official.json", // File mới thấy trong ảnh
  ];

  console.log(`🚀 Bắt đầu import ${fileNames.length} playlists...`);

  for (const fileName of fileNames) {
    try {
      // 2. SỬA LỖI ĐƯỜNG DẪN Ở ĐÂY:
      // Vì file json nằm cùng cấp với seed.ts, ta bỏ chữ "data" đi
      const filePath = path.join(__dirname, fileName);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Không tìm thấy file: ${fileName} -> Bỏ qua.`);
        continue;
      }

      const rawData = fs.readFileSync(filePath, "utf-8");
      const data: JsonData = JSON.parse(rawData);

      console.log(`\n📂 Đang xử lý: ${data.metadata.playlist_title}...`);

      // 3. Tạo Playlist
      const playlist = await prisma.playlist.create({
        data: {
          title: data.metadata.playlist_title,
          channel: data.metadata.channel,
          // Mô tả giả lập
          description: `Khóa học ${data.metadata.playlist_title} miễn phí từ kênh ${data.metadata.channel}.`,
          // Nếu schema bạn ĐÃ CÓ totalVideos và crawlTime thì giữ nguyên
          // Nếu chưa có thì comment lại 2 dòng dưới
          totalVideos: data.metadata.total_videos,
          crawlTime: new Date(data.metadata.crawl_time),
        },
      });

      console.log(`   + Đã tạo Playlist ID: ${playlist.id}`);

      // 4. Map dữ liệu Video
      const videoData = data.videos.map((video) => ({
        stt: video.stt,
        title: video.title,
        youtubeId: video.id,
        playlistId: playlist.id,
      }));

      // 5. Insert Video
      const result = await prisma.video.createMany({
        data: videoData,
        skipDuplicates: true,
      });

      console.log(`   + Đã thêm ${result.count} videos.`);
    } catch (error) {
      console.error(`❌ Lỗi khi xử lý file ${fileName}:`, error);
    }
  }

  console.log("\n🎉 Hoàn tất import!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
