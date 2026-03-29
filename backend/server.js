/**
 * server.js — Entry point for the Retail RAG backend
 * Initializes Express, middleware, routes, and DB connection
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const logger = require('./middleware/logger');
const documentRoutes = require('./routes/documentRoutes');
const queryRoutes = require('./routes/queryRoutes');
const { initDB } = require('./middleware/database');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Ensure uploads directory exists ──────────────────────────────────────────
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`Created uploads directory: ${uploadDir}`);
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Serve uploaded files statically (optional, for debugging)
app.use('/uploads', express.static(uploadDir));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', documentRoutes);
app.use('/api', queryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDB(); // Initialize MySQL tables
    app.listen(PORT, () => {
      logger.info(`✅ Backend server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

start();
