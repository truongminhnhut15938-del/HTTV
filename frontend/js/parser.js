// js/parser.js
// Đọc PDF text và DOCX ngay trên điện thoại (offline)

async function readPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer();

    // PDF.js phải được nạp trước trong index.html
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();

        const pageText = content.items
            .map(item => item.str)
            .join(' ');

        text += pageText + '\\n\\n';
    }

    return text.trim();
}

async function readDocxFile(file) {
    const arrayBuffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
        arrayBuffer: arrayBuffer
    });

    return (result.value || '').trim();
}

async function readDocument(file) {
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    // PDF
    if (type.includes('pdf') || name.endsWith('.pdf')) {
        return await readPdfFile(file);
    }

    // DOCX
    if (
        type.includes('word') ||
        type.includes('officedocument') ||
        name.endsWith('.docx')
    ) {
        return await readDocxFile(file);
    }

    throw new Error('Chỉ hỗ trợ PDF và DOCX');
}
