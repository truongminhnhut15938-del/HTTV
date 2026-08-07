// frontend/js/parser.js
// HTTV Parser v5
// Engine tổng quát cho văn bản pháp luật Việt Nam
// Hỗ trợ PDF text và DOCX
// Giữ nguyên API: window.parseDocument(file)

console.log("HTTV Parser v5 loaded");

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

    let lines = [];

    if (ext === "pdf") {
      lines = await parsePDFLines(file);
    } else if (ext === "docx") {
      lines = await parseDOCX(file);
    } else {
      throw new Error("Chỉ hỗ trợ PDF và DOCX");
    }

    lines = normalizeLines(lines);

    const text = lines.join("\n");

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
  // PDF Reconstruction Engine
  // Đọc PDF theo tọa độ và tái tạo dòng
  // ===========================
  async function parsePDFLines(file) {
    if (!window.pdfjsLib) {
      throw new Error("PDF.js chưa được nạp");
    }

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: buffer
    }).promise;

    const allLines = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {

      const page = await pdf.getPage(pageIndex);

      const content = await page.getTextContent();

      // Gom item theo tọa độ Y
      const rows = new Map();

      for (const item of content.items) {

        const y = Math.round(item.transform[5]);

        if (!rows.has(y)) rows.set(y, []);

        rows.get(y).push({
          x: item.transform[4],
          text: item.str
        });
      }

      // Sắp xếp từ trên xuống
      const ys = Array.from(rows.keys())
        .sort((a, b) => b - a);

      const pageLines = [];

      for (const y of ys) {

        const row = rows.get(y)
          .sort((a, b) => a.x - b.x);

        let line = "";

        let lastX = null;

        for (const item of row) {

          if (lastX !== null && item.x - lastX > 8) {
            line += " ";
          }

          line += item.text;

          lastX = item.x + item.text.length * 4;
        }

        line = line
          .replace(/\s+/g, " ")
          .trim();

        if (line) pageLines.push(line);
      }

      // Ghép các tiêu đề viết hoa bị tách dòng
      for (let i = 0; i < pageLines.length; i++) {

        let line = pageLines[i];

        while (
          i + 1 < pageLines.length &&
          /^[A-ZÀ-Ỹ0-9\s.,-]{2,}$/.test(line) &&
          /^[A-ZÀ-Ỹ0-9\s.,-]{2,}$/.test(pageLines[i + 1]) &&
          line.length < 40
        ) {
          line += " " + pageLines[i + 1];
          i++;
        }

        allLines.push(line);
      }

      // Ngăn cách giữa các trang
      allLines.push("");
    }

    if (!allLines.length) {
      throw new Error(
        "PDF không chứa text (PDF scan sẽ được hỗ trợ ở bước OCR)"
      );
    }

    return allLines;
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

    return (result.value || "").split(/\r?\n/);
  }

  // ===========================
  // Chuẩn hóa văn bản
  // ===========================
  function normalizeLines(lines) {

    const normalized = [];

    for (let line of lines) {

      line = line.replace(/[ \t]+/g, " ").trim();

      if (!line) {
        normalized.push("");
        continue;
      }

      // Chuẩn hóa lỗi OCR/PDF.js phổ biến
      line = line
        .replace(/^S6\s*:/i, "Số:")
        .replace(/^SO\s*:/i, "Số:")
        .replace(/^SỐ\s*:/i, "Số:")
        .replace(/THONG\s*T[UƯI]/gi, "THÔNG TƯ")
        .replace(/NGAN\s*HANG/gi, "NGÂN HÀNG")
        .replace(/NHA\s*NUOC/gi, "NHÀ NƯỚC")
        .replace(/VIET\s*NAM/gi, "VIỆT NAM")
        .replace(/HA\s*NOI/gi, "Hà Nội")
        .replace(/ngay/gi, "ngày")
        .replace(/thang/gi, "tháng")
        .replace(/nam/gi, "năm")
        .replace(/^Điều\s*([0-9]+)/i, "Điều $1");

      normalized.push(line);
    }

    // Loại dòng trống liên tiếp
    const result = [];

    for (const line of normalized) {

      if (
        line === "" &&
        result.length &&
        result[result.length - 1] === ""
      ) {
        continue;
      }

      result.push(line);
    }

    return result;
  }

  // ===== KHỐI 2/3 SẼ NỐI TIẾP TỪ ĐÂY =====
   // ===========================
  // Metadata Parser (tổng quát)
  // ===========================
  function extractMetadata(text) {

    const metadata = {
      documentType: "",
      documentNumber: "",
      issuingAgency: "",
      issuedDate: "",
      effectiveDate: ""
    };

    const head = text
      .slice(0, 4000)
      .replace(/\r/g, "");

    // -----------------------
    // Loại văn bản
    // -----------------------
    const typePatterns = [
      /THÔNG\s+TƯ/i,
      /NGHỊ\s+ĐỊNH/i,
      /QUYẾT\s+ĐỊNH/i,
      /CÔNG\s+VĂN/i,
      /THÔNG\s+BÁO/i,
      /CHỈ\s+THỊ/i,
      /LUẬT/i,
      /NGHỊ\s+QUYẾT/i
    ];

    for (const p of typePatterns) {
      const m = head.match(p);

      if (m) {
        metadata.documentType = m[0]
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
        break;
      }
    }

    // -----------------------
    // Số hiệu
    // Ví dụ:
    // 01/2014/TT-NHNN
    // 12/2020/NĐ-CP
    // 345/QĐ-BTC
    // -----------------------
    const numberPatterns = [
      /Số:\s*([0-9]{1,4}\/[0-9]{4}\/[A-ZÀ-Ỹ0-9-]+)/i,
      /Số:\s*([0-9]{1,4}\/[A-ZÀ-Ỹ0-9-]+)/i,
      /([0-9]{1,4}\/[0-9]{4}\/[A-ZÀ-Ỹ0-9-]+)/i
    ];

    for (const p of numberPatterns) {
      const m = head.match(p);

      if (m) {
        metadata.documentNumber = m[1]
          .replace(/\s+/g, "")
          .trim()
          .toUpperCase();
        break;
      }
    }

    // -----------------------
    // Cơ quan ban hành
    // -----------------------
    const agencyPatterns = [
      /NGÂN HÀNG NHÀ NƯỚC VIỆT NAM/i,
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
        metadata.issuingAgency = m[0]
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase();
        break;
      }
    }

    // -----------------------
    // Ngày ban hành
    // -----------------------
    let dateMatch = head.match(
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
    );

    if (dateMatch) {

      metadata.issuedDate =
        `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`;

    } else {

      dateMatch = head.match(
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/
      );

      if (dateMatch) {
        metadata.issuedDate =
          `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`;
      }
    }

    // -----------------------
    // Ngày hiệu lực
    // -----------------------
    const effPatterns = [
      /(có hiệu lực(?: thi hành)?(?: kể từ)?[^\n]*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4}))/i,
      /(hiệu lực từ ngày[^\n]*(\d{1,2})\/(\d{1,2})\/(\d{4}))/i
    ];

    for (const p of effPatterns) {

      const m = text.match(p);

      if (m) {

        metadata.effectiveDate =
          `${m[2].padStart(2, "0")}/${m[3].padStart(2, "0")}/${m[4]}`;

        break;
      }
    }

    return metadata;
  }

  // ===== KHỐI 3/3 SẼ NỐI TIẾP TỪ ĐÂY =====
   // ===========================
  // Clause Parser
  // Tách Điều / Khoản / Điểm
  // ===========================
  function extractClauses(text) {

    const clauses = [];

    const regex =
      /Điều\s+(\d+)(?:[.:])?\s*([\s\S]*?)(?=Điều\s+\d+|$)/gi;

    let match;

    while ((match = regex.exec(text)) !== null) {

      const number = match[1];

      const body = match[2].trim();

      const clause = {
        number,
        title: `Điều ${number}`,
        content: body,
        khoans: []
      };

      // -----------------------
      // Tách Khoản
      // -----------------------
      const khoanRegex =
        /(?:^|\n)(\d+)\.\s+([\s\S]*?)(?=(?:\n\d+\.\s)|$)/g;

      let km;

      while ((km = khoanRegex.exec(body)) !== null) {

        const khoan = {
          number: km[1],
          content: km[2].trim(),
          diems: []
        };

        // -----------------------
        // Tách Điểm
        // -----------------------
        const diemRegex =
          /(?:^|\n)([a-z])\)\s+([\s\S]*?)(?=(?:\n[a-z]\)\s)|$)/gi;

        let dm;

        while ((dm = diemRegex.exec(khoan.content)) !== null) {

          khoan.diems.push({
            letter: dm[1].toLowerCase(),
            content: dm[2].trim()
          });
        }

        clause.khoans.push(khoan);
      }

      clauses.push(clause);
    }

    return clauses;
  }

  // ===========================
  // Export
  // ===========================
  window.parseDocument = parseDocument;

  console.log(
    "HTTV Parser v5 exported:",
    typeof window.parseDocument
  );

})();
