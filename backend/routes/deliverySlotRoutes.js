const express = require('express');
const router = express.Router();
const { getAvailableSlots, getAllSlots, bookSlot, releaseSlot, updateSlot } = require('../controllers/deliverySlotController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getAvailableSlots);
router.get('/admin', protect, admin, getAllSlots);
router.put('/:id/book', protect, bookSlot);
router.put('/:id/release', protect, releaseSlot);
router.put('/:id', protect, admin, updateSlot);

module.exports = router;
