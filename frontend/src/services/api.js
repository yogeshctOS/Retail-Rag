/**
 * api.js — Axios API service layer
 * All backend calls go through here for centralized error handling
 */

import axios from 'axios';

// Base URL — uses CRA proxy in dev (see package.json "proxy"), or set explicitly
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 180000, // 3 minutes for model loading on first request
});

// ── Response interceptor for unified error handling ──────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

/**
 * Upload a PDF file for processing
 * @param {File} file - The PDF File object
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<{document: {id, name, status, chunks}}>}
 */
export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append('document', file); // Must match multer field name

  const response = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        const percent = Math.round((evt.loaded * 100) / evt.total);
        onProgress(percent);
      }
    },
  });

  return response.data;
}

/**
 * Send a question and get an answer from the RAG pipeline
 * @param {string} question - User's question
 * @param {string} documentId - Document to query against
 * @returns {Promise<{answer, question, context_chunks, source_snippets}>}
 */
export async function queryDocument(question, documentId) {
  const response = await api.post('/api/query', {
    question,
    document_id: documentId,
  });
  return response.data;
}

/**
 * Get list of all uploaded documents
 * @returns {Promise<{documents: Array}>}
 */
export async function listDocuments() {
  const response = await api.get('/api/documents');
  return response.data;
}

/**
 * Get Q&A history for a document
 * @param {string} documentId
 * @returns {Promise<{history: Array}>}
 */
export async function getHistory(documentId) {
  const response = await api.get(`/api/history/${documentId}`);
  return response.data;
}
