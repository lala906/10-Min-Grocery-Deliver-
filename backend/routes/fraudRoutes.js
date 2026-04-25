const express = require('express');
const router = express.Router();
const { getFraudFlags, resolveFlag, getSuspiciousUsers, manualFlag } = require('../controllers/fraudController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getFraudFlags);
router.get('/suspicious-users', protect, admin, getSuspiciousUsers);
router.post('/flag', protect, admin, manualFlag);
router.put('/:id/resolve', protect, admin, resolveFlag);

module.exports = router;
