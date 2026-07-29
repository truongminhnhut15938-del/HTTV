async function readDocument(file) {

const output = document.getElementById("documentContent");

if (!output) {
    alert("Chưa có vùng hiển thị nội dung");
    return;
}

output.innerHTML = "Đang đọc tài liệu...";

// ===== TXT =====
if (file.name.toLowerCase().endsWith(".txt")) {

    const text = await file.text();
    output.innerText = text;
    return;
}

// ===== PDF =====
if (file.type === "application/pdf") {

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

    if (text.trim().length < 20) {
await readPDFWithOCR(file);
} else {
output.innerText = text;
}
return;
}

// ===== DOCX =====
if (file.name.toLowerCase().endsWith(".docx")) {

    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
        arrayBuffer: arrayBuffer
    });

    output.innerText = result.value;
    return;
}

// ===== Chưa hỗ trợ =====
output.innerText = "HTTV hiện hỗ trợ TXT, PDF và DOCX.";

}
async function readPDFWithOCR(file) {

const output = document.getElementById("documentContent");

output.innerHTML = "Đang nhận dạng chữ từ PDF scan...";

const pdf = await pdfjsLib.getDocument({
    data: await file.arrayBuffer()
}).promise;

let finalText = "";

for (let i = 1; i <= pdf.numPages; i++) {

    output.innerHTML =
        `Đang OCR trang ${i}/${pdf.numPages}...`;

    const page = await pdf.getPage(i);

    const viewport = page.getViewport({ scale: 2 });

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
        `\n===== Trang ${i} =====\n`;

    finalText += result.data.text + "\n";
}

output.innerText = finalText;

}
