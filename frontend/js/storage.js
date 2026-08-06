// js/storage.js

const STORAGE_KEY = 'httv_documents';

function loadDocuments() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveDocuments(docs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

function addDocument(doc) {
  const docs = loadDocuments();
  docs.unshift(doc);
  saveDocuments(docs);
  return docs;
}

function getDocument(id) {
  return loadDocuments().find(d => d.id === id);
}

function deleteDocument(id) {
  const docs = loadDocuments().filter(d => d.id !== id);
  saveDocuments(docs);
  return docs;
}
