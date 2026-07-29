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

const dataUrl = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
});

const result = await Tesseract.recognize(
    dataUrl,
    "vie+eng"
);

output.innerText = result.data.text;

}
