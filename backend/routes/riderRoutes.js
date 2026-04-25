const express = require('express');
const router = express.Router();
const {
    authRider, registerRider, getRiderProfile,
    updateAvailability, updateLocation,
    getAssignedOrders, updateOrderStatusByRider,
    getRiderEarnings, getRiderPerformance,
    getRiders, getRiderById, updateRiderStatus,
    getActiveRiders, assignRider
} = require('../controllers/riderController');
const { protect, admin, protectRider } = require('../middleware/authMiddleware');

// Public
router.post('/login', authRider);
router.post('/register', registerRider);

// Rider Protected Routes
router.get('/profile', protectRider, getRiderProfile);
router.put('/availability', protectRider, updateAvailability);
router.put('/location', protectRider, updateLocation);
router.get('/orders', protectRider, getAssignedOrders);
router.put('/orders/:id/status', protectRider, updateOrderStatusByRider);
router.get('/earnings', protectRider, getRiderEarnings);
router.get('/performance', protectRider, getRiderPerformance);

// Admin Routes
router.get('/active', protect, admin, getActiveRiders);
router.put('/assign', protect, admin, assignRider);
router.get('/', protect, admin, getRiders);
router.get('/:id', protect, admin, getRiderById);
router.put('/:id/status', protect, admin, updateRiderStatus);

module.exports = router;
