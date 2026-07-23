const btnUpload = document.getElementById("btnUpload");
const fileInput = document.getElementById("fileInput");
const content = document.getElementById("content");

btnUpload.addEventListener("click", () => {
    fileInput.click();
    });

    fileInput.addEventListener("change", () => {

        if(fileInput.files.length === 0){
                return;
                    }

                        const file = fileInput.files[0];

                            const sizeKB = (file.size / 1024).toFixed(2);

                                content.innerHTML = `
                                        <h2>Đã chọn tài liệu</h2>

                                                <p><b>Tên:</b> ${file.name}</p>

                                                        <p><b>Loại:</b> ${file.type || "Không xác định"}</p>

                                                                <p><b>Kích thước:</b> ${sizeKB} KB</p>
                                                                    `;
                                                                    });