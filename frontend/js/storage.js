// js/storage.js
// HTTV - Lưu trữ tài liệu offline bằng localStorage

const STORAGE_KEY = "httv_documents";

// ===========================
// ĐỌC TOÀN BỘ TÀI LIỆU
// ===========================

function loadDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    const docs = JSON.parse(raw);

    return Array.isArray(docs) ? docs : [];

  } catch (e) {
    console.error("Lỗi loadDocuments:", e);
    return [];
  }
}

// ===========================
// GHI TOÀN BỘ TÀI LIỆU
// ===========================

function saveDocuments(docs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    return true;

  } catch (e) {
    console.error("Lỗi saveDocuments:", e);
    alert("Không thể lưu dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.");
    return false;
  }
}

// ===========================
// THÊM TÀI LIỆU
// ===========================

function addDocument(doc) {

  const docs = loadDocuments();

  docs.unshift(doc);

  saveDocuments(docs);

  return doc;
}

// ===========================
// LẤY TÀI LIỆU THEO ID
// ===========================

function getDocument(id) {

  return loadDocuments().find(d => d.id === id) || null;
}

// ===========================
// XÓA TÀI LIỆU
// ===========================

function deleteDocument(id) {

  const docs = loadDocuments().filter(d => d.id !== id);

  saveDocuments(docs);

  return docs;
}

// ===========================
// CẬP NHẬT TÀI LIỆU
// ===========================

function updateDocument(id, data) {

  const docs = loadDocuments();

  const index = docs.findIndex(d => d.id === id);

  if (index === -1) return null;

  docs[index] = {
    ...docs[index],
    ...data
  };

  saveDocuments(docs);

  return docs[index];
}

// ===========================
// XÓA TOÀN BỘ KHO TÀI LIỆU
// ===========================

function clearLibrary() {

  localStorage.removeItem(STORAGE_KEY);
}
