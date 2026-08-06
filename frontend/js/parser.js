// js/parser.js
// HTTV - Phân tích PDF và DOCX (offline)

// ===========================
// HÀM CHÍNH
// ===========================

async function parseDocument(file) {
  let text = "";

  if (file.name.toLowerCase().endsWith(".pdf")) {
    text = await parsePdfText(file);
  } else if (file.name.toLowerCase().endsWith(".docx")) {
    text = await parseDocx(file);
  } else {
    throw new Error("Định dạng không được hỗ trợ");
  }

  const metadata = extractMetadata(text);
  const clauses = splitClauses(text);

  return {
    id: "doc_" + Date.now(),
    name: file.name,
    type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "docx",
    metadata,
    clauses,
    text,
    createdAt: new Date().toISOString()
  };
}

// ===========================
// ĐỌC PDF DẠNG TEXT
// ===========================

async function parsePdfText(file) {
  const arrayBuffer = await file.arrayBuffer();

  pdfjsLib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js";

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const content = await page.getTextContent();

    const pageText = content.items.map(i => i.str).join(" ");

    text += pageText + "\n\n";
  }

  return text.trim();
}

// ===========================
// ĐỌC DOCX
// ===========================

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({ arrayBuffer });

  return result.value.trim();
}

// ===========================
// TRÍCH THÔNG TIN VĂN BẢN
// ===========================

function extractMetadata(text) {
  const metadata = {
    documentNumber: "",
    issuedDate: "",
    effectiveDate: ""
  };

  // Ví dụ: 58/2024/TT-BCA
  const numberMatch = text.match(/\\b\\d{1,4}\\/\\d{4}\\/[A-ZĐ-]+(?:-[A-Z0-9Đ]+)*\\b/u);

  if (numberMatch) {
    metadata.documentNumber = numberMatch[0];
  }

  // Ngày ban hành: 15/11/2024
  const dateMatch = text.match(/\\b\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\b/);

  if (dateMatch) {
    metadata.issuedDate = dateMatch[0];
  }

  // Ngày hiệu lực
  const effectiveMatch = text.match(
    /có hiệu lực(?: thi hành)?(?: kể từ)?[^\\d]*(\\d{1,2}\\/\\d{1,2}\\/\\d{4})/i
  );

  if (effectiveMatch) {
    metadata.effectiveDate = effectiveMatch[1];
  }

  return metadata;
}

// ===========================
// CHIA ĐIỀU KHOẢN
// ===========================

function splitClauses(text) {
  const clauses = [];

  const regex = /(Điều\\s+\\d+[\\.\\:]?[^\\n]*)/gi;

  const matches = [...text.matchAll(regex)];

  if (!matches.length) {
    return [
      {
        title: "Toàn văn",
        content: text
      }
    ];
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;

    const end =
      i < matches.length - 1
        ? matches[i + 1].index
        : text.length;

    const block = text.substring(start, end).trim();

    const lines = block.split(/\n+/);

    clauses.push({
      title: lines[0].trim(),
      content: block
    });
  }

  return clauses;
}
