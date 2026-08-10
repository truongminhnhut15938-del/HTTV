// frontend/js/app.js
// HTTV v4 - Stable + Chỉnh sửa Metadata (1/4)

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
  let isEditing = false;

  // ===========================
  // Khởi động
  // ===========================
  init();

  async function init() {
    await initDB();
    createMetadataModal();
    await renderLibrary();

    btnUpload.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", handleFileSelected);

    btnSearch.addEventListener("click", async () => {
      await renderLibrary(searchInput.value);
    });

    searchInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        await renderLibrary(searchInput.value);
      }
    });
  }

  // ===========================
  // Modal nhập metadata
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
        max-width:600px;
        border-radius:14px;
        padding:20px;
        box-shadow:0 12px 40px rgba(0,0,0,.25);
      ">

        <h2 id="modalTitle" style="margin:0 0 16px 0;">Thêm tài liệu</h2>

        <table style="width:100%;border-collapse:collapse;">

          <tr>
            <td style="padding:10px 0;width:170px;">Loại văn bản</td>
            <td>
              <input id="metaType"
                     style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;"
                     placeholder="Ví dụ: Thông tư, Nghị định, Quyết định">
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
    isEditing = false;

    document.getElementById("modalTitle").textContent = "Thêm tài liệu";

    document.getElementById("metaType").value =
      doc.metadata.documentType || "";

    document.getElementById("metaNumber").value =
      doc.metadata.documentNumber || "";

    document.getElementById("metaIssued").value =
      doc.metadata.issuedDate || "";

    document.getElementById("metaEffective").value =
      doc.metadata.effectiveDate || "";

    document.getElementById("metaSummary").value =
      doc.metadata.summary || "";

    document.getElementById("metadataModal").style.display = "flex";
  }

  function closeMetadataModal() {
    pendingDoc = null;
    isEditing = false;
    document.getElementById("metadataModal").style.display = "none";
  }
    // ===========================
  // Chỉnh sửa metadata tài liệu
  // ===========================
  async function editDocumentMetadata(id) {

    const doc = await getDocument(id);

    if (!doc) return;

    pendingDoc = doc;
    isEditing = true;

    document.getElementById("modalTitle").textContent = "Chỉnh sửa thông tin tài liệu";

    document.getElementById("metaType").value =
      doc.metadata.documentType || "";

    document.getElementById("metaNumber").value =
      doc.metadata.documentNumber || "";

    document.getElementById("metaIssued").value =
      doc.metadata.issuedDate || "";

    document.getElementById("metaEffective").value =
      doc.metadata.effectiveDate || "";

    document.getElementById("metaSummary").value =
      doc.metadata.summary || "";

    document.getElementById("metadataModal").style.display = "flex";
  }

  // ===========================
  // Lưu metadata (thêm mới hoặc chỉnh sửa)
  // ===========================
  async function saveMetadataAndDocument() {

    if (!pendingDoc) return;

    pendingDoc.metadata = {
      documentType: document.getElementById("metaType").value.trim(),
      documentNumber: document.getElementById("metaNumber").value.trim(),
      issuingAgency: pendingDoc.metadata.issuingAgency || "",
      issuedDate: document.getElementById("metaIssued").value,
      effectiveDate: document.getElementById("metaEffective").value,
      summary: document.getElementById("metaSummary").value.trim()
    };

    await saveDocument(pendingDoc);

    await renderLibrary(searchInput.value);

    showDetail(pendingDoc);

    if (isEditing) {
      alert("Đã cập nhật thông tin tài liệu: " + pendingDoc.name);
    } else {
      alert("Đã thêm tài liệu: " + pendingDoc.name);
    }

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

      // Lưu file gốc để xem lại
      doc.fileBlob = file;

      // Chuẩn hóa dữ liệu
      doc.id = crypto.randomUUID();

      // Outline (Chương - Điều)
      doc.outline = buildOutline(doc);

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
  // Tạo Outline (Chương - Điều)
  // ===========================
  function buildOutline(doc) {

    const outline = [];
    const text = doc.rawText || "";

    const chapterRegex = /(Chương\\s+[IVXLC]+[^\\n]*)/gi;
    const articleRegex = /(Điều\\s+\\d+[^\\n]*)/gi;

    const chapters = [...text.matchAll(chapterRegex)];

    if (!chapters.length) {

      const items = [...text.matchAll(articleRegex)].map((m, i) => ({
        id: `dieu_${i + 1}`,
        title: m[1].trim()
      }));

      if (items.length) {
        outline.push({
          title: "Danh mục điều khoản",
          items
        });
      }

      return outline;
    }

    for (let i = 0; i < chapters.length; i++) {

      const start = chapters[i].index;

      const end =
        i + 1 < chapters.length
          ? chapters[i + 1].index
          : text.length;

      const chapterText = text.slice(start, end);

      const items = [...chapterText.matchAll(articleRegex)].map((m, j) => ({
        id: `chuong_${i + 1}_dieu_${j + 1}`,
        title: m[1].trim()
      }));

      outline.push({
        title: chapters[i][1].trim(),
        items
      });
    }

    return outline;
  }
    // ===========================
  // Render danh sách tài liệu
  // ===========================
  async function renderLibrary(keyword = "") {

    const docs = keyword
      ? await searchDocuments(keyword)
      : await getAllDocuments();

    if (!docs.length) {
      libraryList.innerHTML =
        '<p class="empty">Chưa có tài liệu nào.</p>';
      return;
    }

    libraryList.innerHTML = docs.map(doc => `
      <div class="doc-item" data-id="${doc.id}">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        ">

          <h3 style="margin:0;">${doc.name}</h3>

          <div style="display:flex; gap:8px;">

            <button class="btn-edit"
                    data-edit="${doc.id}"
                    style="
                      background:none;
                      border:none;
                      color:#2563eb;
                      font-size:18px;
                      cursor:pointer;
                    "
                    title="Chỉnh sửa">
              ✏️
            </button>

            <button class="btn-delete"
                    data-delete="${doc.id}"
                    style="
                      background:none;
                      border:none;
                      color:#d9534f;
                      font-size:18px;
                      cursor:pointer;
                    "
                    title="Xóa tài liệu">
              🗑
            </button>

          </div>

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

      item.addEventListener("click", async () => {

        const id = item.dataset.id;

        const doc = await getDocument(id);

        if (doc) showDetail(doc);
      });
    });

    // Chỉnh sửa metadata
    document.querySelectorAll(".btn-edit").forEach(btn => {

      btn.addEventListener("click", async (e) => {

        e.stopPropagation();

        const id = btn.dataset.edit;

        await editDocumentMetadata(id);
      });
    });

    // Xóa tài liệu
    document.querySelectorAll(".btn-delete").forEach(btn => {

      btn.addEventListener("click", async (e) => {

        e.stopPropagation();

        const id = btn.dataset.delete;

        if (!confirm("Xóa tài liệu này khỏi HTTV?")) return;

        await deleteDocument(id);

        await renderLibrary(searchInput.value);

        detailView.innerHTML =
          '<p class="empty">Chưa chọn tài liệu.</p>';
      });
    });
  }
    // ===========================
  // Hiển thị chi tiết tài liệu
  // ===========================
  function showDetail(doc) {

    const outlineHtml = renderOutline(doc.outline || []);

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

        <div style="margin-top:18px;">
          <h3 style="margin:0 0 10px 0;">Nội dung tóm tắt</h3>

          <div style="
            max-height:260px;
            overflow:auto;
            border:1px solid #ddd;
            border-radius:10px;
            padding:12px;
            background:#fafafa;
          ">
            ${outlineHtml}
          </div>
        </div>

        <button id="btnViewPdf"
                style="
                  margin-top:18px;
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

        if (doc.fileBlob) {

          const url = URL.createObjectURL(doc.fileBlob);

          window.open(url, "_blank");

          setTimeout(() => URL.revokeObjectURL(url), 60000);

        } else {

          alert("Chưa có dữ liệu file để xem.");
        }
      });
    }
  }

  // ===========================
  // Render Outline (Chương - Điều)
  // ===========================
  function renderOutline(outline) {

    if (!outline || !outline.length) {
      return "<i>Chưa xác định cấu trúc tài liệu.</i>";
    }

    return outline.map(ch => `

      <div style="margin-bottom:14px;">

        <div style="font-weight:700;color:#1d4ed8;margin-bottom:6px;">
          ${ch.title}
        </div>

        <ul style="margin:0;padding-left:18px;">

          ${ch.items.map(it => `

            <li>
              <a href="#"
                 class="outline-link"
                 data-clause="${it.id}"
                 style="text-decoration:none;color:#111827;">

                ${it.title}

              </a>
            </li>

          `).join("")}

        </ul>

      </div>

    `).join("");
  }

})();
  
