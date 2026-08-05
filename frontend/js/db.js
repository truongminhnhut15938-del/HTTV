// js/db.js
// Quản lý cơ sở dữ liệu offline của HTTV bằng IndexedDB

const DB_NAME = 'HTTV_DB';
const DB_VERSION = 1;
const STORE_DOCS = 'documents';

let db = null;

// Khởi tạo database
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject('Không thể mở cơ sở dữ liệu');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_DOCS)) {
                const store = database.createObjectStore(STORE_DOCS, {
                    keyPath: 'id'
                });

                // Chỉ mục để sắp xếp và tra cứu
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('title', 'title', { unique: false });
                store.createIndex('docType', 'docType', { unique: false });
            }
        };
    });
}

// Tạo ID đơn giản
function generateId() {
    return 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
}

// Lưu tài liệu
function saveDocument(documentData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database chưa khởi tạo');
            return;
        }

        const transaction = db.transaction(STORE_DOCS, 'readwrite');
        const store = transaction.objectStore(STORE_DOCS);

        const record = {
            id: generateId(),
            title: documentData.title || 'Chưa có tiêu đề',
            fileName: documentData.fileName,
            fileType: documentData.fileType,
            rawText: documentData.rawText || '',

            // Metadata sẽ được phân tích ở bước sau
            metadata: {
                docType: '',
                number: '',
                agency: '',
                issuedDate: '',
                effectiveDate: '',
                status: ''
            },

            // Danh sách điều khoản
            articles: [],

            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const request = store.add(record);

        request.onsuccess = () => resolve(record);
        request.onerror = () => reject('Lưu tài liệu thất bại');
    });
}

// Cập nhật tài liệu
function updateDocument(documentData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_DOCS, 'readwrite');
        const store = transaction.objectStore(STORE_DOCS);

        documentData.updatedAt = new Date().toISOString();

        const request = store.put(documentData);

        request.onsuccess = () => resolve(documentData);
        request.onerror = () => reject('Cập nhật tài liệu thất bại');
    });
}

// Lấy toàn bộ tài liệu
function getAllDocuments() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_DOCS, 'readonly');
        const store = transaction.objectStore(STORE_DOCS);

        const request = store.getAll();

        request.onsuccess = () => {
            const docs = request.result || [];

            docs.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            resolve(docs);
        };

        request.onerror = () => reject('Không đọc được danh sách tài liệu');
    });
}

// Lấy một tài liệu theo ID
function getDocumentById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_DOCS, 'readonly');
        const store = transaction.objectStore(STORE_DOCS);

        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Không đọc được tài liệu');
    });
}

// Xóa tài liệu
function deleteDocument(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_DOCS, 'readwrite');
        const store = transaction.objectStore(STORE_DOCS);

        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject('Xóa tài liệu thất bại');
    });
}

// Xóa toàn bộ dữ liệu (chỉ dùng khi cần reset)
function clearDatabase() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_DOCS, 'readwrite');
        const store = transaction.objectStore(STORE_DOCS);

        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject('Không thể xóa dữ liệu');
    });
}
