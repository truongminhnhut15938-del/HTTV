// ======================================
// HTTV - READER.JS
// Đọc TXT, DOCX, PDF bằng OCR tiếng Việt
// Phiên bản tối ưu cho tài liệu pháp lý Việt Nam
// ======================================

console.log("HTTV OCR VERSION 3");

// Worker của PDF.js
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
// Luôn dùng OCR để tránh lỗi lớp text của LuatVietnam
// ======================================
async function parsePDF(file) {

return await parsePDFWithOCR(file);

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

    // Render ở độ phân giải cao
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

    // ==================================
    // Tiền xử lý ảnh
    // Chuyển sang đen trắng để OCR tốt hơn
    // ==================================
    const img = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const data = img.data;

    for (let p = 0; p < data.length; p += 4) {

        const gray =
            data[p] * 0.299 +
            data[p + 1] * 0.587 +
            data[p + 2] * 0.114;

        const value = gray > 180 ? 255 : 0;

        data[p] = value;
        data[p + 1] = value;
        data[p + 2] = value;

    }

    context.putImageData(img, 0, 0);

    // ==================================
    // OCR tiếng Việt
    // ==================================
    const result = await Tesseract.recognize(
        canvas,
        "vie",
        {
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: "1"
        }
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
// Xử lý tài liệu và lưu vào IndexedDB
// ======================================
async function processDocument(file) {

const name = file.name;

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
        "Định dạng chưa được hỗ trợ."
    );

}

const documentData = {

    id: Date.now().toString(),

    name: name,

    title: name,

    type: name.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : name.toLowerCase().endsWith(".docx")
        ? "docx"
        : "txt",

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
