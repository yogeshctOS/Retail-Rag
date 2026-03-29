const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { uploadDocument, listDocuments } = require('../controllers/documentController');

router.post('/upload', upload.single('document'), uploadDocument);
router.get('/documents', listDocuments);

module.exports = router;
