const express = require('express');
const router = express.Router();
const { getPlans, getMySubscription, subscribe, cancelSubscription, getAllSubscriptions } = require('../controllers/subscriptionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/plans', getPlans);
router.get('/me', protect, getMySubscription);
router.post('/subscribe', protect, subscribe);
router.put('/cancel', protect, cancelSubscription);
router.get('/admin/all', protect, admin, getAllSubscriptions);

module.exports = router;
