// frontend/js/app.js
// HTTV v2 - Metadata do người dùng nhập
// Giữ nguyên giao diện hiện tại + thêm nút xem file PDF

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

      // Đọc nội dung văn bản bằng parser
      const doc = await window.parseDocument(file);

      // Lưu file PDF gốc để xem lại
      if (file.type === "application/pdf") {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        doc.fileData = base64;
      }

      // ===== Form nhập metadata =====
      const documentType =
        prompt(
          "Loại văn bản (Ví dụ: Thông tư, Nghị định, Quyết định)",
          doc.metadata.documentType || ""
        ) || "";

      const documentNumber =
        prompt(
          "Số văn bản",
          doc.metadata.documentNumber || ""
        ) || "";

      const issuedDate =
        prompt(
          "Ngày phát hành (dd/mm/yyyy)",
          doc.metadata.issuedDate || ""
        ) || "";

      const effectiveDate =
        prompt(
          "Ngày hiệu lực (dd/mm/yyyy)",
          doc.metadata.effectiveDate || ""
        ) || "";

      const summary =
        prompt(
          "Nội dung ngắn gọn của văn bản",
          ""
        ) || "";

      // Ghi đè metadata bằng dữ liệu người dùng nhập
      doc.metadata = {
        documentType,
        documentNumber,
        issuingAgency: doc.metadata.issuingAgency || "",
        issuedDate,
        effectiveDate,
        summary
      };

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
          (doc.metadata.documentType || "").toLowerCase().includes(q) ||
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

        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <h3 style="margin:0;">${doc.name}</h3>

          <button class="btn-delete"
                  data-delete="${doc.id}"
                  style="background:none;border:none;color:#d9534f;font-size:18px;cursor:pointer;">
            🗑
          </button>
        </div>

        <p><b>Loại:</b> ${doc.metadata.documentType || "Chưa xác định"}</p>
        <p><b>Số:</b> ${doc.metadata.documentNumber || "Chưa xác định"}</p>
        <p><b>Tóm tắt:</b> ${doc.metadata.summary || "Chưa có"}</p>

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
  }

  // ===== KHỐI 2/3 NỐI TIẾP TỪ ĐÂY =====
   // ===========================
  // Hiển thị chi tiết
  // ===========================
  function showDetail(doc) {

    const viewButton = (doc.type === "PDF" && doc.fileData)
      ? `
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
      `
      : "";

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
            <div class="label">Ngày phát hành</div>
            <div class="value">${doc.metadata.issuedDate || "Chưa xác định"}</div>
          </div>

          <div class="meta-item">
            <div class="label">Ngày hiệu lực</div>
            <div class="value">${doc.metadata.effectiveDate || "Chưa xác định"}</div>
          </div>

          <div class="meta-item">
            <div class="label">Nội dung ngắn gọn</div>
            <div class="value">${doc.metadata.summary || "Chưa có"}</div>
          </div>

        </div>

        ${viewButton}

      </div>
    `;

    // Mở PDF gốc
    if (doc.type === "PDF" && doc.fileData) {

      const btn = document.getElementById("btnViewPdf");

      if (btn) {
        btn.addEventListener("click", () => {
          window.open(doc.fileData, "_blank");
        });
      }
    }
  }

  // ===========================
  // Tra cứu
  // ===========================
  searchInput.addEventListener("input", () => {
    renderLibrary(searchInput.value);
  });

  // ===== KHỐI 3/3 NỐI TIẾP TỪ ĐÂY =====
  // ===========================
  // Kết thúc module
  // ===========================

})();
