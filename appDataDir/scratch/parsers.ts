import * as xlsx from "xlsx";

export async function parseAnswerKeyFromImage(buffer: Buffer, mimeType: string, targetExamCode: string | null): Promise<Record<string, string>> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const examCodeInstruction = targetExamCode ? `LƯU Ý QUAN TRỌNG: Bạn chỉ được trích xuất đáp án cho Mã đề thi là "${targetExamCode}". Hãy tìm đúng cột hoặc phần văn bản của mã đề này.` : `Nếu ảnh có nhiều cột mã đề, hãy tự động chọn cột mã đề đầu tiên.`;

    const prompt = `
Bạn là một công cụ đọc bảng đáp án. Nhiệm vụ của bạn là trích xuất chính xác bảng đáp án từ hình ảnh (hoặc dữ liệu).
${examCodeInstruction}

Quy tắc trả về:
- Cấu trúc JSON phải là một dictionary (object) đơn giản: key là "số thứ tự câu hỏi" (kiểu chuỗi), value là "đáp án đúng" (A, B, C, D hoặc DSDS cho đúng/sai).
- Ví dụ:
{
  "1": "A",
  "2": "C",
  "3": "DSDS"
}
Chỉ trả về đối tượng JSON này, không giải thích gì thêm.
`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType
            }
        }
    ]);

    const responseText = result.response.text();
    let parsed: Record<string, string> = {};
    try {
        parsed = JSON.parse(responseText);
    } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }
    return parsed;
}

export async function parseAnswerKeyFromExcel(buffer: Buffer, targetExamCode: string | null): Promise<Record<string, string>> {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const csvData = xlsx.utils.sheet_to_csv(sheet);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API Key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const examCodeInstruction = targetExamCode ? `LƯU Ý QUAN TRỌNG: Chỉ trích xuất cột đáp án dành cho Mã đề thi là "${targetExamCode}".` : `Nếu file có nhiều cột mã đề, hãy lấy cột mã đề đầu tiên.`;

    const prompt = `
Dưới đây là dữ liệu CSV được xuất từ một file Excel chứa bảng đáp án.
Nhiệm vụ của bạn là trích xuất bảng đáp án từ dữ liệu này.
${examCodeInstruction}

Dữ liệu CSV:
${csvData}

Quy tắc trả về:
- Cấu trúc JSON phải là một dictionary: key là "số thứ tự câu hỏi" (chuỗi), value là "đáp án đúng" (A, B, C, D hoặc DSDS).
- Ví dụ:
{
  "1": "A",
  "2": "C"
}
`;

    const result = await model.generateContent([prompt]);
    const responseText = result.response.text();
    
    let parsed: Record<string, string> = {};
    try {
        parsed = JSON.parse(responseText);
    } catch (e) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }
    return parsed;
}
