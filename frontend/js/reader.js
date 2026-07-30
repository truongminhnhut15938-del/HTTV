// ======================================
// HTTV - READER.JS (Hybrid PDF.js + Render OCR)
// Backend OCR: https://httv-ocr-backend.onrender.com
// ======================================

console.log('HTTV Hybrid Reader');

pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const OCR_BACKEND = 'https://httv-ocr-backend.onrender.com';

async function parseTXT(file) {
return await file.text();
}

async function parseDOCX(file) {
const arrayBuffer = await file.arrayBuffer();
const result = await mammoth.extractRawText({ arrayBuffer });
return result.value;
}

// ======================================
// PDF.js trước
// ======================================
async function parsePDF(file) {

const pdf = await pdfjsLib.getDocument({
data: await file.arrayBuffer()
}).promise;

let text = '';

for (let i = 1; i <= pdf.numPages; i++) {

const page = await pdf.getPage(i);
const content = await page.getTextContent();

text += content.items
.map(item => item.str)
.join(' ') + '\n';

}

text = cleanText(text);

// Nếu văn bản có dấu hiệu lỗi font → OCR
if (isCorruptedText(text)) {
console.log('HTTV: PDF lỗi font, chuyển sang OCR...');
text = await parsePDFByOCR(file);
}

return text;

}

// ======================================
// Gửi PDF lên Render OCR
// ======================================
async function parsePDFByOCR(file) {

const formData = new FormData();
formData.append('file', file);

const response = await fetch(
OCR_BACKEND + '/ocr',
{
method: 'POST',
body: formData
}
);

if (!response.ok) {
throw new Error('OCR backend không phản hồi');
}

const data = await response.json();

if (!data.success) {
throw new Error(data.error || 'OCR thất bại');
}

return cleanText(data.text);

}

// ======================================
// Phát hiện văn bản lỗi
// ======================================
function isCorruptedText(text) {

if (!text) return true;

const sample = text.slice(0, 3000);

const badPatterns = [
'Ã',
'Æ',
'Ð',
'�',
'¤',
'¢',
'§'
];

let score = 0;

for (const p of badPatterns) {
score += (sample.split(p).length - 1);
}

const letters = (sample.match(/[A-Za-zÀ-ỹ]/g) || []).length;
const badRatio = letters === 0 ? 1 : score / letters;

// Nếu quá nhiều ký tự lạ hoặc quá ít dấu tiếng Việt
const vietnamese =
(sample.match(/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi) || []).length;

const viRatio = letters === 0 ? 0 : vietnamese / letters;

return badRatio > 0.01 || viRatio < 0.02;

}

// ======================================
// Chuẩn hóa văn bản
// ======================================
function cleanText(text) {

text = text.replace(/\r/g, '');

text = text.replace(/[ \t]{2,}/g, ' ');

text = text.replace(/\n{3,}/g, '\n\n');

return text.trim();

}

// ======================================
// Xử lý tài liệu
// ======================================
async function processDocument(file) {

const name = file.name;

let text = '';

if (name.toLowerCase().endsWith('.txt')) {

text = await parseTXT(file);

} else if (name.toLowerCase().endsWith('.docx')) {

text = await parseDOCX(file);

} else if (name.toLowerCase().endsWith('.pdf')) {

text = await parsePDF(file);

} else {

throw new Error('Định dạng chưa được hỗ trợ');

}

const documentData = {

id: Date.now().toString(),

name,

title: name,

type: name.toLowerCase().endsWith('.pdf')
? 'pdf'
: name.toLowerCase().endsWith('.docx')
? 'docx'
: 'txt',

source: 'local',

size: file.size,

content: text,

createdAt: Date.now()

};

if (typeof saveDocument === 'function') {
await saveDocument(documentData);
}

return documentData;

}

// ======================================
// Hiển thị tài liệu
// ======================================
async function readDocument(file) {

const output = document.getElementById('documentContent');

if (!output) {
alert('Chưa có vùng hiển thị nội dung');
return;
}

output.innerHTML = 'Đang đọc tài liệu...';

try {

const documentData = await processDocument(file);

output.innerText = documentData.content;

} catch (err) {

output.innerText = 'Lỗi: ' + err.message;

}

}
