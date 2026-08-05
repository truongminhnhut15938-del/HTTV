// ======================================
// HTTV - READER.JS
// Đọc PDF (text) và DOCX rồi lưu vào storage.js
// ======================================

// Yêu cầu:
// - storage.js đã được load trước
// - pdf.js và mammoth đã được import trong index.html

const Reader = {

    // ==============================
    // Đọc một file bất kỳ
    // ==============================
    async readFile(file) {

        if (!file) throw new Error("Không có file");

        const ext = file.name.toLowerCase();

        let text = "";

        if (ext.endsWith(".pdf")) {

            text = await this.readPDF(file);

        } else if (ext.endsWith(".docx")) {

            text = await this.readDOCX(file);

        } else {

            throw new Error("Chỉ hỗ trợ PDF và DOCX");

        }

        const document = await saveDocument({

            fileName: file.name,

            fileType: file.type,

            fileSize: file.size,

            fileBlob: file,

            rawText: text

        });

        return document;

    },

    // ==============================
    // Đọc PDF dạng text bằng PDF.js
    // ==============================
    async readPDF(file) {

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

        let fullText = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {

            const page = await pdf.getPage(pageNum);

            const content = await page.getTextContent();

            const pageText = content.items
                .map(item => item.str)
                .join(" ");

            fullText += pageText + "\n\n";

        }

        return fullText.trim();

    },

    // ==============================
    // Đọc DOCX bằng Mammoth
    // ==============================
    async readDOCX(file) {

        const arrayBuffer = await file.arrayBuffer();

        const result = await mammoth.extractRawText({
            arrayBuffer
        });

        return (result.value || "").trim();

    }

};

// ======================================
// Hàm xử lý khi người dùng chọn file
// ======================================
async function handleFileSelected(event) {

    const file = event.target.files[0];

    if (!file) return;

    try {

        showStatus("Đang đọc tài liệu...");

        const doc = await Reader.readFile(file);

        showStatus("Đã lưu: " + doc.fileName);

        if (typeof loadDocumentList === "function") {
            loadDocumentList();
        }

        console.log("Đã lưu tài liệu:", doc);

    } catch (e) {

        console.error(e);

        showStatus("Lỗi: " + e.message);

    } finally {

        event.target.value = "";

    }

}

// ======================================
// Hiển thị trạng thái
// ======================================
function showStatus(message) {

    let el = document.getElementById("reader-status");

    if (!el) {

        el = document.createElement("div");

        el.id = "reader-status";

        el.style.padding = "10px";

        el.style.margin = "10px 0";

        el.style.borderRadius = "8px";

        el.style.background = "#f5f5f5";

        document.body.appendChild(el);

    }

    el.textContent = message;

}

// ======================================
// Gắn sự kiện
// ======================================
window.addEventListener("DOMContentLoaded", () => {

    const fileInput = document.getElementById("fileInput");

    if (fileInput) {

        fileInput.addEventListener("change", handleFileSelected);

    }

});
