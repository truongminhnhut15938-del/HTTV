// frontend/js/parser.js
// HTTV Parser v3 - PHẦN A
// Đọc PDF/DOCX + Chuẩn hóa + Trích metadata pháp lý Việt Nam

console.log("HTTV Parser v3 - Part A loaded");

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
      clauses: extractClauses(text), // Phần B sẽ nâng cấp sâu hơn
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

    let pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      const content = await page.getTextContent();

      // Gom theo thứ tự hiển thị
      const pageText = content.items
        .map(item => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push(pageText);
    }

    const text = pages.join("\n\n");

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

    // Giữ tiêu đề riêng
    text = text.replace(/\n{3,}/g, "\n\n");

    // Chuẩn hóa Số:
    text = text.replace(/Số\s*:/gi, "Số:");

    // Chuẩn hóa Điều
    text = text.replace(/Điều\s*([0-9]+)/gi, "Điều $1");

    // Ghép dòng bị cắt giữa câu
    text = text.replace(
      /([a-zà-ỹ0-9,;:])\n([a-zà-ỹ])/gi,
      "$1 $2"
    );

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

    const head = text.substring(0, 5000);

    // -----------------------
    // Loại văn bản
    // -----------------------
    const typeMatch = head.match(
      /\b(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|CÔNG VĂN|THÔNG BÁO|CHỈ THỊ|LUẬT|NGHỊ QUYẾT)\b/i
    );

    if (typeMatch) {
      metadata.documentType = typeMatch[1].toUpperCase();
    }

    // -----------------------
    // Số hiệu
    // -----------------------
    const numberMatch = head.match(
      /Số:\s*([0-9]{1,4}\/[0-9]{4}\/[A-ZÀ-Ỹ0-9-]+(?:-[A-Z0-9À-Ỹ]+)*)/i
    );

    if (numberMatch) {
      metadata.documentNumber = numberMatch[1].trim();
    } else {
      const numberFallback = head.match(
        /\b[0-9]{1,4}\/[0-9]{4}\/[A-ZÀ-Ỹ0-9-]+(?:-[A-Z0-9À-Ỹ]+)*\b/
      );

      if (numberFallback) {
        metadata.documentNumber = numberFallback[0];
      }
    }

    // -----------------------
    // Cơ quan ban hành
    // -----------------------
    const agencyPatterns = [
      /BỘ [A-ZÀ-Ỹ ]+/i,
      /CHÍNH PHỦ/i,
      /QUỐC HỘI/i,
      /THỦ TƯỚNG CHÍNH PHỦ/i,
      /ỦY BAN NHÂN DÂN [A-ZÀ-Ỹ ]+/i,
      /UBND [A-ZÀ-Ỹ ]+/i
    ];

    for (const p of agencyPatterns) {
      const m = head.match(p);

      if (m) {
        metadata.issuingAgency = m[0].trim();
        break;
      }
    }

    // -----------------------
    // Ngày ban hành
    // -----------------------
    let issuedMatch = head.match(
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
    );

    if (issuedMatch) {
      metadata.issuedDate =
        `${issuedMatch[1].padStart(2, "0")}/${issuedMatch[2].padStart(2, "0")}/${issuedMatch[3]}`;
    } else {
      const slashDate = head.match(
        /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
      );

      if (slashDate) {
        metadata.issuedDate =
          `${slashDate[1].padStart(2, "0")}/${slashDate[2].padStart(2, "0")}/${slashDate[3]}`;
      }
    }

    // -----------------------
    // Ngày hiệu lực
    // -----------------------
    const effectivePatterns = [
      /có hiệu lực(?: thi hành)?(?: kể từ)?[^0-9]*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
      /có hiệu lực(?: thi hành)?(?: kể từ)?[^\\n]*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i,
      /hiệu lực từ ngày[^0-9]*(\d{1,2})\/(\d{1,2})\/(\d{4})/i
    ];

    for (const p of effectivePatterns) {
      const m = text.match(p);

      if (m) {
        metadata.effectiveDate =
          `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
        break;
      }
    }

    return metadata;
  }

  // ===========================
  // Tạm thời giữ parser điều khoản
  // (Phần B sẽ thay bằng parser cấu trúc)
  // ===========================
  function extractClauses(text) {
    const clauses = [];

    const regex =
      /(?:^|\n)\s*(Điều\s+([0-9]+)(?:[.:])?)([\s\S]*?)(?=(?:\n\s*Điều\s+[0-9]+(?:[.:])?)|$)/gi;

    let match;

    while ((match = regex.exec(text)) !== null) {
      clauses.push({
        number: match[2].trim(),
        title: match[1].trim(),
        content: match[3].trim()
      });
    }

    return clauses;
  }

  // ===========================
  // Export
  // ===========================
  window.parseDocument = parseDocument;

  console.log(
    "HTTV Parser v3 - Part A exported:",
    typeof window.parseDocument
  );

})();
