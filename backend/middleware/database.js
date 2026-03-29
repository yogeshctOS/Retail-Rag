/**
 * database.js — MySQL connection and table initialization
 * Uses mysql2 with promise API
 */

const mysql = require('mysql2/promise');
const logger = require('./logger');

let pool;

/**
 * Creates the MySQL connection pool and initializes tables
 */
async function initDB() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'retail_rag',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Test connection
  const conn = await pool.getConnection();
  logger.info('✅ MySQL connected successfully');
  conn.release();

  // Create tables if they don't exist
  await createTables();
}

/**
 * Creates documents and queries tables
 */
async function createTables() {
  // Documents table — stores metadata about uploaded PDFs
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id VARCHAR(36) PRIMARY KEY,
      original_name VARCHAR(255) NOT NULL,
      stored_path TEXT NOT NULL,
      file_size INT,
      status ENUM('processing', 'ready', 'error') DEFAULT 'processing',
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Queries table — stores question/answer history
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS queries (
      id VARCHAR(36) PRIMARY KEY,
      document_id VARCHAR(36),
      question TEXT NOT NULL,
      answer TEXT,
      context_chunks INT DEFAULT 0,
      response_time_ms INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    )
  `);

  logger.info('✅ Database tables ready');
}

/**
 * Returns the pool for use in controllers
 */
function getPool() {
  if (!pool) throw new Error('Database not initialized. Call initDB() first.');
  return pool;
}

module.exports = { initDB, getPool };
