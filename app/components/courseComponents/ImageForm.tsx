"use client";

import { useState } from "react";
import { Pencil, PlusCircle, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { updateCourse } from "@/app/actions/course";

interface ImageFormProps {
    initialData: {
        thumbnailUrl: string | null;
    };
    courseId: string;
}

export const ImageForm = ({ initialData, courseId }: ImageFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const toggleEdit = () => setIsEditing((current) => !current);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        try {
            setIsLoading(true);
            const file = e.target.files[0];

            // 1. Upload lên Supabase Storage
            // Đặt tên file unique bằng timestamp
            const fileName = `${courseId}-${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage
                .from("course-thumbnails")
                .upload(fileName, file);

            if (error) {
                alert("Lỗi upload ảnh: " + error.message);
                return;
            }

            // 2. Lấy Public URL
            const { data: publicUrlData } = supabase.storage
                .from("course-thumbnails")
                .getPublicUrl(data.path);

            // 3. Update vào Database qua Server Action
            const res = await updateCourse(courseId, { thumbnailUrl: publicUrlData.publicUrl });

            if (res.success) {
                setIsEditing(false);
                router.refresh();
            }
        } catch (error) {
            console.log(error);
            alert("Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 border border-stone-200 bg-stone-50 rounded-md p-4">
            <div className="font-bold text-stone-500 text-xs uppercase flex items-center justify-between">
                Ảnh bìa khóa học
                <button onClick={toggleEdit} className="text-[#C5A059] hover:underline flex items-center gap-1">
                    {isEditing && <>Hủy</>}
                    {!isEditing && !initialData.thumbnailUrl && (
                        <><PlusCircle className="h-4 w-4" /> Thêm ảnh</>
                    )}
                    {!isEditing && initialData.thumbnailUrl && (
                        <><Pencil className="h-4 w-4" /> Sửa ảnh</>
                    )}
                </button>
            </div>

            {!isEditing && (
                !initialData.thumbnailUrl ? (
                    <div className="flex items-center justify-center h-60 bg-stone-200 rounded-md mt-2">
                        <ImageIcon className="h-10 w-10 text-stone-400" />
                    </div>
                ) : (
                    <div className="relative aspect-video mt-2 rounded-md overflow-hidden border border-stone-200">
                        <Image
                            alt="Upload"
                            fill
                            className="object-cover"
                            src={initialData.thumbnailUrl}
                        />
                    </div>
                )
            )}

            {isEditing && (
                <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-60 border-2 border-stone-300 border-dashed rounded-lg cursor-pointer bg-stone-50 hover:bg-stone-100 transition">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {isLoading ? (
                                    <Loader2 className="h-10 w-10 text-stone-400 animate-spin" />
                                ) : (
                                    <>
                                        <ImageIcon className="w-10 h-10 mb-3 text-stone-400" />
                                        <p className="mb-2 text-sm text-stone-500"><span className="font-semibold">Click để tải ảnh lên</span></p>
                                        <p className="text-xs text-stone-500">JPG, PNG, WEBP (Max 5MB)</p>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleUpload}
                                disabled={isLoading}
                            />
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};