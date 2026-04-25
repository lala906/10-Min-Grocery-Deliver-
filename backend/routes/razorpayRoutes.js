const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createRazorpayOrder,
    verifyRazorpayPayment,
    checkPincode,
} = require('../controllers/razorpayController');

// Check if a pincode is serviceable (can be public or auth-protected)
router.get('/check-pincode/:pincode', protect, checkPincode);

// Create a Razorpay order (returns order_id needed by the frontend SDK)
router.post('/create-order', protect, createRazorpayOrder);

// Verify payment signature after user completes payment
router.post('/verify-payment', protect, verifyRazorpayPayment);

module.exports = router;
