const express = require('express');
const router = express.Router();
const {
    raiseDispute, getAllDisputes, getDisputeById,
    addEvidence, updateDisputeStatus, resolveDispute
} = require('../controllers/disputeController');
const { protect, admin, protectRider } = require('../middleware/authMiddleware');

// Customer/Rider routes
router.post('/', protect, raiseDispute);
router.post('/:id/evidence', protect, addEvidence);

// Admin routes
router.get('/', protect, admin, getAllDisputes);
router.get('/:id', protect, admin, getDisputeById);
router.put('/:id/status', protect, admin, updateDisputeStatus);
router.put('/:id/resolve', protect, admin, resolveDispute);

module.exports = router;
