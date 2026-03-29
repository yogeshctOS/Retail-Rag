/**
 * upload.js — Multer configuration for PDF file uploads
 * Validates file type (PDF only) and size
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

// Ensure directory exists on startup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine: save file with UUID-based name to avoid collisions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate: uuid_originalname.pdf
    const uniqueName = `${uuidv4()}_${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

// File filter: only allow PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB default
  },
});

module.exports = upload;
