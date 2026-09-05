/**
 * Chuẩn hóa các công thức toán học và ký hiệu vector cho hiển thị KaTeX đẹp mắt
 * - Tự động chuyển \vec{...} thành \overrightarrow{...} cho các vector 2 điểm (như \vec{AB}, \vec{C'D'})
 *   để mũi tên vector kéo dài bao trọn tên điểm và không đè lên dấu phẩy (prime).
 * - Tự động nhận diện và bao bọc $...$ cho các vector dạng "vectơ AB" -> "vectơ $\overrightarrow{AB}$".
 * - Tự động nhận diện các đáp án viết trần dạng "C'D'", "AA'." -> "$\overrightarrow{C'D'}$".
 */
export function formatMathForDisplay(text: string | null | undefined): string {
    if (!text) return "";
    let str = text;

    // 1. Chuyển đổi \vec{...} thành \overrightarrow{...} nếu có từ 2 ký tự trở lên (VD: \vec{AB}, \vec{C'D'}, \vec{D'C'})
    // hoặc có dấu phẩy ' (VD: \vec{A'}, \vec{C'})
    str = str.replace(/\\vec\{([A-Za-z0-9_'\^\s]{2,})\}/g, "\\overrightarrow{$1}");
    str = str.replace(/\\vec\{([A-Za-z0-9_'\^\s]+)\}'/g, "\\overrightarrow{$1'}");
    str = str.replace(/\\vec\s+([A-Z][']?)([A-Z][']?)/g, "\\overrightarrow{$1$2}");

    // 2. Tự động thêm $...$ và \overrightarrow cho dạng "vectơ AB" hoặc "vecto AB" nếu chưa có ký hiệu LaTeX
    str = str.replace(/(?:vectơ|vector|vecto)\s+([A-Z][']?[A-Z][']?)(?![A-Za-z0-9_'\$])/gi, (match, vecName) => {
        return `vectơ $\\overrightarrow{${vecName}}$`;
    });

    // 3. Nếu chuỗi trần chỉ là ký hiệu vector 2 điểm (ví dụ options chỉ có "C'D'", "D'C'", "A'A", "A'D'", "AB", "CD")
    // và có thể có dấu chấm cuối câu:
    const trimmed = str.trim();
    const nakedVectorMatch = trimmed.match(/^([A-Z][']?[A-Z][']?)\.?$/);
    if (nakedVectorMatch) {
        return `$\\overrightarrow{${nakedVectorMatch[1]}}$`;
    }

    return str;
}
