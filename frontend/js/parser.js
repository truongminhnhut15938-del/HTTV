async function readDocument(file) {

const name = file.name.toLowerCase();

if (name.endsWith(".txt")) {
    return await file.text();
}

if (name.endsWith(".pdf")) {
    return await readPDF(file);
}

if (name.endsWith(".docx")) {
    return await readDOCX(file);
}

throw new Error("Định dạng chưa được hỗ trợ.");

}

async function readPDF(file) {

const buffer = await file.arrayBuffer();

const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

let text = "";

for (let i = 1; i <= pdf.numPages; i++) {

    const page = await pdf.getPage(i);

    const content = await page.getTextContent();

    const pageText = content.items.map(item => item.str).join(" ");

    text += pageText + "\n\n";
}

return text;

}

async function readDOCX(file) {

const buffer = await file.arrayBuffer();

const result = await mammoth.extractRawText({ arrayBuffer: buffer });

return result.value;

}

function showFileInfo(file, text) {

const sizeKB = (file.size / 1024).toFixed(2);

content.innerHTML = `
    <h2>${file.name}</h2>

    <p><b>Kích thước:</b> ${sizeKB} KB</p>

    <hr>

    <pre style="white-space: pre-wrap; word-wrap: break-word;">${text}</pre>
`;

}
