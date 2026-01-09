// Hàm vừa viết ở bước 1
import Link from "next/link";
import { Plus } from "lucide-react";
import UploadVideoForm from "@/app/components/UploadVideoForm";
import { getPlaylistsForSelect } from "@/app/actions/playlist";

export default async function UploadPage() {
    // 1. Lấy danh sách khóa học từ Database
    const playlists = await getPlaylistsForSelect();

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-stone-800">Upload Video Mới</h2>

                {/* Nút tắt để sang trang tạo khóa học nhanh */}
                <Link href="/instructor/create-course" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Plus size={16} /> Tạo khóa học mới
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                {/* 2. Truyền danh sách vào Form */}
                <UploadVideoForm playlists={playlists} />
            </div>
        </div>
    );
}