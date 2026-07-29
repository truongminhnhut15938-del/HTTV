const btnUpload = document.getElementById("btnUpload");
const fileInput = document.getElementById("fileInput");
const content = document.getElementById("content");

btnUpload.addEventListener("click", openFileDialog);
fileInput.addEventListener("change", handleFileSelected);

function openFileDialog() {
    fileInput.click();
}

function handleFileSelected() {

    if (fileInput.files.length === 0) {
        return;
    }

    const file = fileInput.files[0];

    // Nếu là file TXT thì đọc nội dung
    if (file.name.toLowerCase().endsWith(".txt")) {

        const reader = new FileReader();

        reader.onload = function (e) {

            showTextFile(file, e.target.result);

        };

        reader.readAsText(file, "UTF-8");

    } else {

        showFileInfo(file);

    }
}

function showFileInfo(file) {

    const sizeKB = (file.size / 1024).toFixed(2);

    content.innerHTML = `
        <h2>Đã chọn tài liệu</h2>

        <p><b>Tên:</b> ${file.name}</p>

        <p><b>Loại:</b> ${file.type || "Không xác định"}</p>

        <p><b>Kích thước:</b> ${sizeKB} KB</p>

        <p>Hiện tại HTTV mới hỗ trợ đọc nội dung file TXT.</p>
    `;
}

function showTextFile(file, text) {

    const sizeKB = (file.size / 1024).toFixed(2);

    content.innerHTML = `
        <h2>${file.name}</h2>

        <p><b>Kích thước:</b> ${sizeKB} KB</p>

        <hr>

        <pre>${text}</pre>
    `;
}
