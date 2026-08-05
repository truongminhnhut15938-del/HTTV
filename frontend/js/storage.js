// ======================================
// HTTV - STORAGE.JS
// Quản lý kho lưu trữ tài liệu bằng IndexedDB
// ======================================

const DB_NAME = "HTTV_DB";
const DB_VERSION = 1;
const STORE_NAME = "documents";

let db = null;

// ======================================
// Khởi tạo cơ sở dữ liệu
// ======================================
async function initDB() {
    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: "id"
                });

                store.createIndex("type", "type", {
                    unique: false
                });

                store.createIndex("number", "number", {
                    unique: false
                });

                store.createIndex("effectiveDate", "effectiveDate", {
                    unique: false
                });

                store.createIndex("createdAt", "createdAt", {
                    unique: false
                });
            }
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}

// ======================================
// Tạo ID tài liệu
// ======================================
function generateDocumentId() {
    return "doc-" + Date.now() + "-" +
        Math.random().toString(36).slice(2, 8);
}

// ======================================
// Lưu tài liệu
// ======================================
async function saveDocument(documentData) {

    if (!db) await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const doc = {

            id: documentData.id || generateDocumentId(),

            fileName: documentData.fileName || "",

            fileType: documentData.fileType || "",

            fileSize: documentData.fileSize || 0,

            fileBlob: documentData.fileBlob || null,

            // Phần sẽ được analyzer cập nhật sau
            type: documentData.type || "",

            number: documentData.number || "",

            agency: documentData.agency || "",

            issueDate: documentData.issueDate || "",

            effectiveDate: documentData.effectiveDate || "",

            status: documentData.status || "",

            articles: documentData.articles || [],

            rawText: documentData.rawText || "",

            createdAt: documentData.createdAt || Date.now(),

            updatedAt: Date.now()

        };

        const request = store.put(doc);

        request.onsuccess = function () {
            resolve(doc);
        };

        request.onerror = function () {
            reject(request.error);
        };

    });

}

// ======================================
// Lấy toàn bộ tài liệu
// ======================================
async function getAllDocuments() {

    if (!db) await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);

        const request = store.getAll();

        request.onsuccess = function () {

            const docs = request.result.sort((a, b) =>
                b.createdAt - a.createdAt
            );

            resolve(docs);

        };

        request.onerror = function () {
            reject(request.error);
        };

    });

}

// ======================================
// Lấy tài liệu theo ID
// ======================================
async function getDocument(id) {

    if (!db) await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);

        const request = store.get(id);

        request.onsuccess = function () {
            resolve(request.result || null);
        };

        request.onerror = function () {
            reject(request.error);
        };

    });

}

// ======================================
// Xóa tài liệu
// ======================================
async function deleteDocument(id) {

    if (!db) await initDB();

    return new Promise((resolve, reject) => {

        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        const request = store.delete(id);

        request.onsuccess = function () {
            resolve(true);
        };

        request.onerror = function () {
            reject(request.error);
        };

    });

}

// ======================================
// Cập nhật tài liệu
// ======================================
async function updateDocument(id, updates) {

    const doc = await getDocument(id);

    if (!doc) throw new Error("Không tìm thấy tài liệu");

    Object.assign(doc, updates);

    doc.updatedAt = Date.now();

    return await saveDocument(doc);

}

// ======================================
// Kiểm tra khởi tạo
// ======================================
window.addEventListener("load", async () => {

    try {

        await initDB();

        console.log("HTTV Storage Ready");

    } catch (e) {

        console.error("Storage init failed:", e);

    }

});
