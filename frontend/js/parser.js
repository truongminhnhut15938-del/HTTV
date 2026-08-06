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

      // Gom text theo tọa độ Y
      const rows = {};

      for (const item of content.items) {

        const y = Math.round(item.transform[5]);

        if (!rows[y]) rows[y] = [];

        rows[y].push({
          x: item.transform[4],
          text: item.str
        });
      }

      // Sắp xếp từ trên xuống
      const ys = Object.keys(rows)
        .map(Number)
        .sort((a, b) => b - a);

      for (const y of ys) {

        const line = rows[y]
          .sort((a, b) => a.x - b.x)
          .map(i => i.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (line) {
          allLines.push(line);
        }
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
