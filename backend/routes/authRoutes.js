const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserBlockStatus,
    toggleWishlist,
    addAddress,
    removeAddress,
    sendOtp,
    verifyOtp
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/profile', protect, getUserProfile);

// Admin Routes
router.put('/:id/block-status', protect, admin, updateUserBlockStatus);

// User Features
router.post('/wishlist/toggle', protect, toggleWishlist);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:addressId', protect, removeAddress);

module.exports = router;
