import { createClient } from "@supabase/supabase-js";

export const createAdminClient = async () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
    )
}

/**
 * Tự động tải ảnh Base64 lên Supabase Storage và trả về Public URL
 * Giúp giảm kích thước payload từ hàng MB base64 xuống URL vài chục byte,
 * tránh lỗi Next.js "Body exceeded 1 MB limit" khi lưu bài học.
 */
export async function uploadBase64ToStorage(
    base64DataUrl: string, 
    folder: string = "worksheets"
): Promise<string> {
    if (!base64DataUrl || !base64DataUrl.startsWith("data:image/")) {
        return base64DataUrl;
    }

    try {
        const matches = base64DataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) return base64DataUrl;

        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const filePath = `${folder}/${crypto.randomUUID()}.${ext}`;

        const supabase = await createAdminClient();
        const { error } = await supabase.storage
            .from("quiz-attachments")
            .upload(filePath, buffer, {
                contentType: `image/${matches[1]}`,
                upsert: true
            });

        if (error) {
            console.error("⚠️ Supabase Storage upload error:", error.message);
            return base64DataUrl;
        }

        const { data } = supabase.storage
            .from("quiz-attachments")
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (err) {
        console.error("⚠️ Failed to upload base64 image to Supabase Storage:", err);
        return base64DataUrl;
    }
}