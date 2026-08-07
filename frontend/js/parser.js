// frontend/js/parser.js
// HTTV Parser v3
// Kiến trúc line-based parser cho văn bản pháp luật Việt Nam
// Không thay đổi API đầu ra của HTTV

console.log("HTTV Parser v3 loaded");

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
      metadata: extractMetadataFromLines(lines),
      clauses: extractClausesFromLines(lines),
      rawText: text
    };
  }

  // ===========================
  // ===========================
// Đọc PDF theo cấu trúc dòng (HTTV Parser v4)
// Tối ưu cho văn bản pháp luật Việt Nam
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

    // -----------------------
    // Gom item theo tọa độ Y
    // -----------------------
    const rows = new Map();

    for (const item of content.items) {

      const y = Math.round(item.transform[5]);

      if (!rows.has(y)) {
        rows.set(y, []);
      }

      rows.get(y).push({
        x: item.transform[4],
        text: item.str
      });
    }

    // -----------------------
    // Sắp xếp từ trên xuống
    // -----------------------
    const ys = Array.from(rows.keys())
      .sort((a, b) => b - a);

    const pageLines = [];

    for (const y of ys) {

      const items = rows.get(y)
        .sort((a, b) => a.x - b.x);

      let line = "";

      let lastX = null;

      for (const item of items) {

        if (lastX !== null) {

          const gap = item.x - lastX;

          if (gap > 12) {
            line += " ";
          }
        }

        line += item.text;

        lastX = item.x + item.text.length * 4;
      }

      line = line
        .replace(/\s+/g, " ")
        .trim();

      if (line) {
        pageLines.push(line);
      }
    }

    // -----------------------
    // Ghép các dòng bị tách
    // Ví dụ:
    // NGÂN HÀNG
    // NHÀ NƯỚC
    // VIỆT NAM
    // -----------------------
    for (let i = 0; i < pageLines.length; i++) {

      let line = pageLines[i];

      while (
        i + 1 < pageLines.length &&
        line.length < 40 &&
        pageLines[i + 1].length < 40 &&
        !/^Điều\s+\d+/i.test(pageLines[i + 1]) &&
        !/^Số:/i.test(pageLines[i + 1])
      ) {
        line += " " + pageLines[i + 1];
        i++;
      }

      allLines.push(line);
    }

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
  // Đọc DOCX theo từng dòng
  // ===========================
  async function parseDOCX(file) {
    if (!window.mammoth) {
      throw new Error("Mammoth chưa được nạp");
    }

    const buffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
      arrayBuffer: buffer
    });

    const text = result.value || "";

    return text.split(/\r?\n/);
  }

  // ===========================
  // Chuẩn hóa các dòng
  // ===========================
  function normalizeLines(lines) {

    const normalized = [];

    for (let line of lines) {

      line = line.replace(/[ \t]+/g, " ").trim();

      if (!line) {
        normalized.push("");
        continue;
      }

      // Chuẩn hóa Số:
      line = line.replace(/^Số\s*:/i, "Số:");

      // Chuẩn hóa Điều
      line = line.replace(/^Điều\s*([0-9]+)/i, "Điều $1");

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

  // ===== PHẦN B SẼ ĐƯỢC NỐI TIẾP NGAY SAU ĐÂY =====
// ===========================
// ===========================
// Trích metadata theo từng dòng (HTTV Parser v4)
// Tối ưu riêng cho văn bản NHNN / Bộ / Chính phủ
// ===========================
function extractMetadataFromLines(lines) {

  const metadata = {
    documentType: "",
    documentNumber: "",
    issuingAgency: "",
    issuedDate: "",
    effectiveDate: ""
  };

  // Ghép phần đầu văn bản để dò
  const head = lines.slice(0, 30).join("\n");

  // Chuẩn hóa lỗi OCR thường gặp
  const normalized = head
    .replace(/S6:/gi, "Số:")
    .replace(/SO:/gi, "Số:")
    .replace(/THONG TIr/gi, "THÔNG TƯ")
    .replace(/THONG TU/gi, "THÔNG TƯ")
    .replace(/THONG TƯ/gi, "THÔNG TƯ")
    .replace(/NGAN HANG NHA/gi, "NGÂN HÀNG NHÀ")
    .replace(/VIET NAM/gi, "VIỆT NAM")
    .replace(/Ha Nai/gi, "Hà Nội")
    .replace(/ngay/gi, "ngày")
    .replace(/thong/gi, "tháng")
    .replace(/nom/gi, "năm");

  // -----------------------
  // Loại văn bản
  // -----------------------
  const typeMatch = normalized.match(
    /(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|CÔNG VĂN|THÔNG BÁO|CHỈ THỊ|LUẬT|NGHỊ QUYẾT)/i
  );

  if (typeMatch) {
    metadata.documentType = typeMatch[1].toUpperCase();
  }

  // -----------------------
  // Số hiệu
  // -----------------------
  const numberMatch = normalized.match(
    /Số:\s*([0-9]{1,4}\/[0-9]{4}\/[A-Z0-9-]+)/i
  );

  if (numberMatch) {
    metadata.documentNumber = numberMatch[1].trim();
  }

  // -----------------------
  // Cơ quan ban hành
  // -----------------------
  const agencyMatch = normalized.match(
    /(NGÂN HÀNG NHÀ NƯỚC VIỆT NAM|BỘ [A-ZÀ-Ỹ ]+|CHÍNH PHỦ|QUỐC HỘI|THỦ TƯỚNG CHÍNH PHỦ|ỦY BAN NHÂN DÂN [A-ZÀ-Ỹ ]+)/i
  );

  if (agencyMatch) {
    metadata.issuingAgency = agencyMatch[1].toUpperCase();
  }

  // -----------------------
  // Ngày ban hành
  // Ví dụ: Hà Nội, ngày 06 tháng 1 năm 2014
  // -----------------------
  const dateMatch = normalized.match(
    /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
  );

  if (dateMatch) {
    metadata.issuedDate =
      `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`;
  }

  // -----------------------
  // Ngày hiệu lực
  // -----------------------
  const fullText = lines.join("\n");

  const eff = fullText.match(
    /(có hiệu lực|hiệu lực từ ngày|có hiệu lực kể từ ngày).*?(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
  );

  if (eff) {
    metadata.effectiveDate =
      `${eff[2].padStart(2, "0")}/${eff[3].padStart(2, "0")}/${eff[4]}`;
  }

  return metadata;
}

// ===========================
// Tách Điều / Khoản / Điểm
// ===========================
function extractClausesFromLines(lines) {

  const clauses = [];

  let currentClause = null;
  let currentKhoan = null;

  for (const rawLine of lines) {

    const line = rawLine.trim();

    if (!line) continue;

    // -----------------------
    // Điều
    // -----------------------
    let m = line.match(/^Điều\s+(\d+)(?:[.:])?\s*(.*)$/i);

    if (m) {

      if (currentClause) {
        clauses.push(currentClause);
      }

      currentClause = {
        number: m[1],
        title: `Điều ${m[1]}${m[2] ? ". " + m[2] : ""}`,
        content: "",
        khoans: []
      };

      currentKhoan = null;

      continue;
    }

    if (!currentClause) continue;

    // -----------------------
    // Khoản
    // -----------------------
    m = line.match(/^(\d+)\.\s+(.*)$/);

    if (m) {

      currentKhoan = {
        number: m[1],
        content: m[2],
        diems: []
      };

      currentClause.khoans.push(currentKhoan);

      continue;
    }

    // -----------------------
    // Điểm
    // -----------------------
    m = line.match(/^([a-z])\)\s+(.*)$/i);

    if (m && currentKhoan) {

      currentKhoan.diems.push({
        letter: m[1],
        content: m[2]
      });

      continue;
    }

    // -----------------------
    // Nội dung tiếp theo
    // -----------------------
    if (currentKhoan) {
      currentKhoan.content += "\n" + line;
    } else {
      currentClause.content +=
        (currentClause.content ? "\n" : "") + line;
    }
  }

  if (currentClause) {
    clauses.push(currentClause);
  }

  return clauses;
}

// ===========================
// Export
// ===========================
window.parseDocument = parseDocument;

console.log(
  "HTTV Parser v3 exported:",
  typeof window.parseDocument
);

})();
