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
  // 1. Đọc file JSON
  const filePath = path.join(__dirname, "/data_F8_Official.json");
  const rawData = fs.readFileSync(filePath, "utf-8");
  const data: JsonData = JSON.parse(rawData);

  console.log(
    `🚀 Start importing playlist: ${data.metadata.playlist_title}...`
  );

  // 2. Tạo Playlist trước
  const playlist = await prisma.playlist.create({
    data: {
      title: data.metadata.playlist_title,
      channel: data.metadata.channel,
      totalVideos: data.metadata.total_videos,
      crawlTime: new Date(data.metadata.crawl_time), // Convert string sang Date
    },
  });

  console.log(`✅ Created Playlist ID: ${playlist.id}`);

  // 3. Chuẩn bị dữ liệu Video để insert hàng loạt (bulk insert)
  // Map fields từ JSON sang đúng tên field trong Prisma Schema
  const videoData = data.videos.map((video) => ({
    stt: video.stt,
    title: video.title,
    url: video.url,
    youtubeId: video.id, // Map "id" của JSON vào "youtubeId" của DB
    playlistId: playlist.id, // Gắn ID của playlist vừa tạo
  }));

  // 4. Insert Videos
  // createMany nhanh hơn create từng cái trong vòng lặp
  const result = await prisma.video.createMany({
    data: videoData,
    skipDuplicates: true, // Bỏ qua nếu trùng youtubeId
  });

  console.log(`✅ Successfully imported ${result.count} videos!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
