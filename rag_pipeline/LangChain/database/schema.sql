-- ─────────────────────────────────────────────────────────────
-- RetailMind RAG — MySQL Schema
-- Run this ONCE to create the database and tables
-- Usage: mysql -u root -p < database/schema.sql
-- ─────────────────────────────────────────────────────────────

-- Create database
CREATE DATABASE IF NOT EXISTS retail_rag
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE retail_rag;

-- Documents table: metadata about uploaded PDFs
CREATE TABLE IF NOT EXISTS documents (
  id           VARCHAR(36)   NOT NULL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_path   TEXT         NOT NULL,
  file_size     INT          DEFAULT 0,
  status        ENUM('processing','ready','error') DEFAULT 'processing',
  uploaded_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Queries table: question/answer history
CREATE TABLE IF NOT EXISTS queries (
  id               VARCHAR(36) NOT NULL PRIMARY KEY,
  document_id      VARCHAR(36),
  question         TEXT        NOT NULL,
  answer           TEXT,
  context_chunks   INT         DEFAULT 0,
  response_time_ms INT         DEFAULT 0,
  created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  INDEX idx_document_id (document_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────
-- Sample queries for verification
-- ─────────────────────────────────────────────────────────────
-- SELECT * FROM documents ORDER BY uploaded_at DESC;
-- SELECT * FROM queries WHERE document_id = 'your-doc-id';
