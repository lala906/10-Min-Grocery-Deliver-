const express = require('express');
const router = express.Router();
const { getDashboardStats, getLiveMapData, getAllUsers, toggleUserBlock } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

const {
    getAllShops,
    getKycRequests,
    approveKyc,
    rejectKyc,
    toggleShopBlock
} = require('../controllers/adminShopController');

router.get('/dashboard', protect, admin, getDashboardStats);
router.get('/live-map', protect, admin, getLiveMapData);
router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id/block', protect, admin, toggleUserBlock);

// Shop & KYC Routes
router.get('/shops', protect, admin, getAllShops);
router.put('/shops/:id/block', protect, admin, toggleShopBlock);
router.get('/kyc-requests', protect, admin, getKycRequests);
router.put('/kyc-approve/:id', protect, admin, approveKyc);
router.put('/kyc-reject/:id', protect, admin, rejectKyc);

module.exports = router;
