const express = require('express');
const router = express.Router();
const { applyCoupon, createCoupon, updateCoupon, getCoupons, deleteCoupon, getAutoApplyCoupons, getAvailableCoupons } = require('../controllers/couponController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, admin, createCoupon)
    .get(protect, admin, getCoupons);

router.post('/apply', protect, applyCoupon);
router.get('/auto-apply', protect, getAutoApplyCoupons);
router.get('/available', getAvailableCoupons);
router.put('/:id', protect, admin, updateCoupon);
router.delete('/:id', protect, admin, deleteCoupon);

module.exports = router;
