const btnUpload = document.getElementById("btnUpload");
const fileInput = document.getElementById("fileInput");
const content = document.getElementById("content");

btnUpload.addEventListener("click", openFileDialog);
fileInput.addEventListener("change", handleFileSelected);

function openFileDialog() {
fileInput.click();
}

async function handleFileSelected() {
if (fileInput.files.length === 0) {
return;
}

const file = fileInput.files[0];

try {
    content.innerHTML = "Đang đọc tài liệu...";
    const text = await readDocument(file);
    showFileInfo(file, text);
} catch (error) {
    console.error(error);
    showFileInfo(file, "Không thể đọc tài liệu này.\n\n" + error.message);
}

}
