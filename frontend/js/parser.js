// frontend/js/parser.js
// HTTV Parser v4 - Part 1
// Engine đọc PDF theo tọa độ + chuẩn hóa dòng
// Nền tảng cho parser văn bản pháp luật Việt Nam

console.log("HTTV Parser v4 loaded");

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
  // Đọc PDF theo từng dòng
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

      // Gom các item theo tọa độ Y
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

      // Sắp xếp từ trên xuống
      const ys = Array.from(rows.keys())
        .sort((a, b) => b - a);

      for (const y of ys) {

        const items = rows.get(y)
          .sort((a, b) => a.x - b.x);

        let line = "";

        let lastX = null;

        for (const item of items) {

          if (lastX !== null) {

            const gap = item.x - lastX;

            // Chỉ thêm khoảng trắng khi khoảng cách đủ lớn
            if (gap > 6) {
              line += " ";
            }
          }

          line += item.text;

          // Ước lượng vị trí cuối
          lastX = item.x + item.width;
        }

        line = line
          .replace(/\s+/g, " ")
          .trim();

        if (line) {
          allLines.push(line);
        }
      }

      // Phân cách giữa các trang
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
  // Chuẩn hóa từng dòng
  // ===========================
  function normalizeLines(lines) {

    const normalized = [];

    for (let line of lines) {

      line = line.replace(/[ \t]+/g, " ").trim();

      if (!line) {
        normalized.push("");
        continue;
      }

      // Chuẩn hóa các lỗi OCR phổ biến
      line = line
        .replace(/^S6\s*:/i, "Số:")
        .replace(/^SO\s*:/i, "Số:")
        .replace(/^SỐ\s*:/i, "Số:")
        .replace(/THONG TIr/gi, "THÔNG TƯ")
        .replace(/THONG TU/gi, "THÔNG TƯ")
        .replace(/NGAN HANG/gi, "NGÂN HÀNG")
        .replace(/NHA NUOC/gi, "NHÀ NƯỚC")
        .replace(/VIET NAM/gi, "VIỆT NAM")
        .replace(/Ha Noi/gi, "Hà Nội")
        .replace(/ngay/gi, "ngày")
        .replace(/thang/gi, "tháng")
        .replace(/nam/gi, "năm");

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

  // ===== PHẦN 2: Metadata parser sẽ nối tiếp ngay sau đây =====
 // ===========================
// PHẦN 2: Trích metadata theo từng dòng
// Tối ưu cho văn bản pháp luật Việt Nam
// ===========================

function extractMetadataFromLines(lines) {

  const metadata = {
    documentType: "",
    documentNumber: "",
    issuingAgency: "",
    issuedDate: "",
    effectiveDate: ""
  };

  // Ghép phần đầu văn bản
  const head = lines
    .slice(0, 40)
    .join("\n");

  // -----------------------
  // Chuẩn hóa lỗi OCR phổ biến
  // -----------------------
  const normalized = head

    // Số:
    .replace(/S6\\s*:/gi, "Số:")
    .replace(/SO\\s*:/gi, "Số:")
    .replace(/SỐ\\s*:/gi, "Số:")

    // Thông tư
    .replace(/THONG\\s*T[UƯI]/gi, "THÔNG TƯ")
    .replace(/THÔNG\\s*T[UƯI]/gi, "THÔNG TƯ")

    // Ngân hàng
    .replace(/NGAN\\s*HANG/gi, "NGÂN HÀNG")
    .replace(/NHA\\s*NUOC/gi, "NHÀ NƯỚC")
    .replace(/VIET\\s*NAM/gi, "VIỆT NAM")

    // Địa danh
    .replace(/HA\\s*NOI/gi, "Hà Nội")

    // Ngày tháng năm
    .replace(/ngay/gi, "ngày")
    .replace(/thang/gi, "tháng")
    .replace(/nam/gi, "năm");

  // -----------------------
  // 1. Cơ quan ban hành
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
    const m = normalized.match(p);

    if (m) {
      metadata.issuingAgency = m[0]
        .replace(/\\s+/g, " ")
        .trim()
        .toUpperCase();
      break;
    }
  }

  // -----------------------
  // 2. Loại văn bản
  // -----------------------
  const typePatterns = [
    /THÔNG TƯ/i,
    /NGHỊ ĐỊNH/i,
    /QUYẾT ĐỊNH/i,
    /CÔNG VĂN/i,
    /THÔNG BÁO/i,
    /CHỈ THỊ/i,
    /LUẬT/i,
    /NGHỊ QUYẾT/i
  ];

  for (const p of typePatterns) {
    const m = normalized.match(p);

    if (m) {
      metadata.documentType = m[0]
        .replace(/\\s+/g, " ")
        .trim()
        .toUpperCase();
      break;
    }
  }

  // -----------------------
  // 3. Số hiệu
  // Ví dụ:
  // Số: 01/2014/TT-NHNN
  // -----------------------
  const numberPatterns = [
    /Số:\\s*([0-9]{1,4}\\/[0-9]{4}\\/[A-Z0-9-]+)/i,
    /([0-9]{1,4}\\/[0-9]{4}\\/[A-Z]{2,}-[A-Z0-9-]+)/i
  ];

  for (const p of numberPatterns) {
    const m = normalized.match(p);

    if (m) {
      metadata.documentNumber = m[1]
        .replace(/\\s+/g, "")
        .trim()
        .toUpperCase();
      break;
    }
  }

  // -----------------------
  // 4. Ngày ban hành
  // Ví dụ:
  // Hà Nội, ngày 06 tháng 01 năm 2014
  // -----------------------
  let dateMatch = normalized.match(
    /ngày\\s+(\\d{1,2})\\s+tháng\\s+(\\d{1,2})\\s+năm\\s+(\\d{4})/i
  );

  if (dateMatch) {

    metadata.issuedDate =
      `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`;

  } else {

    dateMatch = normalized.match(
      /(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/
    );

    if (dateMatch) {
      metadata.issuedDate =
        `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`;
    }
  }

  // -----------------------
  // 5. Ngày hiệu lực
  // -----------------------
  const fullText = lines.join("\n");

  const effPatterns = [
    /(có hiệu lực(?: thi hành)?(?: kể từ)?[^\\n]*ngày\\s+(\\d{1,2})\\s+tháng\\s+(\\d{1,2})\\s+năm\\s+(\\d{4}))/i,
    /(hiệu lực từ ngày[^\\n]*(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4}))/i
  ];

  for (const p of effPatterns) {

    const m = fullText.match(p);

    if (m) {

      if (m.length === 5) {
        metadata.effectiveDate =
          `${m[2].padStart(2, "0")}/${m[3].padStart(2, "0")}/${m[4]}`;
      } else if (m.length === 4) {
        metadata.effectiveDate =
          `${m[2].padStart(2, "0")}/${m[3].padStart(2, "0")}/${m[4]}`;
      }

      break;
    }
  }

  return metadata;
}

// ===== PHẦN 3: Parser Điều/Khoản/Điểm sẽ nối tiếp ngay sau đây =====
// ===========================
// PHẦN 3: Tách Điều / Khoản / Điểm
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
    // Ví dụ:
    // Điều 1. Phạm vi điều chỉnh
    // Điều 2:
    // -----------------------
    let m = line.match(/^Điều\\s+(\\d+)(?:[.:])?\\s*(.*)$/i);

    if (m) {

      if (currentClause) {
        clauses.push(currentClause);
      }

      currentClause = {
        number: m[1],
        title: m[2]
          ? `Điều ${m[1]}. ${m[2].trim()}`
          : `Điều ${m[1]}`,
        content: "",
        khoans: []
      };

      currentKhoan = null;

      continue;
    }

    if (!currentClause) continue;

    // -----------------------
    // Khoản
    // Ví dụ:
    // 1. Quy định...
    // -----------------------
    m = line.match(/^(\\d+)\\.\\s+(.*)$/);

    if (m) {

      currentKhoan = {
        number: m[1],
        content: m[2].trim(),
        diems: []
      };

      currentClause.khoans.push(currentKhoan);

      continue;
    }

    // -----------------------
    // Điểm
    // Ví dụ:
    // a) ...
    // b) ...
    // -----------------------
    m = line.match(/^([a-z])\\)\\s+(.*)$/i);

    if (m && currentKhoan) {

      currentKhoan.diems.push({
        letter: m[1].toLowerCase(),
        content: m[2].trim()
      });

      continue;
    }

    // -----------------------
    // Nội dung tiếp theo
    // -----------------------
    if (currentKhoan) {
      currentKhoan.content += "\\n" + line;
    } else {
      currentClause.content +=
        (currentClause.content ? "\\n" : "") + line;
    }
  }

  // Điều cuối
  if (currentClause) {
    clauses.push(currentClause);
  }

  return clauses;
}

// ===========================
// Export parser
// ===========================
window.parseDocument = parseDocument;

console.log(
  "HTTV Parser v4 exported:",
  typeof window.parseDocument
);

})();
