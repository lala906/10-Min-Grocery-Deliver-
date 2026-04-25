const express = require('express');
const router = express.Router();
const {
    calculatePayout, getAllPayouts, getRiderPayouts,
    markPayoutPaid, exportPayoutsCSV
} = require('../controllers/payoutController');
const { protect, admin, protectRider } = require('../middleware/authMiddleware');

// Admin routes
router.post('/calculate', protect, admin, calculatePayout);
router.get('/', protect, admin, getAllPayouts);
router.get('/export', protect, admin, exportPayoutsCSV);
router.put('/:id/mark-paid', protect, admin, markPayoutPaid);
router.get('/rider/:riderId', protect, admin, getRiderPayouts);

// Rider can view their own payout history
router.get('/me', protectRider, (req, res, next) => {
    req.params.riderId = req.rider._id.toString();
    next();
}, getRiderPayouts);

module.exports = router;
