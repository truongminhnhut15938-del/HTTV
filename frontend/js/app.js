const btnUpload = document.getElementById("btnUpload");
const fileInput = document.getElementById("fileInput");
const content = document.getElementById("content");

// Đăng ký sự kiện
btnUpload.addEventListener("click", openFileDialog);
fileInput.addEventListener("change", handleFileSelected);

// Mở hộp thoại chọn file
function openFileDialog() {
    fileInput.click();
}

// Xử lý khi người dùng chọn file
function handleFileSelected() {

    if (fileInput.files.length === 0) {
        return;
    }

    const file = fileInput.files[0];

    showFileInfo(file);
}

// Hiển thị thông tin file
function showFileInfo(file) {

    const sizeKB = (file.size / 1024).toFixed(2);

    content.innerHTML = `
        <h2>Đã chọn tài liệu</h2>

        <p><b>Tên:</b> ${file.name}</p>

        <p><b>Loại:</b> ${file.type || "Không xác định"}</p>

        <p><b>Kích thước:</b> ${sizeKB} KB</p>
    `;
}
