"use client";

import { useState } from "react";
import { Pencil, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateCourse } from "@/app/actions/course";

interface WhatYouWillLearnFormProps {
    initialData: {
        whatYouWillLearn: string | null;
    };
    courseId: string;
}

export const WhatYouWillLearnForm = ({ initialData, courseId }: WhatYouWillLearnFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [whatYouWillLearn, setWhatYouWillLearn] = useState(initialData.whatYouWillLearn || "");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const toggleEdit = () => setIsEditing((current) => !current);

    const onSubmit = async () => {
        try {
            setIsLoading(true);
            const res = await updateCourse(courseId, { whatYouWillLearn: whatYouWillLearn });
            if (res.success) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert(res.error);
            }
        } catch {
            alert("Đã có lỗi xảy ra");
        } finally {
            setIsLoading(false);
        }
    };

    // Split items by newline for bulleted display
    const items = (initialData.whatYouWillLearn || "")
        .split("\n")
        .map(i => i.trim())
        .filter(Boolean);

    return (
        <div className="mt-6 border border-stone-200 bg-stone-50 rounded-md p-4">
            <div className="font-bold text-stone-500 text-xs uppercase flex items-center justify-between">
                Bạn sẽ học được gì? (Mỗi mục 1 dòng)
                <button onClick={toggleEdit} className="text-[#C5A059] hover:underline flex items-center gap-1">
                    {isEditing ? "Hủy" : <><Pencil className="h-4 w-4" /> Sửa</>}
                </button>
            </div>

            {!isEditing && (
                <div className="mt-3">
                    {items.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-stone-900 bg-white p-2.5 rounded border border-stone-200 shadow-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span className="leading-snug">{item}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-stone-400 italic mt-2">
                            Chưa nhập mục tiêu khóa học (Nhập mỗi mục 1 dòng)...
                        </p>
                    )}
                </div>
            )}

            {isEditing && (
                <div className="mt-2 space-y-2">
                    <textarea
                        disabled={isLoading}
                        value={whatYouWillLearn}
                        onChange={(e) => setWhatYouWillLearn(e.target.value)}
                        rows={6}
                        placeholder={"Ví dụ:\nNắm vững kiến thức Flutter từ cơ bản đến nâng cao\nXây dựng ứng dụng đa nền tảng cho iOS & Android\nThành thạo State Management với Provider & Bloc"}
                        className="w-full p-3 bg-white text-stone-900 border border-stone-300 rounded-md outline-none focus:ring-2 focus:ring-[#C5A059] text-sm font-normal"
                    />
                    <button
                        onClick={onSubmit}
                        disabled={isLoading}
                        className="bg-[#1a1a1a] text-white text-xs px-4 py-2 rounded-md font-bold hover:bg-stone-800 transition flex items-center gap-2"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
                    </button>
                </div>
            )}
        </div>
    );
};
