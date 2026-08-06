// js/app.js
// HTTV - Quản lý tài liệu offline (ổn định)

let currentDocumentId = null;

function $(id) {
  return document.getElementById(id);
}

const btnUpload = $("btnUpload");
const fileInput = $("fileInput");
const libraryList = $("libraryList");
const detailView = $("detailView");
const searchInput = $("searchInput");

// ===========================
// KHỞI TẠO
// ===========================

window.addEventListener("DOMContentLoaded", () => {
  try {
    renderLibrary();
  } catch (e) {
    console.error("Lỗi khởi tạo HTTV:", e);
  }
});

// ===========================
// THÊM TÀI LIỆU
// ===========================

if (btnUpload && fileInput) {

  btnUpload.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const lower = file.name.toLowerCase();

    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      alert("Chỉ hỗ trợ PDF và DOCX");
      return;
    }

    if (typeof parseDocument !== "function") {
      alert("parser.js chưa được nạp.");
      return;
    }

    if (typeof addDocument !== "function") {
      alert("storage.js chưa được nạp.");
      return;
    }

    try {

      btnUpload.disabled = true;
      btnUpload.textContent = "Đang phân tích...";

      const doc = await parseDocument(file);

      addDocument(doc);

      renderLibrary();

      openDocument(doc.id);

      alert("Đã thêm tài liệu: " + file.name);

    } catch (err) {

      console.error(err);

      alert("Lỗi khi đọc tài liệu: " + err.message);

    } finally {

      btnUpload.disabled = false;
      btnUpload.textContent = "➕ Thêm tài liệu";
      fileInput.value = "";

    }

  });

}

// ===========================
// HIỂN THỊ KHO TÀI LIỆU
// ===========================

function renderLibrary(keyword = "") {

  if (!libraryList) return;

  if (typeof loadDocuments !== "function") {
    libraryList.innerHTML =
      '<p class="empty">Thiếu storage.js</p>';
    return;
  }

  const docs = loadDocuments();

  let filtered = docs;

  if (keyword.trim()) {

    const k = keyword.toLowerCase();

    filtered = docs.filter(doc =>
      (doc.name || "").toLowerCase().includes(k) ||
      (doc.metadata.documentNumber || "").toLowerCase().includes(k) ||
      (doc.text || "").toLowerCase().includes(k)
    );

  }

  if (!filtered.length) {

    libraryList.innerHTML =
      '<p class="empty">Chưa có tài liệu nào.</p>';
    return;

  }

  libraryList.innerHTML = filtered.map(doc => `
    <div class="doc-item ${doc.id === currentDocumentId ? "active" : ""}"
         onclick="openDocument('${doc.id}')">

      <h3>${doc.name}</h3>

      <div class="meta">
        <div><b>Số VB:</b> ${doc.metadata.documentNumber || "Chưa xác định"}</div>
        <div><b>Hiệu lực:</b> ${doc.metadata.effectiveDate || "Chưa xác định"}</div>
        <div><b>Điều:</b> ${doc.clauses.length}</div>
      </div>
    </div>
  `).join("");

}

// ===========================
// MỞ TÀI LIỆU
// ===========================

window.openDocument = function(id) {

  if (typeof getDocument !== "function") return;

  const doc = getDocument(id);

  if (!doc) return;

  currentDocumentId = id;

  renderLibrary(searchInput ? searchInput.value : "");

  if (!detailView) return;

  detailView.innerHTML = `
    <div class="detail-card">
      <h2>${doc.name}</h2>

      <div class="detail-grid">

        <div>
          <b>Số văn bản</b><br>
          ${doc.metadata.documentNumber || "Chưa xác định"}
        </div>

        <div>
          <b>Ngày ban hành</b><br>
          ${doc.metadata.issuedDate || "Chưa xác định"}
        </div>

        <div>
          <b>Ngày hiệu lực</b><br>
          ${doc.metadata.effectiveDate || "Chưa xác định"}
        </div>

        <div>
          <b>Tổng số điều khoản</b><br>
          ${doc.clauses.length}
        </div>

      </div>

    </div>

    <div id="clausesContainer">
      ${renderClauses(doc.clauses)}
    </div>
  `;

};

// ===========================
// HIỂN THỊ ĐIỀU KHOẢN
// ===========================

function renderClauses(clauses) {

  if (!clauses.length) {
    return `
      <div class="detail-card">
        <p>Không tìm thấy điều khoản.</p>
      </div>
    `;
  }

  return clauses.map(clause => `
    <div class="clause">
      <h3>${clause.title}</h3>
      <p>${clause.content}</p>
    </div>
  `).join("");

}

// ===========================
// TRA CỨU
// ===========================

if (searchInput) {

  searchInput.addEventListener("input", () => {

    renderLibrary(searchInput.value);

    if (!currentDocumentId || typeof getDocument !== "function") return;

    const keyword = searchInput.value.trim().toLowerCase();

    const doc = getDocument(currentDocumentId);

    if (!doc) return;

    const filtered = keyword
      ? doc.clauses.filter(c =>
          (c.title || "").toLowerCase().includes(keyword) ||
          (c.content || "").toLowerCase().includes(keyword)
        )
      : doc.clauses;

    const container = $("clausesContainer");

    if (container) {
      container.innerHTML = renderClauses(filtered);
    }

  });

}
