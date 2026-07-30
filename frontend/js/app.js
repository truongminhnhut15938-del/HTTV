// ================================
// HTTV - APP.JS
// Điều khiển chính ứng dụng
// ================================

let currentFile = null;

// Khi trang tải xong
document.addEventListener("DOMContentLoaded", function () {

// Mở cơ sở dữ liệu
openDatabase()
    .then(function () {
        console.log("HTTV Database đã sẵn sàng");
    })
    .catch(function (err) {
        console.error("Lỗi mở database:", err);
    });

const btnUpload = document.getElementById("btnUpload");
const fileInput = document.getElementById("fileInput");
const btnSearch = document.getElementById("btnSearch");

// ================================
// Nút thêm tài liệu
// ================================
if (btnUpload) {
    btnUpload.onclick = function () {
        fileInput.click();
    };
}

// ================================
// Khi chọn file
// ================================
if (fileInput) {
    fileInput.onchange = async function (event) {

        const file = event.target.files[0];

        if (!file) {
            return;
        }

        currentFile = file;

        showFileInfo(file);

        try {

            if (typeof processDocument === "function") {

                const documentData =
                    await processDocument(file);

                const contentBox =
                    document.getElementById("documentContent");

                if (contentBox) {
                    contentBox.innerText =
                        documentData.content;
                }

            } else {

                alert(
                    "Chưa tải module parser.js"
                );

            }

        } catch (err) {

            console.error(err);

            alert(
                "Không thể đọc tài liệu: " +
                err.message
            );

        }

    };
}

// ================================
// Nút tra cứu
// ================================
if (btnSearch) {

    btnSearch.onclick = function () {

        const keyword =
            document.getElementById("searchInput")
            .value
            .trim();

        if (keyword === "") {

            alert(
                "Vui lòng nhập từ khóa"
            );

            return;

        }

        searchDocument(keyword);

    };

}

});

// =================================
// Hiển thị thông tin file
// =================================
function showFileInfo(file) {

const info =
    document.getElementById("fileInfo");

if (info) {

    let size =
        (file.size / 1024)
        .toFixed(2);

    info.innerHTML =

        `
    <b>Tên:</b> ${file.name}<br>
    <b>Loại:</b> ${file.type || "Không xác định"}<br>
    <b>Dung lượng:</b> ${size} KB
    `;

}

}

// =================================
// Tìm kiếm trong tài liệu hiện tại
// =================================
function searchDocument(keyword) {

const content =
    document.getElementById(
        "documentContent"
    ).innerText;

const result =
    document.getElementById(
        "searchResult"
    );

if (!content || content.length < 5) {

    result.innerHTML =
        "Chưa có nội dung để tra cứu";

    return;

}

const text =
    content.toLowerCase();

const key =
    keyword.toLowerCase();

let index =
    text.indexOf(key);

if (index === -1) {

    result.innerHTML =

        `
    Không tìm thấy:
    <b>${keyword}</b>
    `;

    return;

}

// Lấy đoạn văn xung quanh từ khóa
let start =
    Math.max(
        0,
        index - 200
    );

let end =
    Math.min(
        content.length,
        index + 300
    );

let resultText =
    content.substring(
        start,
        end
    );

result.innerHTML =

    `
<h4>
Kết quả tìm thấy:
</h4>

<p>
${resultText}
</p>
`;

}
