const express = require('express');
const router = express.Router();
const { queryDocument, getHistory } = require('../controllers/queryController');

router.post('/query', queryDocument);
router.get('/history/:document_id', getHistory);

module.exports = router;
