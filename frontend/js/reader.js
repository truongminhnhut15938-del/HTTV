async function readDocument(file) {

    const output = document.getElementById("documentContent");

    if (!output) {
        alert("Chưa có vùng hiển thị nội dung");
        return;
    }

    output.innerHTML = "Đang đọc tài liệu...";

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

        output.innerText = text;
    }


    else if (
        file.name.endsWith(".docx")
    ) {

        const arrayBuffer = await file.arrayBuffer();

        mammoth.extractRawText({
            arrayBuffer: arrayBuffer
        })
        .then(result => {
            output.innerText = result.value;
        });

    }

    else {
        output.innerText =
        "HTTV hiện hỗ trợ PDF và DOCX.";
    }
}
