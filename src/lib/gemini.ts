import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export const OCR_SCHEMA = {
  description: "Extract structured data for warehouse input from pharmaceutical invoices",
  type: "object",
  properties: {
    merchant: { type: "string", description: "Name of the pharmaceutical vendor" },
    date: { type: "string", description: "Invoice date (DD/MM/YYYY format)" },
    invoiceNo: { type: "string", description: "The Invoice Number (Số hóa đơn)" },
    items: {
      type: "array",
      description: "List of medicine items in the invoice table",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Product/Medicine Name" },
          packaging: { type: "string", description: "Packaging info (Quy cách)" },
          batch: { type: "string", description: "Batch Number (Số lô)" },
          expiry: { type: "string", description: "Expiry Date (Hạn dùng) in DD/MM/YYYY format" },
          quantity: { type: "number", description: "Quantity (Số lượng)" },
        },
        required: ["name", "quantity"],
      },
    },
  },
  required: ["merchant", "items"],
};

export async function analyzeImage(base64Data: string, mimeType: string, apiKey: string, vendor: string = "DEFAULT") {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: OCR_SCHEMA as any,
    },
  });

  const vendorHints: Record<string, string> = {
    "sanofi": "Đây là hóa đơn hãng SANOFI. HÃY TRÍCH XUẤT CHÍNH XÁC:\n- merchant: Tên đầy đủ 'CÔNG TY TNHH SANOFI-AVENTIS VIỆT NAM'.\n- date: Ghép từ Ngày, tháng, năm ở đầu hóa đơn (Ví dụ: 20/03/2026).\n- invoiceNo: Số dưới chữ 'Số / No.' (Ví dụ 00000190).\n- Items trong bảng:\n  + name: Tên thuốc ở cột 2.\n  + packaging: Trả về null hoặc để trống.\n  + batch: Phần đầu cột 4 (trước dấu /).\n  + expiry: Phần sau cột 4 (sau dấu /).\n  + quantity: Ở cột 6. LƯU Ý QUAN TRỌNG: Dấu chấm (.) là dấu ngăn cách hàng nghìn. Ví dụ '3.282' là số nguyên 3282. Không được lấy là 3 hay 3.282.",
    "davipharm": "Đây là hóa đơn hãng DAVIPHARM. HÃY TRÍCH XUẤT CHÍNH XÁC CÁC TRƯỜNG SAU:\n- merchant: Tên đầy đủ sau 'Đơn vị bán hàng (Seller):'.\n- date: Sau chữ 'Ngày (Dated):'.\n- invoiceNo: Số sau chữ 'Số (Invoice No.):' (Ví dụ 459). LƯU Ý: Không nhầm với 'Ký hiệu (Serial No.):'.\n- Items trong bảng:\n  + name: Tên thuốc ở cột 2.\n  + packaging: Quy cách (ví dụ 'Hộp / 100 Viên') nằm cuối cột 2.\n  + batch: Sau chữ 'LSX:' ở cột 2.\n  + expiry: Sau chữ 'HSD:' ở cột 2.\n  + quantity: Ở cột 4. LƯU Ý: Dấu chấm (.) là dấu ngăn cách hàng nghìn. Ví dụ '28.000' là số nguyên 28000.",
    "hapharco": "Đây là hóa đơn hãng HAPHARCO (Dược Hà Nội): Tên thuốc ở cột 2. Số lô ở cột 3. Hạn dùng ở cột 4. Số lượng ở cột 6. Bỏ qua packaging.",
    "sang_pharma": "Đây là hóa đơn hãng SANG PHARMA. HÃY TRÍCH XUẤT CHÍNH XÁC:\n- merchant: CÔNG TY TNHH THƯƠNG MẠI VÀ DƯỢC PHẨM SANG (SANG PHARMA).\n- date: Sau 'Ngày hóa đơn:' (Ví dụ: 24/03/2026).\n- invoiceNo: Sau 'Số hóa đơn:' (Ví dụ: 86860).\n- Items trong bảng:\n  + name: Tên thuốc ở cột 3.\n  + packaging: Trả về null.\n  + batch: Ở cột 5. LƯU Ý: Số lô thường có đuôi như '/V1', '/V2'. Hãy lấy NGUYÊN VĂN cả chuỗi này (Ví dụ: KTOTC24/V1), không được tự ý bỏ dấu gạch chéo.\n  + expiry: Ở cột 6 (định dạng DD/MM/YYYY).\n  + quantity: Ở cột 8. Lấy số nguyên (Ví dụ 530).",
    "maxxcare": "Đây là hóa đơn hãng MAXXCARE (MEGA). HÃY TRÍCH XUẤT CHÍNH XÁC:\n- merchant: CÔNG TY TNHH MAXXCARE.\n- date: Ghép từ Ngày, tháng, năm (Ví dụ: 30/03/2026).\n- invoiceNo: Số ở góc trên bên phải sau chữ 'Số:' (Ví dụ: 65).\n- Items trong bảng:\n  + name: Tên thuốc ở cột 2.\n  + packaging: Cột 5 (Đơn vị tính), ví dụ: 'Hop/10vi/10vien'.\n  + batch: Cột 3.\n  + expiry: Cột 4.\n  + quantity: Cột 6. LƯU Ý: Dấu chấm (.) là dấu ngăn cách hàng nghìn.",
    "astrazeneca": "Đây là hóa đơn hãng ASTRAZENECA (AZ). HÃY TRÍCH XUẤT CHÍNH XÁC:\n- merchant: Tên đầy đủ sau 'Đơn vị bán hàng (Seller):' là 'CÔNG TY TNHH ASTRAZENECA VIỆT NAM'.\n- date: Ghép từ Ngày, tháng, năm (Ví dụ: 16/03/2026).\n- invoiceNo: Số ở góc trên bên phải tại ô 'Số (No.)' (Ví dụ: 00000161).\n- Items trong bảng:\n  + name: Tên thuốc ở cột 3.\n  + packaging: Để trống hoặc null vì hóa đơn không có cột này.\n  + batch: Cột 4 (Số lô).\n  + expiry: Cột 5 (Định dạng DD.MM.YYYY, hãy chuyển về DD/MM/YYYY).\n  + quantity: Cột 7. LƯU Ý: Dấu chấm (.) là dấu ngăn cách hàng nghìn.",
    "DEFAULT": "Tự động nhận diện Tên sản phẩm, Quy cách, Số lô, Hạn dùng và Số lượng từ bảng hóa đơn."
  };

  const prompt = `
    Trích xuất dữ liệu hóa đơn dược phẩm phục vụ nhập kho. 
    Lưu ý: ${vendorHints[vendor] || vendorHints.DEFAULT}
    Yêu cầu:
    1. Product Name: Tên thuốc đầy đủ.
    2. Batch: Số lô sản xuất.
    3. Expiry: Hạn dùng (Chuyển về định dạng DD/MM/YYYY).
    4. Quantity: Số lượng dạng số.
  `;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    },
  ]);

  const response = await result.response;
  return JSON.parse(response.text());
}
