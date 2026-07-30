// ======================================
// HTTV - PARSER.JS
// File tương thích - chuyển tiếp sang reader.js
// ======================================

async function parseTXT(file) {
return await window.parseTXT(file);
}

async function parseDOCX(file) {
return await window.parseDOCX(file);
}

async function parsePDF(file) {
return await window.parsePDF(file);
}

async function processDocument(file) {
return await window.processDocument(file);
}
