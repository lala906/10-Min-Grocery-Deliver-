const express = require('express');
const router = express.Router();
const {
    registerShop,
    getShopProfile,
    updateShopStatus,
    getShopOrders,
    updateOrderStatus
} = require('../controllers/shopController');
const { protect, shopOwner } = require('../middleware/authMiddleware');

router.post('/register-with-kyc', registerShop);
router.get('/profile', protect, shopOwner, getShopProfile);
router.put('/status', protect, shopOwner, updateShopStatus);

router.get('/orders', protect, shopOwner, getShopOrders);
router.put('/orders/:id/status', protect, shopOwner, updateOrderStatus);

module.exports = router;
