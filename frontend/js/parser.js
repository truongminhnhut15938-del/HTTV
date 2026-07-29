async function readDocument(file) {

    const ext = file.name.split(".").pop().toLowerCase();

    switch (ext) {

        case "txt":
            return await readTXT(file);

        case "pdf":
            return await readPDF(file);

        case "docx":
            return await readDOCX(file);

        default:
            throw new Error("Định dạng chưa được hỗ trợ.");
    }
}

async function readTXT(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = e => resolve(e.target.result);

        reader.onerror = reject;

        reader.readAsText(file, "UTF-8");

    });

}

async function readPDF(file) {

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: buffer
    }).promise;

    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {

        const page = await pdf.getPage(i);

        const content = await page.getTextContent();

        const pageText = content.items
            .map(item => item.str)
            .join(" ");

        text += pageText + "\n\n";

    }

    return text;

}

async function readDOCX(file) {

    const buffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
        arrayBuffer: buffer
    });

    return result.value;

}
