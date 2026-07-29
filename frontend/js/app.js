const btnUpload = document.getElementById("btnUpload");
const fileInput = document.getElementById("fileInput");

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

    if (file.name.toLowerCase().endsWith(".txt")) {

        const reader = new FileReader();

        reader.onload = function (e) {

            showFileInfo(file, e.target.result);

        };

        reader.readAsText(file, "UTF-8");

    } else {

        showFileInfo(
            file,
            "Định dạng này sẽ được hỗ trợ ở các phiên bản tiếp theo."
        );

    }

}
