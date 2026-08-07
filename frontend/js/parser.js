// frontend/js/parser.js
// HTTV Parser v4
// Line-based parser cho văn bản pháp luật Việt Nam
// Giữ nguyên API: window.parseDocument(file)

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
  // frontend/js/parser.js
// HTTV Parser v4
// Line-based parser cho văn bản pháp luật Việt Nam
// Giữ nguyên API: window.parseDocument(file)

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

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const lines = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
      const page = await pdf.getPage(pageIndex);

      const content = await page.getTextContent();

      const rows = new Map();

      for (const item of content.items) {
        const y = Math.round(item.transform[5]);

        if (!rows.has(y)) rows.set(y, []);

        rows.get(y).push({
          x: item.transform[4],
          text: item.str
        });
      }

      const ys = Array.from(rows.keys()).sort((a, b) => b - a);

      for (const y of ys) {
        const row = rows.get(y).sort((a, b) => a.x - b.x);

        let line = "";

        let lastX = null;

        for (const item of row) {
          if (lastX !== null && item.x - lastX > 6) {
            line += " ";
          }

          line += item.text;

          lastX = item.x + item.text.length * 4;
        }

        line = line.replace(/\s+/g, " ").trim();

        if (line) lines.push(line);
      }

      lines.push("");
    }

    if (!lines.length) {
      throw new Error("PDF không chứa text");
    }

    return lines;
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

  // ===========================
  // Trích metadata
  // ===========================
  function extractMetadataFromLines(lines) {
    const metadata = {
      documentType: "",
      documentNumber: "",
      issuingAgency: "",
      issuedDate: "",
      effectiveDate: ""
    };

    const head = lines.slice(0, 40).join("\n");

    const typeMatch = head.match(
      /(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|CÔNG VĂN|THÔNG BÁO|CHỈ THỊ|LUẬT|NGHỊ QUYẾT)/i
    );

    if (typeMatch) {
      metadata.documentType = typeMatch[1].toUpperCase();
    }

    const numberMatch = head.match(
      /Số:\s*([0-9]{1,4}\/[0-9]{4}\/[A-Z0-9-]+)/i
    );

    if (numberMatch) {
      metadata.documentNumber = numberMatch[1].toUpperCase();
    }

    const agencyMatch = head.match(
      /(NGÂN HÀNG NHÀ NƯỚC VIỆT NAM|BỘ [A-ZÀ-Ỹ ]+|CHÍNH PHỦ|QUỐC HỘI|THỦ TƯỚNG CHÍNH PHỦ|ỦY BAN NHÂN DÂN [A-ZÀ-Ỹ ]+)/i
    );

    if (agencyMatch) {
      metadata.issuingAgency = agencyMatch[1].toUpperCase();
    }

    const dateMatch = head.match(
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
    );

    if (dateMatch) {
      metadata.issuedDate =
        `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`;
    }

    const fullText = lines.join("\n");

    const effMatch = fullText.match(
      /(có hiệu lực(?: thi hành)?(?: kể từ)?[^\\n]*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4}))/i
    );

    if (effMatch) {
      metadata.effectiveDate =
        `${effMatch[2].padStart(2, "0")}/${effMatch[3].padStart(2, "0")}/${effMatch[4]}`;
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

      let m = line.match(/^Điều\s+(\d+)(?:[.:])?\s*(.*)$/i);

      if (m) {
        if (currentClause) clauses.push(currentClause);

        currentClause = {
          number: m[1],
          title: m[2] ? `Điều ${m[1]}. ${m[2]}` : `Điều ${m[1]}`,
          content: "",
          khoans: []
        };

        currentKhoan = null;

        continue;
      }

      if (!currentClause) continue;

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

      m = line.match(/^([a-z])\)\s+(.*)$/i);

      if (m && currentKhoan) {
        currentKhoan.diems.push({
          letter: m[1].toLowerCase(),
          content: m[2]
        });

        continue;
      }

      if (currentKhoan) {
        currentKhoan.content += "\n" + line;
      } else {
        currentClause.content +=
          (currentClause.content ? "\n" : "") + line;
      }
    }

    if (currentClause) clauses.push(currentClause);

    return clauses;
  }

  // ===========================
  // Export
  // ===========================
  window.parseDocument = parseDocument;

  console.log(
    "HTTV Parser v4 exported:",
    typeof window.parseDocument
  );

})();

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

  // ===========================
  // Trích metadata
  // ===========================
  function extractMetadataFromLines(lines) {
    const metadata = {
      documentType: "",
      documentNumber: "",
      issuingAgency: "",
      issuedDate: "",
      effectiveDate: ""
    };

    const head = lines.slice(0, 40).join("\n");

    const typeMatch = head.match(
      /(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|CÔNG VĂN|THÔNG BÁO|CHỈ THỊ|LUẬT|NGHỊ QUYẾT)/i
    );

    if (typeMatch) {
      metadata.documentType = typeMatch[1].toUpperCase();
    }

    const numberMatch = head.match(
      /Số:\s*([0-9]{1,4}\/[0-9]{4}\/[A-Z0-9-]+)/i
    );

    if (numberMatch) {
      metadata.documentNumber = numberMatch[1].toUpperCase();
    }

    const agencyMatch = head.match(
      /(NGÂN HÀNG NHÀ NƯỚC VIỆT NAM|BỘ [A-ZÀ-Ỹ ]+|CHÍNH PHỦ|QUỐC HỘI|THỦ TƯỚNG CHÍNH PHỦ|ỦY BAN NHÂN DÂN [A-ZÀ-Ỹ ]+)/i
    );

    if (agencyMatch) {
      metadata.issuingAgency = agencyMatch[1].toUpperCase();
    }

    const dateMatch = head.match(
      /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i
    );

    if (dateMatch) {
      metadata.issuedDate =
        `${dateMatch[1].padStart(2, "0")}/${dateMatch[2].padStart(2, "0")}/${dateMatch[3]}`;
    }

    const fullText = lines.join("\n");

    const effMatch = fullText.match(
      /(có hiệu lực(?: thi hành)?(?: kể từ)?[^\\n]*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4}))/i
    );

    if (effMatch) {
      metadata.effectiveDate =
        `${effMatch[2].padStart(2, "0")}/${effMatch[3].padStart(2, "0")}/${effMatch[4]}`;
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

      let m = line.match(/^Điều\s+(\d+)(?:[.:])?\s*(.*)$/i);

      if (m) {
        if (currentClause) clauses.push(currentClause);

        currentClause = {
          number: m[1],
          title: m[2] ? `Điều ${m[1]}. ${m[2]}` : `Điều ${m[1]}`,
          content: "",
          khoans: []
        };

        currentKhoan = null;

        continue;
      }

      if (!currentClause) continue;

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

      m = line.match(/^([a-z])\)\s+(.*)$/i);

      if (m && currentKhoan) {
        currentKhoan.diems.push({
          letter: m[1].toLowerCase(),
          content: m[2]
        });

        continue;
      }

      if (currentKhoan) {
        currentKhoan.content += "\n" + line;
      } else {
        currentClause.content +=
          (currentClause.content ? "\n" : "") + line;
      }
    }

    if (currentClause) clauses.push(currentClause);

    return clauses;
  }

  // ===========================
  // Export
  // ===========================
  window.parseDocument = parseDocument;

  console.log(
    "HTTV Parser v4 exported:",
    typeof window.parseDocument
  );

})();
