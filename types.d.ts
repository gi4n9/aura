// Khai báo cho ffprobe-static
declare module "ffprobe-static" {
  const path: string;
  export { path };
}

// Khai báo cho ffmpeg-static (bạn sẽ cần cái này luôn)
declare module "ffmpeg-static" {
  const path: string;
  export default path;
}
