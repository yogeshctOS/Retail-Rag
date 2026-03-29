/**
 * queryController.js — Handles question/answer queries
 * Forwards questions to Python pipeline, saves Q&A to MySQL
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');
const { getPool } = require('../middleware/database');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

/**
 * POST /api/query
 * Body: { question: string, document_id: string }
 * Returns answer from RAG pipeline
 */
async function queryDocument(req, res) {
  const { question, document_id } = req.body;

  // Validate input
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Question cannot be empty' });
  }
  if (!document_id) {
    return res.status(400).json({ success: false, error: 'document_id is required' });
  }

  const queryId = uuidv4();
  const startTime = Date.now();
  const pool = getPool();

  try {
    logger.info(`Query received: "${question}" for document: ${document_id}`);

    // Forward question to Python RAG pipeline
    const pythonResponse = await axios.post(
      `${PYTHON_API_URL}/query`,
      {
        question: question.trim(),
        document_id,
      },
      { timeout: 60000 } // 60 second timeout
    );

    const responseTime = Date.now() - startTime;
    const { answer, context_chunks, source_snippets } = pythonResponse.data;

    // Save Q&A to MySQL for history
    await pool.execute(
      `INSERT INTO queries (id, document_id, question, answer, context_chunks, response_time_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [queryId, document_id, question.trim(), answer, context_chunks || 0, responseTime]
    );

    logger.info(`Query answered in ${responseTime}ms: ${queryId}`);

    return res.json({
      success: true,
      query_id: queryId,
      question: question.trim(),
      answer,
      context_chunks: context_chunks || 0,
      source_snippets: source_snippets || [],
      response_time_ms: responseTime,
    });
  } catch (err) {
    logger.error(`Query error: ${err.message}`);

    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Python RAG pipeline is not running. Please start it first.',
      });
    }

    return res.status(500).json({
      success: false,
      error: err.response?.data?.detail || err.message || 'Query failed',
    });
  }
}

/**
 * GET /api/history/:document_id
 * Returns Q&A history for a given document
 */
async function getHistory(req, res) {
  const { document_id } = req.params;
  const pool = getPool();
  try {
    const [rows] = await pool.execute(
      `SELECT id, question, answer, context_chunks, response_time_ms, created_at
       FROM queries WHERE document_id = ? ORDER BY created_at ASC LIMIT 100`,
      [document_id]
    );
    return res.json({ success: true, history: rows });
  } catch (err) {
    logger.error(`History fetch error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { queryDocument, getHistory };
