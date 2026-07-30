// ======================================
// HTTV - READER.JS
// Đọc TXT, DOCX, PDF bằng OCR.space
// Phiên bản tối ưu cho tài liệu pháp lý Việt Nam
// ======================================

console.log("HTTV OCR VERSION 4 - OCR.space");

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
// Luôn dùng OCR.space để tránh lỗi lớp text
// ======================================
async function parsePDF(file) {

return await parsePDFWithOCR(file);

}

// ======================================
// OCR.space API
// ======================================
async function parsePDFWithOCR(file) {

const formData = new FormData();

formData.append("file", file);

formData.append("language", "vie");

formData.append("isOverlayRequired", "false");

formData.append("OCREngine", "2");

const response = await fetch(
    "https://api.ocr.space/parse/image",
    {
        method: "POST",
        headers: {
            apikey: "K87344919388957"
        },
        body: formData
    }
);

const data = await response.json();

if (!data.ParsedResults) {
    throw new Error(
        "OCR.space không đọc được tài liệu PDF."
    );
}

let finalText = "";

for (const page of data.ParsedResults) {

    finalText +=
        page.ParsedText + "\n";

}

return cleanText(finalText);

}

// ======================================
// Chuẩn hóa văn bản
// ======================================
function cleanText(text) {

text = text.replace(/(www\\.LuatVietnam\\.vn\\s*){2,}/gi, "");

text = text.replace(/www\\.LuatVietnam\\.vn/gi, "");

text = text.replace(/LuatVietnam/gi, "");

const lines = text.split(/\\r?\\n/);

const cleaned = lines.filter(line => {

    const t =
        line.replace(/\\s+/g, "")
            .toLowerCase();

    if (t === "") return true;

    if (t === "www.luatvietnam.vn")
        return false;

    if (t === "luatvietnam.vn")
        return false;

    if (/^(www\\.?luatvietnam\\.vn)+$/i.test(t))
        return false;

    return true;

});

text = cleaned.join("\n");

text = text.replace(/\\n{3,}/g, "\n\n");

text = text.replace(/[ \\t]{2,}/g, " ");

return text.trim();

}

// ======================================
// Xử lý tài liệu và lưu IndexedDB
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
