// js/parser.js

// Cấu hình PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';

// Đọc PDF (text PDF)
async function readPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const pageText = content.items.map(item => item.str).join(' ');
    text += pageText + '\\n\\n';
  }

  return text;
}

// Đọc DOCX
async function readDocx(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

// Tách điều khoản
function splitClauses(text) {
  const clauses = [];
  const regex = /(Điều\\s+\\d+[\\.:]?[^\\n]*)/gi;

  const matches = [...text.matchAll(regex)];

  if (matches.length === 0) {
    return [{
      title: 'Toàn văn',
      content: text.trim()
    }];
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;

    clauses.push({
      title: matches[i][0].trim(),
      content: text.substring(start, end).trim()
    });
  }

  return clauses;
}

// Trích metadata cơ bản
function extractMetadata(text) {
  const meta = {
    documentNumber: '',
    issuedDate: '',
    effectiveDate: ''
  };

  // Số văn bản
  let m = text.match(/Số\\s*[:\\-]?\\s*([0-9A-Za-z\\/\\-]+)/i);
  if (m) meta.documentNumber = m[1];

  // Ngày ban hành
  m = text.match(/ngày\\s+(\\d{1,2})\\s+tháng\\s+(\\d{1,2})\\s+năm\\s+(\\d{4})/i);
  if (m) {
    meta.issuedDate = `${m[1]}/${m[2]}/${m[3]}`;
  }

  // Ngày hiệu lực
  m = text.match(/có hiệu lực[^\\n]{0,80}?ngày\\s+(\\d{1,2})\\s+tháng\\s+(\\d{1,2})\\s+năm\\s+(\\d{4})/i);
  if (m) {
    meta.effectiveDate = `${m[1]}/${m[2]}/${m[3]}`;
  }

  return meta;
}

// Phân tích tài liệu
async function parseDocument(file) {
  let text = '';

  if (file.name.toLowerCase().endsWith('.pdf')) {
    text = await readPdf(file);
  } else if (file.name.toLowerCase().endsWith('.docx')) {
    text = await readDocx(file);
  } else {
    throw new Error('Chỉ hỗ trợ PDF và DOCX');
  }

  const metadata = extractMetadata(text);
  const clauses = splitClauses(text);

  return {
    id: Date.now().toString(),
    name: file.name,
    type: file.type,
    createdAt: new Date().toISOString(),
    metadata,
    clauses,
    fullText: text
  };
}
