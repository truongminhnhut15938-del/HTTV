// frontend/js/app.js
// HTTV v1 - Điều khiển giao diện và kho tài liệu

(function () {
  "use strict";

  // ===========================
  // DOM
  // ===========================
  const btnUpload = document.getElementById("btnUpload");
  const fileInput = document.getElementById("fileInput");
  const libraryList = document.getElementById("libraryList");
  const detailView = document.getElementById("detailView");
  const searchInput = document.getElementById("searchInput");

  // ===========================
  // Khởi động
  // ===========================
  document.addEventListener("DOMContentLoaded", () => {
    renderLibrary();
  });

  // ===========================
  // Mở hộp thoại chọn file
  // ===========================
  btnUpload.addEventListener("click", () => {
    fileInput.click();
  });

  // ===========================
  // Thêm tài liệu
  // ===========================
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      btnUpload.disabled = true;
      btnUpload.textContent = "Đang phân tích...";

      // Gọi trực tiếp parser
      const doc = await window.parseDocument(file);

      // Lưu tài liệu
      addDocument(doc);

      // Cập nhật giao diện
      renderLibrary();
      showDetail(doc);

      alert("Đã thêm tài liệu: " + file.name);

    } catch (err) {
      console.error(err);
      alert(err.message);

    } finally {
      btnUpload.disabled = false;
      btnUpload.textContent = "➕ Thêm tài liệu";
      fileInput.value = "";
    }
  });

  // ===========================
  // Render danh sách tài liệu
  // ===========================
  function renderLibrary(keyword = "") {
    const docs = loadDocuments();

    let filtered = docs;

    if (keyword) {
      const q = keyword.toLowerCase();

      filtered = docs.filter(doc => {
        return (
          doc.name.toLowerCase().includes(q) ||
          (doc.metadata.documentNumber || "").toLowerCase().includes(q) ||
          (doc.metadata.documentType || "").toLowerCase().includes(q)
        );
      });
    }

    if (!filtered.length) {
      libraryList.innerHTML =
        '<p class="empty">Chưa có tài liệu nào.</p>';
      return;
    }

    libraryList.innerHTML = filtered.map(doc => `
  <div class="doc-item" data-id="${doc.id}">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <h3 style="margin:0;">${doc.name}</h3>

      <button class="btn-delete"
              data-delete="${doc.id}"
              style="background:none;border:none;color:#d9534f;font-size:18px;cursor:pointer;">
        🗑
      </button>
    </div>

    <p><b>Số:</b> ${doc.metadata.documentNumber || "Chưa xác định"}</p>
    <p><b>Loại:</b> ${doc.metadata.documentType || "Chưa xác định"}</p>
    <p><b>Điều khoản:</b> ${doc.clauses.length}</p>

  </div>
`).join("");

    // Gắn sự kiện click
    document.querySelectorAll(".doc-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.id;
        const docs = loadDocuments();
        const doc = docs.find(d => d.id === id);

        if (doc) showDetail(doc);
      });
    });
  }

  // Gắn sự kiện xóa
document.querySelectorAll(".btn-delete").forEach(btn => {
  btn.addEventListener("click", (e) => {

    e.stopPropagation();

    const id = btn.dataset.delete;

    const ok = confirm("Xóa tài liệu này khỏi HTTV?");

    if (!ok) return;

    let docs = loadDocuments();

    docs = docs.filter(d => d.id !== id);

    saveDocuments(docs);

    renderLibrary(searchInput.value);

    detailView.innerHTML =
      '<p class="empty">Chưa chọn tài liệu.</p>';
  });
});
  
  // ===========================
  // Hiển thị chi tiết
  // ===========================
  function showDetail(doc) {
    detailView.innerHTML = `
      <div class="detail-card">

        <h2>${doc.name}</h2>

        <div class="meta-grid">

          <div class="meta-item">
            <div class="label">Loại văn bản</div>
            <div class="value">${doc.metadata.documentType || "Chưa xác định"}</div>
          </div>

          <div class="meta-item">
            <div class="label">Số hiệu</div>
            <div class="value">${doc.metadata.documentNumber || "Chưa xác định"}</div>
          </div>

          <div class="meta-item">
            <div class="label">Cơ quan ban hành</div>
            <div class="value">${doc.metadata.issuingAgency || "Chưa xác định"}</div>
          </div>

          <div class="meta-item">
            <div class="label">Ngày ban hành</div>
            <div class="value">${doc.metadata.issuedDate || "Chưa xác định"}</div>
          </div>

          <div class="meta-item">
            <div class="label">Ngày hiệu lực</div>
            <div class="value">${doc.metadata.effectiveDate || "Chưa xác định"}</div>
          </div>

          <div class="meta-item">
            <div class="label">Số điều khoản</div>
            <div class="value">${doc.clauses.length}</div>
          </div>

        </div>

        <h3 style="margin-top:18px">Điều khoản</h3>

        <div class="clause-list">
          ${doc.clauses.length
            ? doc.clauses.map(c => `
              <div class="clause">
                <h4>${c.title}</h4>
                <p>${c.content || ""}</p>
              </div>
            `).join("")
            : '<p class="empty">Không tìm thấy điều khoản.</p>'}
        </div>

      </div>
    `;
  }

  // ===========================
  // Tìm kiếm
  // ===========================
  searchInput.addEventListener("input", () => {
    renderLibrary(searchInput.value);
  });

})();
