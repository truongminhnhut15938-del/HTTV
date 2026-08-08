// frontend/js/app.js
// HTTV v2 - Form metadata dạng bảng (Modal)
// Giữ nguyên giao diện hiện tại

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
  const btnSearch = document.getElementById("btnSearch");
  
  let pendingDoc = null;

  // ===========================
  // Khởi động
  // ===========================
  document.addEventListener("DOMContentLoaded", () => {
    renderLibrary();
    createMetadataModal();

    // Đăng ký sự kiện sau khi DOM đã sẵn sàng
    btnUpload.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileSelected);

    // Nút Tra cứu
btnSearch.addEventListener("click", () => {
  renderLibrary(searchInput.value);
});

// Nhấn Enter cũng tra cứu
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    renderLibrary(searchInput.value);
  }
});
})
  // ===========================
  // Tạo modal nhập metadata
  // ===========================
  function createMetadataModal() {

    if (document.getElementById("metadataModal")) return;

    const modal = document.createElement("div");
    modal.id = "metadataModal";

    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    modal.innerHTML = `
      <div style="
        background:#fff;
        width:92%;
        max-width:560px;
        border-radius:14px;
        padding:20px;
        box-shadow:0 12px 40px rgba(0,0,0,.25);
      ">

        <h2 style="margin:0 0 16px 0;">Thêm tài liệu</h2>

        <table style="width:100%;border-collapse:collapse;">

          <tr>
            <td style="padding:10px 0;width:160px;">Loại văn bản</td>
            <td>
              <input id="metaType"
                     style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;"
                     placeholder="Ví dụ: Thông tư">
            </td>
          </tr>

          <tr>
            <td style="padding:10px 0;">Số văn bản</td>
            <td>
              <input id="metaNumber"
                     style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;"
                     placeholder="Ví dụ: 01/2014/TT-NHNN">
            </td>
          </tr>

          <tr>
            <td style="padding:10px 0;">Ngày ban hành</td>
            <td>
              <input id="metaIssued"
                     type="date"
                     style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;">
            </td>
          </tr>

          <tr>
            <td style="padding:10px 0;">Ngày hiệu lực</td>
            <td>
              <input id="metaEffective"
                     type="date"
                     style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;">
            </td>
          </tr>

          <tr>
            <td style="padding:10px 0;vertical-align:top;">Mô tả nội dung ngắn gọn</td>
            <td>
              <textarea id="metaSummary"
                        rows="4"
                        style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;resize:vertical;"
                        placeholder="Tóm tắt ngắn gọn nội dung văn bản"></textarea>
            </td>
          </tr>

        </table>

        <div style="
          display:flex;
          justify-content:flex-end;
          gap:10px;
          margin-top:18px;
        ">

          <button id="btnCancelMeta"
                  style="
                    padding:10px 16px;
                    border:1px solid #ccc;
                    border-radius:8px;
                    background:#fff;
                    cursor:pointer;
                  ">
            Hủy
          </button>

          <button id="btnSaveMeta"
                  style="
                    padding:10px 18px;
                    border:none;
                    border-radius:8px;
                    background:#2563eb;
                    color:#fff;
                    cursor:pointer;
                    font-weight:600;
                  ">
            Lưu tài liệu
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById("btnCancelMeta")
      .addEventListener("click", closeMetadataModal);

    document
      .getElementById("btnSaveMeta")
      .addEventListener("click", saveMetadataAndDocument);
  }

  function openMetadataModal(doc) {

    pendingDoc = doc;

    document.getElementById("metaType").value =
      doc.metadata.documentType || "";

    document.getElementById("metaNumber").value =
      doc.metadata.documentNumber || "";

    document.getElementById("metaIssued").value = "";
    document.getElementById("metaEffective").value = "";
    document.getElementById("metaSummary").value = "";

    document.getElementById("metadataModal").style.display = "flex";
  }

  function closeMetadataModal() {

    pendingDoc = null;

    document.getElementById("metadataModal").style.display = "none";
  }

  // ===== KHỐI 2/3 NỐI TIẾP TỪ ĐÂY =====
   // ===========================
  // Lưu metadata và tài liệu
  // ===========================
  function saveMetadataAndDocument() {

    if (!pendingDoc) return;

    pendingDoc.metadata = {
      documentType: document.getElementById("metaType").value.trim(),
      documentNumber: document.getElementById("metaNumber").value.trim(),
      issuingAgency: pendingDoc.metadata.issuingAgency || "",
      issuedDate: document.getElementById("metaIssued").value,
      effectiveDate: document.getElementById("metaEffective").value,
      summary: document.getElementById("metaSummary").value.trim()
    };

    addDocument(pendingDoc);

    renderLibrary();

    showDetail(pendingDoc);

    alert("Đã thêm tài liệu: " + pendingDoc.name);

    closeMetadataModal();
  }

  // ===========================
  // Thêm tài liệu
  // ===========================
  async function handleFileSelected(e) {

    const file = e.target.files[0];

    if (!file) return;

    try {

      btnUpload.disabled = true;

      btnUpload.textContent = "Đang phân tích...";

      const doc = await window.parseDocument(file);

      // Lưu file PDF gốc
      if (file.type === "application/pdf") {

        const base64 = await new Promise((resolve, reject) => {

          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);

          reader.onerror = reject;

          reader.readAsDataURL(file);
        });

        doc.fileData = base64;
      }

      // Hiện form metadata
      openMetadataModal(doc);

    } catch (err) {

      console.error(err);

      alert(err.message);

    } finally {

      btnUpload.disabled = false;

      btnUpload.textContent = "➕ Thêm tài liệu";

      fileInput.value = "";
    }
  }

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
          (doc.metadata.documentType || "").toLowerCase().includes(q) ||
          (doc.metadata.documentNumber || "").toLowerCase().includes(q) ||
          (doc.metadata.summary || "").toLowerCase().includes(q)
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

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        ">

          <h3 style="margin:0;">${doc.name}</h3>

          <button class="btn-delete"
                  data-delete="${doc.id}"
                  style="
                    background:none;
                    border:none;
                    color:#d9534f;
                    font-size:18px;
                    cursor:pointer;
                  ">
            🗑
          </button>

        </div>

        <p><b>Loại:</b>
          ${doc.metadata.documentType || "Chưa xác định"}
        </p>

        <p><b>Số:</b>
          ${doc.metadata.documentNumber || "Chưa xác định"}
        </p>

        <p><b>Mô tả:</b>
          ${doc.metadata.summary || "Chưa có"}
        </p>

      </div>
    `).join("");

    // Mở chi tiết
    document.querySelectorAll(".doc-item").forEach(item => {

      item.addEventListener("click", () => {

        const id = item.dataset.id;

        const docs = loadDocuments();

        const doc = docs.find(d => d.id === id);

        if (doc) showDetail(doc);
      });
    });

    // Xóa từng tài liệu
    document.querySelectorAll(".btn-delete").forEach(btn => {

      btn.addEventListener("click", (e) => {

        e.stopPropagation();

        const id = btn.dataset.delete;

        if (!confirm("Xóa tài liệu này khỏi HTTV?")) return;

        let docs = loadDocuments();

        docs = docs.filter(d => d.id !== id);

        saveDocuments(docs);

        renderLibrary(searchInput.value);

        detailView.innerHTML =
          '<p class="empty">Chưa chọn tài liệu.</p>';
      });
    });
  }

  // ===== KHỐI 3/3 NỐI TIẾP TỪ ĐÂY =====
   // ===========================
  // Hiển thị chi tiết tài liệu
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
            <div class="label">Số văn bản</div>
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
            <div class="label">Mô tả nội dung</div>
            <div class="value">${doc.metadata.summary || "Chưa có"}</div>
          </div>

        </div>

        <button id="btnViewPdf"
                style="
                  margin-top:16px;
                  padding:10px 18px;
                  background:#2563eb;
                  color:#fff;
                  border:none;
                  border-radius:10px;
                  cursor:pointer;
                  font-weight:600;
                ">
          📄 Xem file PDF
        </button>

      </div>
    `;

    const btn = document.getElementById("btnViewPdf");

    if (btn) {
      btn.addEventListener("click", () => {
        if (doc.fileData) {
          window.open(doc.fileData, "_blank");
        } else {
          alert("Chưa có dữ liệu file PDF để xem.");
        }
      });
    }
  }

})();
