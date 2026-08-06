// frontend/js/app.js
// HTTV v1 - Điều khiển giao diện và kho tài liệu

(function () {
  "use strict";

  const btnUpload = document.getElementById("btnUpload");
  const fileInput = document.getElementById("fileInput");
  const libraryList = document.getElementById("libraryList");
  const detailView = document.getElementById("detailView");
  const searchInput = document.getElementById("searchInput");

  document.addEventListener("DOMContentLoaded", () => {
    renderLibrary();
  });

  btnUpload.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      btnUpload.disabled = true;
      btnUpload.textContent = "Đang phân tích...";

      // Chờ parser xuất hiện tối đa 3 giây
      await waitForParser();

      const doc = await window.parseDocument(file);

      addDocument(doc);
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

  function waitForParser(timeout = 3000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const timer = setInterval(() => {
        if (typeof window.parseDocument === "function") {
          clearInterval(timer);
          resolve();
          return;
        }

        if (Date.now() - start > timeout) {
          clearInterval(timer);
          reject(new Error("parser.js chưa được nạp"));
        }
      }, 50);
    });
  }

  function renderLibrary(keyword = "") {
    const docs = loadDocuments();

    let filtered = docs;

    if (keyword) {
      const q = keyword.toLowerCase();

      filtered = docs.filter(doc =>
        doc.name.toLowerCase().includes(q) ||
        (doc.metadata.documentNumber || "").toLowerCase().includes(q) ||
        (doc.metadata.documentType || "").toLowerCase().includes(q)
      );
    }

    if (!filtered.length) {
      libraryList.innerHTML =
        '<p class="empty">Chưa có tài liệu nào.</p>';
      return;
    }

    libraryList.innerHTML = filtered.map(doc => `
      <div class="doc-item" data-id="${doc.id}">
        <h3>${doc.name}</h3>
        <p><b>Số:</b> ${doc.metadata.documentNumber || "Chưa xác định"}</p>
        <p><b>Loại:</b> ${doc.metadata.documentType || "Chưa xác định"}</p>
        <p><b>Điều khoản:</b> ${doc.clauses.length}</p>
      </div>
    `).join("");

    document.querySelectorAll(".doc-item").forEach(item => {
      item.addEventListener("click", () => {
        const docs = loadDocuments();
        const doc = docs.find(d => d.id === item.dataset.id);
        if (doc) showDetail(doc);
      });
    });
  }

  function showDetail(doc) {
    detailView.innerHTML = `
      <div class="detail-card">
        <h2>${doc.name}</h2>

        <p><b>Loại văn bản:</b> ${doc.metadata.documentType || "Chưa xác định"}</p>
        <p><b>Số hiệu:</b> ${doc.metadata.documentNumber || "Chưa xác định"}</p>
        <p><b>Cơ quan ban hành:</b> ${doc.metadata.issuingAgency || "Chưa xác định"}</p>
        <p><b>Ngày ban hành:</b> ${doc.metadata.issuedDate || "Chưa xác định"}</p>
        <p><b>Ngày hiệu lực:</b> ${doc.metadata.effectiveDate || "Chưa xác định"}</p>
        <p><b>Số điều khoản:</b> ${doc.clauses.length}</p>

        <h3 style="margin-top:18px">Điều khoản</h3>

        ${doc.clauses.length
          ? doc.clauses.map(c => `
              <div class="clause">
                <h4>${c.title}</h4>
                <p>${c.content}</p>
              </div>
            `).join("")
          : '<p class="empty">Không tìm thấy điều khoản.</p>'}
      </div>
    `;
  }

  searchInput.addEventListener("input", () => {
    renderLibrary(searchInput.value);
  });

})();
