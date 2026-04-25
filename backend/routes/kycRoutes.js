const express = require('express');
const router = express.Router();
const { submitKYC, getMyKYC, getKYCQueue, getKYCByRider, approveKYC, rejectKYC } = require('../controllers/kycController');
const { protect, admin, protectRider } = require('../middleware/authMiddleware');

// Rider endpoints
router.post('/submit', protectRider, submitKYC);
router.get('/me', protectRider, getMyKYC);

// Admin endpoints
router.get('/queue', protect, admin, getKYCQueue);
router.get('/:riderId', protect, admin, getKYCByRider);
router.put('/:id/approve', protect, admin, approveKYC);
router.put('/:id/reject', protect, admin, rejectKYC);

module.exports = router;
