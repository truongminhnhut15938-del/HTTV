// frontend/js/parser.js
// HTTV v1 - Parser PDF (text) và DOCX
// Đảm bảo export window.parseDocument để app.js luôn gọi được

console.log("HTTV parser loaded");

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
      throw new Error("PDF không chứa text (PDF scan sẽ được hỗ trợ ở bước OCR)");
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
  // Chuẩn hóa text
  // ===========================
  function normalizeText(text) {
    return text
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // ===========================
  // Trích metadata
  // ===========================
  function extractMetadata(text) {
    const metadata = {
      documentType: "",
      documentNumber: "",
      issuingAgency: "",
      issuedDate: "",
      effectiveDate: ""
    };

    const typeMatch = text.match(
      /(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|CÔNG VĂN|CHỈ THỊ|THÔNG BÁO)/i
    );

    if (typeMatch) {
      metadata.documentType = typeMatch[1].toUpperCase();
    }

    const numberMatch = text.match(
      /(Số|SO)[: ]+([0-9A-Za-z/\-.]+)/i
    );

    if (numberMatch) {
      metadata.documentNumber = numberMatch[2];
    }

    const agencyMatch = text.match(
      /(BỘ [A-ZÀ-Ỹ ]+|ỦY BAN NHÂN DÂN [A-ZÀ-Ỹ ]+|CHÍNH PHỦ|QUỐC HỘI)/i
    );

    if (agencyMatch) {
      metadata.issuingAgency = agencyMatch[1];
    }

    const dateMatch = text.match(
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
    );

    if (dateMatch) {
      metadata.issuedDate =
        `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
    }

    const effectiveMatch = text.match(
      /(có hiệu lực từ ngày|hiệu lực từ ngày)\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
    );

    if (effectiveMatch) {
      metadata.effectiveDate =
        `${effectiveMatch[2]}/${effectiveMatch[3]}/${effectiveMatch[4]}`;
    }

    return metadata;
  }

  // ===========================
  // Tách Điều khoản
  // ===========================
  function extractClauses(text) {
    const clauses = [];

    const regex = /Điều\s+([0-9]+)[.:]?([\s\S]*?)(?=Điều\s+[0-9]+|$)/gi;

    let match;

    while ((match = regex.exec(text)) !== null) {
      clauses.push({
        number: match[1],
        title: `Điều ${match[1]}`,
        content: match[2].trim()
      });
    }

    return clauses;
  }

  // ===========================
  // Export ra global
  // ===========================
  window.parseDocument = parseDocument;
  console.log("HTTV parseDocument exported", typeof window.parseDocument);

})();
