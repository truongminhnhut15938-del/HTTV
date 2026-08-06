// frontend/js/parser.js
// HTTV v2 - Parser PDF (text) và DOCX
// Không thay đổi giao diện hay API đầu ra của HTTV

console.log("HTTV Parser v2 loaded");

(function () {
  "use strict";

  // ===========================
  // Khởi tạo PDF.js
  // ===========================
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js";
  }

  // ===========================
  // Hàm chính
  // ===========================
  async function parseDocument(file) {
    if (!file) throw new Error("Không có file");

    const ext = file.name.toLowerCase().split(".").pop();

    let text = "";

    if (ext === "pdf") {
      text = await parsePDF(file);
    } else if (ext === "docx") {
      text = await parseDOCX(file);
    } else {
      throw new Error("Chỉ hỗ trợ PDF và DOCX");
    }

    text = normalizeText(text);

    return {
      id: Date.now().toString(),
      name: file.name,
      type: ext.toUpperCase(),
      createdAt: new Date().toISOString(),
      metadata: extractMetadata(text),
      clauses: extractClauses(text),
      rawText: text
    };
  }

  // ===========================
  // Đọc PDF text
  // ===========================
  async function parsePDF(file) {
    if (!window.pdfjsLib) {
      throw new Error("PDF.js chưa được nạp");
    }

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: buffer
    }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      const content = await page.getTextContent();

      const pageText = content.items
        .map(item => item.str)
        .join(" ");

      text += pageText + "\n\n";
    }

    if (!text.trim()) {
      throw new Error(
        "PDF không chứa text (PDF scan sẽ được hỗ trợ ở bước OCR)"
      );
    }

    return text;
  }

  // ===========================
  // Đọc DOCX
  // ===========================
  async function parseDOCX(file) {
    if (!window.mammoth) {
      throw new Error("Mammoth chưa được nạp");
    }

    const buffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
      arrayBuffer: buffer
    });

    return result.value || "";
  }

  // ===========================
  // Chuẩn hóa văn bản
  // ===========================
  function normalizeText(text) {
    if (!text) return "";

    // Chuẩn hóa xuống dòng
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Loại khoảng trắng dư
    text = text.replace(/[ \t]+/g, " ");

    // Ghép các dòng bị cắt giữa câu
    text = text.replace(/([a-zà-ỹ0-9,;:])\n([a-zà-ỹ])/gi, "$1 $2");

    // Giữ nguyên dòng tiêu đề
    text = text.replace(/\n{3,}/g, "\n\n");

    // Chuẩn hóa "Số :" -> "Số:"
    text = text.replace(/Số\s*:/gi, "Số:");

    // Chuẩn hóa "Điều1" -> "Điều 1"
    text = text.replace(/Điều\s*([0-9]+)/gi, "Điều $1");

    return text.trim();
  }

  // ===========================
  // Trích metadata pháp lý Việt Nam
  // ===========================
  function extractMetadata(text) {
    const metadata = {
      documentType: "",
      documentNumber: "",
      issuingAgency: "",
      issuedDate: "",
      effectiveDate: ""
    };

    // -----------------------
    // Loại văn bản
    // -----------------------
    const typeRegex =
      /^(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|CÔNG VĂN|THÔNG BÁO|CHỈ THỊ|LUẬT|NGHỊ QUYẾT)\b/im;

    const typeMatch = text.match(typeRegex);

    if (typeMatch) {
      metadata.documentType = typeMatch[1].toUpperCase();
    }

    // -----------------------
    // Số hiệu văn bản
    // -----------------------
    const numberRegex =
      /Số:?\s*([0-9]{1,4}\/[0-9]{4}\/[A-ZÀ-Ỹ0-9-]+|[0-9]{1,4}\/[A-ZÀ-Ỹ0-9-]+|[0-9]{1,4}[A-ZÀ-Ỹ0-9\/-]*)/i;

    const numberMatch = text.match(numberRegex);

    if (numberMatch) {
      metadata.documentNumber = numberMatch[1].trim();
    }

    // -----------------------
    // Cơ quan ban hành
    // -----------------------
    const agencyRegex =
      /(BỘ [A-ZÀ-Ỹ ]+|CHÍNH PHỦ|QUỐC HỘI|THỦ TƯỚNG CHÍNH PHỦ|ỦY BAN NHÂN DÂN [A-ZÀ-Ỹ ]+|UBND [A-ZÀ-Ỹ ]+)/i;

    const agencyMatch = text.match(agencyRegex);

    if (agencyMatch) {
      metadata.issuingAgency = agencyMatch[1].trim();
    }

    // -----------------------
    // Ngày ban hành
    // -----------------------
    const issuedRegex =
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i;

    const issuedMatch = text.match(issuedRegex);

    if (issuedMatch) {
      metadata.issuedDate =
        `${issuedMatch[1].padStart(2, "0")}/${issuedMatch[2].padStart(2, "0")}/${issuedMatch[3]}`;
    }

    // -----------------------
    // Ngày hiệu lực
    // -----------------------
    const effectiveRegex =
      /(có hiệu lực từ ngày|hiệu lực từ ngày|có hiệu lực kể từ ngày)\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i;

    const effectiveMatch = text.match(effectiveRegex);

    if (effectiveMatch) {
      metadata.effectiveDate =
        `${effectiveMatch[2].padStart(2, "0")}/${effectiveMatch[3].padStart(2, "0")}/${effectiveMatch[4]}`;
    }

    return metadata;
  }

  // ===========================
  // Tách Điều khoản
  // ===========================
  function extractClauses(text) {
    const clauses = [];

    // Bắt Điều 1., Điều 1:, Điều 1
    const regex =
      /(?:^|\n)\s*(Điều\s+([0-9]+)(?:[.:])?)([\s\S]*?)(?=(?:\n\s*Điều\s+[0-9]+(?:[.:])?)|$)/gi;

    let match;

    while ((match = regex.exec(text)) !== null) {
      const title = match[1].trim();
      const number = match[2].trim();
      const content = match[3].trim();

      clauses.push({
        number,
        title,
        content
      });
    }

    return clauses;
  }

  // ===========================
  // Export
  // ===========================
  window.parseDocument = parseDocument;

  console.log(
    "HTTV Parser v2 exported:",
    typeof window.parseDocument
  );

})();
