// ======================================
// HTTV - READER.JS
// Đọc TXT, DOCX, PDF và PDF scan OCR
// ======================================

// Khai báo worker của PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ======================================
// TXT
// ======================================
async function parseTXT(file) {
return await file.text();
}

// ======================================
// DOCX
// ======================================
async function parseDOCX(file) {

const arrayBuffer = await file.arrayBuffer();

const result = await mammoth.extractRawText({
    arrayBuffer: arrayBuffer
});

return result.value;

}

// ======================================
// PDF
// ======================================
async function parsePDF(file) {

const pdf = await pdfjsLib.getDocument({
    data: await file.arrayBuffer()
}).promise;

let text = "";

for (let i = 1; i <= pdf.numPages; i++) {

    const page = await pdf.getPage(i);

    const content = await page.getTextContent();

    text += content.items
        .map(item => item.str)
        .join(" ") + "\n";

}

// Nếu PDF gần như không có chữ thì chuyển sang OCR
if (text.trim().length < 20) {

    return await parsePDFWithOCR(file);

}

return cleanText(text);

}

// ======================================
// PDF Scan OCR
// ======================================
async function parsePDFWithOCR(file) {

const pdf = await pdfjsLib.getDocument({
    data: await file.arrayBuffer()
}).promise;

let finalText = "";

for (let i = 1; i <= pdf.numPages; i++) {

    const page = await pdf.getPage(i);

    // Tăng độ phân giải OCR
    const viewport = page.getViewport({
        scale: 4
    });

    const canvas = document.createElement("canvas");

    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    const result = await Tesseract.recognize(
        canvas,
        "vie+eng"
    );

    finalText +=
        "\n===== Trang " + i + " =====\n";

    finalText += result.data.text + "\n";

}

return cleanText(finalText);

}

// ======================================
// Chuẩn hóa văn bản
// ======================================
function cleanText(text) {

// Xóa watermark LuatVietnam
text = text.replace(/(www\\.LuatVietnam\\.vn\\s*){2,}/gi, "");

text = text.replace(/www\\.LuatVietnam\\.vn/gi, "");

text = text.replace(/LuatVietnam/gi, "");

// Xóa khoảng trắng thừa
const lines = text.split(/\\r?\\n/);

const cleaned = lines.filter(line => {

    const t = line.replace(/\\s+/g, "").toLowerCase();

    if (t === "") return true;

    if (t === "www.luatvietnam.vn") return false;

    if (t === "luatvietnam.vn") return false;

    if (/^(www\\.?luatvietnam\\.vn)+$/i.test(t)) return false;

    return true;

});

text = cleaned.join("\n");

// Chuẩn hóa khoảng trắng
text = text.replace(/\\n{3,}/g, "\n\n");

text = text.replace(/[ \\t]{2,}/g, " ");

return text.trim();

}

// ======================================
// Xử lý tài liệu và lưu IndexedDB
// ======================================
async function processDocument(file) {

const name = file.name;

const type = file.type || getFileExtension(file.name);

let text = "";

if (name.toLowerCase().endsWith(".txt")) {

    text = await parseTXT(file);

} else if (name.toLowerCase().endsWith(".docx")) {

    text = await parseDOCX(file);

} else if (name.toLowerCase().endsWith(".pdf")) {

    text = await parsePDF(file);

} else if (name.toLowerCase().endsWith(".doc")) {

    throw new Error(
        "HTTV chưa hỗ trợ file .DOC. Vui lòng chuyển sang .DOCX."
    );

} else {

    throw new Error(
        "Định dạng chưa được hỗ trợ"
    );

}

const documentData = {

    id: Date.now().toString(),

    name: name,

    title: name,

    type: type,

    source: "local",

    size: file.size,

    content: text,

    createdAt: Date.now()

};

if (typeof saveDocument === "function") {

    await saveDocument(documentData);

}

return documentData;

}

// ======================================
// Lấy phần mở rộng file
// ======================================
function getFileExtension(filename) {

const idx = filename.lastIndexOf(".");

if (idx === -1) return "";

return filename.substring(idx + 1);

}
