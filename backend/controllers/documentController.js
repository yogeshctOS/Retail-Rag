/**
 * documentController.js — Handles PDF upload and processing
 * Saves metadata to MySQL, sends file path to Python pipeline
 */

const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');
const { getPool } = require('../middleware/database');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

/**
 * POST /api/upload
 * Accepts a PDF, stores metadata in MySQL, sends absolute path to Python
 */
async function uploadDocument(req, res) {
  // Multer attaches file info to req.file
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const documentId = uuidv4();
  const absolutePath = path.resolve(req.file.path); // Full absolute path for Python
  const pool = getPool();

  try {
    // 1️⃣ Save initial record to MySQL (status: processing)
    await pool.execute(
      `INSERT INTO documents (id, original_name, stored_path, file_size, status)
       VALUES (?, ?, ?, ?, 'processing')`,
      [documentId, req.file.originalname, absolutePath, req.file.size]
    );
    logger.info(`Document record created: ${documentId} → ${req.file.originalname}`);

    // 2️⃣ Send file path to Python RAG pipeline for processing
    logger.info(`Sending to Python pipeline: ${absolutePath}`);
    const pythonResponse = await axios.post(
      `${PYTHON_API_URL}/process`,
      {
        document_id: documentId,
        file_path: absolutePath,
        original_name: req.file.originalname,
      },
      { timeout: 120000 } // 2 minutes — model loading can be slow
    );

    // 3️⃣ Update status to 'ready' after successful processing
    await pool.execute(
      `UPDATE documents SET status = 'ready' WHERE id = ?`,
      [documentId]
    );
    logger.info(`Document processed successfully: ${documentId}`);

    return res.status(200).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      document: {
        id: documentId,
        name: req.file.originalname,
        size: req.file.size,
        status: 'ready',
        chunks: pythonResponse.data.chunks_created || 0,
      },
    });
  } catch (err) {
    // Mark document as error in DB
    try {
      await pool.execute(
        `UPDATE documents SET status = 'error' WHERE id = ?`,
        [documentId]
      );
    } catch (dbErr) {
      logger.error(`DB update error: ${dbErr.message}`);
    }

    logger.error(`Document processing failed: ${err.message}`);

    // More specific error messages for common issues
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Python RAG pipeline is not running. Please start it first.',
      });
    }

    return res.status(500).json({
      success: false,
      error: err.response?.data?.detail || err.message || 'Processing failed',
    });
  }
}

/**
 * GET /api/documents
 * Returns list of all uploaded documents with their status
 */
async function listDocuments(req, res) {
  const pool = getPool();
  try {
    const [rows] = await pool.execute(
      `SELECT id, original_name, file_size, status, uploaded_at
       FROM documents ORDER BY uploaded_at DESC LIMIT 50`
    );
    return res.json({ success: true, documents: rows });
  } catch (err) {
    logger.error(`List documents error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { uploadDocument, listDocuments };
