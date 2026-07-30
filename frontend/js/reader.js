// ======================================
// HTTV - READER.JS
// Phiên bản ổn định
// Hỗ trợ: TXT, DOCX, PDF (văn bản)
// Không sử dụng OCR
// ======================================

console.log("HTTV Reader - Stable Version");

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
// PDF (văn bản)
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

return cleanText(text);

}

// ======================================
// Chuẩn hóa văn bản
// ======================================
function cleanText(text) {

text = text.replace(/\\r/g, "");

text = text.replace(/[ \\t]{2,}/g, " ");

text = text.replace(/\\n{3,}/g, "\n\n");

return text.trim();

}

// ======================================
// Xử lý tài liệu
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

// ======================================
// Hiển thị tài liệu lên giao diện
// ======================================
async function readDocument(file) {

const output =
    document.getElementById("documentContent");

if (!output) {

    alert("Chưa có vùng hiển thị nội dung");

    return;

}

output.innerHTML = "Đang đọc tài liệu...";

try {

    const documentData =
        await processDocument(file);

    output.innerText = documentData.content;

} catch (err) {

    output.innerText =
        "Lỗi: " + err.message;

}

}
