const express = require('express');
const router = express.Router();
const { getAuditLogs, getTargetLogs } = require('../controllers/auditController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getAuditLogs);
router.get('/target/:type/:id', protect, admin, getTargetLogs);

module.exports = router;
