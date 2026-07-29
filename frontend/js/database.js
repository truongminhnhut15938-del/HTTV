// ================================
// HTTV - DATABASE.JS
// Quản lý cơ sở dữ liệu IndexedDB
// ================================

const HTTV_DB_NAME = "HTTV_Database";
const HTTV_DB_VERSION = 1;
const HTTV_STORE = "documents";

let httvDB = null;

function openDatabase() {

return new Promise((resolve, reject) => {

    const request = indexedDB.open(
        HTTV_DB_NAME,
        HTTV_DB_VERSION
    );

    request.onupgradeneeded = function(event) {

        const db = event.target.result;

        if (!db.objectStoreNames.contains(HTTV_STORE)) {

            db.createObjectStore(
                HTTV_STORE,
                { keyPath: "id" }
            );

        }

    };

    request.onsuccess = function(event) {

        httvDB = event.target.result;
        resolve(httvDB);

    };

    request.onerror = function() {

        reject(request.error);

    };

});

}
function saveDocument(doc) {

return new Promise((resolve, reject) => {

    const tx = httvDB.transaction(
        HTTV_STORE,
        "readwrite"
    );

    const store = tx.objectStore(HTTV_STORE);

    store.put(doc);

    tx.oncomplete = function() {
        resolve();
    };

    tx.onerror = function() {
        reject(tx.error);
    };

});

}
