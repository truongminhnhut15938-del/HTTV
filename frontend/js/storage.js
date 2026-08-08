// frontend/js/storage.js
// HTTV Storage v3 - IndexedDB
// Lưu toàn bộ tài liệu (PDF/DOCX + metadata + nội dung parser)
// trực tiếp trong bộ nhớ thiết bị người dùng.

const HTTV_DB_NAME = "HTTV_DB";
const HTTV_DB_VERSION = 1;
const HTTV_STORE = "documents";

let httvDB = null;

// ===========================
// Khởi tạo database
// ===========================
function initDB() {
  return new Promise((resolve, reject) => {

    if (httvDB) {
      resolve(httvDB);
      return;
    }

    const request = indexedDB.open(HTTV_DB_NAME, HTTV_DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      httvDB = request.result;
      resolve(httvDB);
    };

    request.onupgradeneeded = (event) => {

      const db = event.target.result;

      if (!db.objectStoreNames.contains(HTTV_STORE)) {

        const store = db.createObjectStore(HTTV_STORE, {
          keyPath: "id"
        });

        store.createIndex(
          "documentNumber",
          "metadata.documentNumber",
          { unique: false }
        );

        store.createIndex(
          "documentType",
          "metadata.documentType",
          { unique: false }
        );

        store.createIndex(
          "issuedDate",
          "metadata.issuedDate",
          { unique: false }
        );
      }
    };
  });
}

// ===========================
// Thêm tài liệu
// ===========================
async function addDocument(doc) {

  const db = await initDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(HTTV_STORE, "readwrite");

    const store = tx.objectStore(HTTV_STORE);

    const request = store.put(doc);

    request.onsuccess = () => resolve(true);

    request.onerror = () => reject(request.error);
  });
}

// ===========================
// Cập nhật tài liệu
// ===========================
async function updateDocument(doc) {

  const db = await initDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(HTTV_STORE, "readwrite");

    const store = tx.objectStore(HTTV_STORE);

    const request = store.put(doc);

    request.onsuccess = () => resolve(true);

    request.onerror = () => reject(request.error);
  });
}

// ===========================
// Lấy tất cả tài liệu
// ===========================
async function getAllDocuments() {

  const db = await initDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(HTTV_STORE, "readonly");

    const store = tx.objectStore(HTTV_STORE);

    const request = store.getAll();

    request.onsuccess = () => {

      const docs = request.result || [];

      docs.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      resolve(docs);
    };

    request.onerror = () => reject(request.error);
  });
}

// ===========================
// Lấy một tài liệu theo ID
// ===========================
async function getDocument(id) {

  const db = await initDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(HTTV_STORE, "readonly");

    const store = tx.objectStore(HTTV_STORE);

    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => reject(request.error);
  });
}

// ===========================
// Xóa tài liệu
// ===========================
async function deleteDocument(id) {

  const db = await initDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(HTTV_STORE, "readwrite");

    const store = tx.objectStore(HTTV_STORE);

    const request = store.delete(id);

    request.onsuccess = () => resolve(true);

    request.onerror = () => reject(request.error);
  });
}

// ===========================
// Xóa toàn bộ dữ liệu
// ===========================
async function clearDocuments() {

  const db = await initDB();

  return new Promise((resolve, reject) => {

    const tx = db.transaction(HTTV_STORE, "readwrite");

    const store = tx.objectStore(HTTV_STORE);

    const request = store.clear();

    request.onsuccess = () => resolve(true);

    request.onerror = () => reject(request.error);
  });
}

// ===========================
// Tìm kiếm theo metadata
// ===========================
async function searchDocuments(keyword) {

  const docs = await getAllDocuments();

  if (!keyword) return docs;

  const q = keyword.toLowerCase();

  return docs.filter(doc => {

    return (
      (doc.name || "").toLowerCase().includes(q) ||

      (doc.metadata?.documentType || "")
        .toLowerCase()
        .includes(q) ||

      (doc.metadata?.documentNumber || "")
        .toLowerCase()
        .includes(q) ||

      (doc.metadata?.summary || "")
        .toLowerCase()
        .includes(q)
    );
  });
}

// ===========================
// Tương thích API cũ
// ===========================

async function loadDocuments() {
  return await getAllDocuments();
}

async function saveDocuments(docs) {

  await clearDocuments();

  for (const doc of docs) {
    await addDocument(doc);
  }
}

// ===========================
// Export
// ===========================

window.initDB = initDB;
window.addDocument = addDocument;
window.updateDocument = updateDocument;
window.getDocument = getDocument;
window.getAllDocuments = getAllDocuments;
window.deleteDocument = deleteDocument;
window.clearDocuments = clearDocuments;
window.searchDocuments = searchDocuments;

window.loadDocuments = loadDocuments;
window.saveDocuments = saveDocuments;

console.log("HTTV Storage v3 (IndexedDB) loaded");
