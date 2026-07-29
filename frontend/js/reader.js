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
}

// ===== PDF =====
else if (file.type === "application/pdf") {

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

    output.innerText = text;
}

// ===== DOCX =====
else if (file.name.toLowerCase().endsWith(".docx")) {

    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
        arrayBuffer: arrayBuffer
    });

    output.innerText = result.value;
}

// ===== Chưa hỗ trợ =====
else {

    output.innerText =
        "HTTV hiện hỗ trợ TXT, PDF và DOCX.";
}

}
